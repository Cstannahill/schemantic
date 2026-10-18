const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '../..');
const workflowDirectory = path.join(root, '.github/workflows');
const workflows = Object.fromEntries(fs.readdirSync(workflowDirectory)
  .filter(file => /\.ya?ml$/.test(file))
  .map(file => [file, yaml.load(fs.readFileSync(path.join(workflowDirectory, file), 'utf8'))]));
const verify = workflows['verify.yml'];
const release = workflows['release.yml'];
const gate = verify.jobs['required-checks'];

function commands(job) { return (job.steps || []).filter(step => step.run).map(step => step.run); }
function uses(job, action) { return (job.steps || []).filter(step => step.uses?.startsWith(`${action}@`)); }

test('required check depends on every reusable verification job and always runs', () => {
  assert.equal(gate.if, 'always()');
  const workJobs = Object.keys(verify.jobs).filter(name => name !== 'required-checks');
  assert.deepEqual([...gate.needs].sort(), workJobs.sort());
  assert.equal(new Set(gate.needs).size, gate.needs.length);
  assert(gate.needs.includes('live-integration'));
  assert(gate.needs.includes('dependency-audit'));
  assert.equal(gate.steps.find(step => step.env?.JOB_RESULTS).env.JOB_RESULTS, '${{ toJSON(needs) }}');
});

// Execute the actual embedded gate, so a shell step that stops failing cannot pass
// merely because its YAML still contains the expected text.
const gateScript = gate.steps.find(step => step.env?.JOB_RESULTS)?.run.match(/node <<'JS'\r?\n([\s\S]*?)\r?\nJS\s*$/)?.[1];
assert(gateScript, 'Cannot extract the executable required-checks gate');
function executeGate(overrides = {}) {
  const needs = Object.fromEntries(gate.needs.map(name => [name, { result: overrides[name] || 'success' }]));
  return spawnSync(process.execPath, ['-e', gateScript], {
    encoding: 'utf8', timeout: 10000,
    env: { ...process.env, JOB_RESULTS: JSON.stringify(needs) },
  });
}
test('required check succeeds when all verification jobs succeed', () => {
  const result = executeGate();
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});
for (const name of gate.needs) for (const result of ['failure', 'cancelled', 'skipped']) {
  test(`required check rejects ${name} when ${result}`, () => {
    const probe = executeGate({ [name]: result });
    assert.equal(probe.status, 1, probe.stderr || probe.error?.message);
    assert(probe.stdout.includes(`${name}: ${result}`));
  });
}

test('workflows pin external actions, scope credentials, and bound runner execution', () => {
  for (const [file, workflow] of Object.entries(workflows)) {
    assert.deepEqual(workflow.permissions, { contents: 'read' }, `${file}: workflow permissions`);
    for (const [name, job] of Object.entries(workflow.jobs)) {
      const label = `${file}/${name}`;
      if (job.uses) {
        assert.equal(job.uses, './.github/workflows/verify.yml', `${label}: local reusable workflow`);
      } else {
        assert(Number.isInteger(job['timeout-minutes']) && job['timeout-minutes'] > 0 && job['timeout-minutes'] <= 30, `${label}: bounded timeout`);
      }
      for (const step of job.steps || []) {
        if (step.uses) assert(/^[\w.-]+\/[\w./-]+@[a-f0-9]{40}$/.test(step.uses), `${label}: unpinned ${step.uses}`);
        if (step.uses?.startsWith('actions/checkout@')) assert.equal(step.with?.['persist-credentials'], false, `${label}: checkout credentials`);
      }
      if (job.permissions?.['id-token'] === 'write') assert.equal(label, 'release.yml/publish');
      if (job.permissions?.contents === 'write') assert.equal(label, 'release.yml/publish');
      if (job.permissions?.['security-events'] === 'write') assert.equal(label, 'security.yml/codeql');
      for (const [scope, access] of Object.entries(job.permissions || {})) {
        const allowed = label === 'release.yml/publish' ? ['contents', 'id-token'] : label === 'security.yml/codeql' ? ['security-events'] : [];
        assert(access === 'read' || (access === 'write' && allowed.includes(scope)), `${label}: unexpected ${scope}:${access}`);
      }
    }
  }
});

test('PR and merge-queue checks cannot enter npm publication', () => {
  assert(Object.hasOwn(workflows['ci.yml'].on, 'pull_request'));
  assert(Object.hasOwn(workflows['ci.yml'].on, 'merge_group'));
  assert.equal(workflows['ci.yml'].jobs.verify.uses, './.github/workflows/verify.yml');
  assert.deepEqual(Object.keys(release.on).sort(), ['release', 'workflow_dispatch']);
  assert.deepEqual(release.on.release.types, ['published']);
  assert.equal(release.on.workflow_dispatch.inputs['dry-run'].default, true);
  assert.equal(release.concurrency['cancel-in-progress'], false);
  assert(!workflows['ci-cd.yml'], 'Obsolete combined publication pipeline must stay retired');
  assert(!workflows['test-prefix.yml'], 'Prefix tests run through consolidated verification');
  for (const [file, workflow] of Object.entries(workflows)) {
    for (const [name, job] of Object.entries(workflow.jobs)) {
      const publishing = commands(job).some(command => /\bnpm\s+publish\b/.test(command));
      if (publishing) assert.equal(`${file}/${name}`, 'release.yml/publish');
      if (file !== 'release.yml') {
        assert(!job.permissions?.['id-token'], `${file}/${name}: publication identity outside release`);
        assert.notEqual(job.permissions?.contents, 'write', `${file}/${name}: repository write outside release`);
      }
    }
  }
});

test('release verification uses an immutable source and publication consumes its verified archive', () => {
  assert.equal(release.jobs.verify.uses, './.github/workflows/verify.yml');
  assert.equal(release.jobs.verify.with.release, true);
  assert.equal(release.jobs.verify.with.ref, '${{ needs.resolve.outputs.sha }}');
  assert.deepEqual(release.jobs.publish.needs.slice().sort(), ['resolve', 'verify']);
  assert.equal(verify.on.workflow_call.outputs['artifact-name'].value, '${{ jobs.package.outputs.artifact-name }}');
  const upload = uses(verify.jobs.package, 'actions/upload-artifact').find(step => step.name === 'Preserve verified package');
  assert.equal(upload.with.path, '.release/package/');
  assert.equal(upload.with['include-hidden-files'], true);
  assert.equal(upload.with['if-no-files-found'], 'error');
  const download = uses(release.jobs.publish, 'actions/download-artifact');
  assert.equal(download.length, 1);
  assert.equal(download[0].with.name, '${{ needs.verify.outputs.artifact-name }}');
  assert.equal(download[0].with.path, '.release/package');
  assert(!commands(release.jobs.publish).some(command => /\bnpm\s+(?:pack\b|run\s+build\b)/.test(command)), 'Publishing must not rebuild or repack');
  const publication = release.jobs.publish.steps.find(step => step.name === 'Publish with npm trusted publishing');
  assert(publication.run.includes('".release/package/$ARCHIVE"'));
  assert(publication.run.includes('--ignore-scripts'));
  assert(publication.run.includes('--provenance'));
  assert.equal(release.jobs.publish.permissions['id-token'], 'write');
});

test('verification covers supported runtimes, release helpers, live multipart requests, and full audits', () => {
  assert.deepEqual(verify.jobs.compatibility.strategy.matrix.node, ['20', '22', '24']);
  assert.deepEqual(verify.jobs.compatibility.strategy.matrix.os, ['ubuntu-latest', 'windows-latest', 'macos-latest']);
  assert.equal(verify.jobs.compatibility.strategy['fail-fast'], false);
  const quality = commands(verify.jobs.quality);
  const helperIndex = quality.indexOf('npm run test:release');
  assert(helperIndex >= 0 && helperIndex < quality.indexOf('npm run test:coverage -- --runInBand'));
  assert(commands(verify.jobs.fixtures).includes('npm run verify:fixtures'));
  assert(commands(verify.jobs.package).includes('npm run package:verify'));
  const live = commands(verify.jobs['live-integration']);
  assert(live.includes('npm run verify:live'));
  assert(live.some(command => /python -m pip install.*\bfastapi\b.*\buvicorn\b.*\bpython-multipart\b/.test(command)));
  const audit = commands(verify.jobs['dependency-audit']).find(command => command.startsWith('npm audit'));
  assert(audit?.includes('--audit-level=moderate'));
  assert(!/--(?:omit|production|only)/.test(audit));
  for (const job of Object.values(verify.jobs)) for (const setup of uses(job, 'actions/setup-node')) {
    assert.equal(setup.with['package-manager-cache'], false);
    if (setup.with.cache) assert.equal(setup.with.cache, "${{ !inputs.release && 'npm' || '' }}");
  }
  assert(!Object.hasOwn(workflows['performance.yml'].on, 'pull_request'));
  assert(!Object.hasOwn(workflows['performance.yml'].on, 'push'));
  assert(Object.hasOwn(workflows['performance.yml'].on, 'schedule'));
  assert(Object.hasOwn(workflows['performance.yml'].on, 'workflow_dispatch'));
});
