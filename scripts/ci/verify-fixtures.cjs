/* Positive CI gate. Unlike reaudit.cjs, any generation or compilation finding fails. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { root, artifactDirectory, writeJson, compile } = require('./helpers.cjs');

async function main() {
  const directory = artifactDirectory('fixtures');
  const report = { passed: false, cases: [], failures: [] };
  console.log(`Fixture evidence: ${directory}`);
  try {
    const { Schemantic, DEFAULT_CONFIG } = require(path.join(root, 'dist'));
    const schemas = fs.readdirSync(path.join(root, 'test-schemas')).filter(file => file.endsWith('.json')).sort();
    assert.equal(schemas.length, 6, 'Expected all six maintained OpenAPI fixtures');
    for (const file of schemas) for (const propertyNaming of ['camelCase', 'preserve']) for (const mode of ['plain', 'zod', 'hooks']) {
      const id = `${file}:${propertyNaming}:${mode}`;
      const outputDir = path.join(directory, propertyNaming, mode, path.basename(file, '.json'));
      const entry = { id, passed: false };
      report.cases.push(entry);
      try {
        const schemaData = JSON.parse(fs.readFileSync(path.join(root, 'test-schemas', file), 'utf8'));
        const result = await new Schemantic({ ...DEFAULT_CONFIG, outputDir, schemaData, propertyNaming,
          ...(mode === 'zod' ? { plugins: [{ name: 'zod-validation', enabled: true }] } : mode === 'hooks' ? { generateHooks: true } : {}) }).generate();
        entry.errors = result.errors;
        entry.warnings = result.warnings;
        assert.equal(result.success, true, JSON.stringify(result.errors));
        for (const name of ['types.ts', 'api-client.ts', 'index.ts', ...(propertyNaming === 'camelCase' ? ['conversion.ts'] : []), ...(mode === 'hooks' ? ['hooks.ts'] : [])]) {
          assert(fs.statSync(path.join(outputDir, name)).size > 0, `Missing or empty ${name}`);
        }
        // Resolve the public barrel as a real consumer, including hooks and plugin exports.
        if (mode === 'zod') {
          const types = fs.readFileSync(path.join(outputDir, 'types.ts'), 'utf8');
          assert.match(types, /from ['"]zod['"]/, 'Zod mode must actually enable the plugin');
          assert.match(types, /\.safeParse\(/, 'Zod mode must expose runtime validators');
        }
        const hookConsumer = mode === 'hooks' ? "import { createApiHooks } from './index.js';\nexport const hookFactory = createApiHooks;\n" : '';
        fs.writeFileSync(path.join(outputDir, 'consumer.ts'), "import * as api from './index.js';\nexport type PublicApi = typeof api;\nexport const exportedNames = Object.keys(api);\n" + hookConsumer);
        entry.diagnostics = compile(outputDir, { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
          verbatimModuleSyntax: true, isolatedModules: true });
        assert.equal(entry.diagnostics.length, 0, JSON.stringify(entry.diagnostics));
        entry.passed = true;
      } catch (error) { entry.failure = error.stack || String(error); report.failures.push(id); }
      console.log(`${entry.passed ? 'PASS' : 'FAIL'} ${id}`);
    }
    assert.equal(report.cases.length, 36);
    assert.equal(report.failures.length, 0, `Failed fixture cases: ${report.failures.join(', ')}`);
    report.passed = true;
  } catch (error) { report.error = error.stack || String(error); throw error; }
  finally { writeJson(path.join(directory, 'report.json'), report); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
