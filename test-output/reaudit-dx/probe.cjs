const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const root = path.resolve(__dirname, '../..');
const cli = path.join(root, 'dist/cli/index.js');
const work = path.join(__dirname, 'scratch');
fs.mkdirSync(work, { recursive: true });
const schema = { openapi: '3.0.3', info: { title: 'DXProbe', version: '1' }, paths: {}, components: { schemas: { User: { type: 'object', properties: { id: { type: 'integer' } } } } } };
fs.writeFileSync(path.join(work, 'schema.json'), JSON.stringify(schema));
function run(name, args, cwd = work) {
  const p = cp.spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout: 5000 });
  return { name, args, status: p.status, stdout: p.stdout, stderr: p.stderr, error: p.error?.message };
}
async function interactive(name, args, answers) {
  return new Promise(resolve => {
    const p = cp.spawn(process.execPath, [cli, ...args], { cwd: work, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', cursor = 0;
    const timer = setTimeout(() => p.kill(), 5000);
    p.stdout.on('data', data => {
      const part = data.toString(); stdout += part;
      if (/: $/.test(part) && cursor < answers.length) p.stdin.write(answers[cursor++] + '\n');
    });
    p.stderr.on('data', data => stderr += data);
    p.on('exit', (status, signal) => { clearTimeout(timer); resolve({ name, args, status, signal, stdout, stderr, answered: cursor }); });
  });
}
(async () => {
  const results = [];
  results.push(run('init bogus template', ['init', 'init-bogus', '--yes', '--template', 'does-not-exist']));
  fs.writeFileSync(path.join(work, 'init-bogus/schemantic.config.json'), '{"sentinel":"preserve me"}');
  results.push({ ...run('init overwrites existing', ['init', 'init-bogus', '--yes']), after: fs.readFileSync(path.join(work, 'init-bogus/schemantic.config.json'), 'utf8') });
  fs.writeFileSync(path.join(work, 'schemantic.config.json'), JSON.stringify({ schemaFile: './schema.json', outputDir: './configured' }));
  results.push(run('config autodiscovery', ['generate']));
  results.push(run('explicit config works', ['generate', '--config']));
  results.push(run('validate cannot reuse config', ['validate', '--config', './schemantic.config.json']));
  fs.writeFileSync(path.join(work, 'schemantic.config.ts'), 'export default {schemaFile: "./schema.json", outputDir: "./tsconfig-output"};');
  results.push(run('TS config', ['generate', '--config', './schemantic.config.ts']));
  results.push(run('fix advertised unsupported', ['validate', 'schema.json', '--fix']));
  results.push(run('types and hooks conflict', ['generate', 'schema.json', '--types', '--hooks', '--output', 'types-hooks']));
  fs.writeFileSync(path.join(work, 'plugin.cjs'), 'module.exports = {name:"dx-plugin",version:"1",description:"probe", beforeGeneration(){}};');
  results.push(run('load local custom plugin', ['plugin', 'load', './plugin.cjs']));
  results.push(run('generate after plugin load', ['generate', 'schema.json', '--plugins', 'dx-plugin', '--output', 'custom-plugin']));
  results.push(run('plugin package advertised', ['plugin', 'load', 'commander']));
  results.push(await interactive('interactive missing source exit', ['generate', '--interactive'], ['missing.json', './interactive-fail', '', '', '', 'n', '']));
  results.push(await interactive('init empty hook default', ['init', 'interactive-init'], ['./schema.json', './interactive-valid', '', '', '', '', '', '']));
  const initConfig = path.join(work, 'interactive-init/schemantic.config.json');
  if (fs.existsSync(initConfig)) results.push({ name: 'empty answers init config', config: JSON.parse(fs.readFileSync(initConfig, 'utf8')) });
  const invalid = { schemaFile: './schema.json', outputDir: './invalid-values', generateTypes: 'false', generateApiClient: 'false', useStrictTypes: 'false', generateQueries: true, typoOption: true };
  fs.writeFileSync(path.join(work, 'invalid.config.json'), JSON.stringify(invalid));
  results.push({ ...run('invalid config accepted', ['generate', '--config', 'invalid.config.json']), files: fs.existsSync(path.join(work, 'invalid-values')) ? fs.readdirSync(path.join(work, 'invalid-values')) : [] });
  results.push(run('unknown help command exit', ['help', 'bogus']));
  const pkg = cp.spawnSync(process.execPath, ['--input-type=module', '-e', 'import { Schemantic, DEFAULT_CONFIG } from "schemantic"; console.log(typeof Schemantic, DEFAULT_CONFIG.namingConvention);'], { cwd: root, encoding: 'utf8' });
  results.push({ name: 'ESM named package import', status: pkg.status, stdout: pkg.stdout, stderr: pkg.stderr });
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
