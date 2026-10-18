const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const work = path.join(__dirname, 'scratch');
const esm = path.join(work, 'esm-generated');
fs.mkdirSync(esm, { recursive: true });
fs.writeFileSync(path.join(esm, 'package.json'), '{"type":"module"}');
for (const name of ['types.ts', 'api-client.ts', 'index.ts']) fs.copyFileSync(path.join(work, 'configured', name), path.join(esm, name));
const minimal = path.join(work, 'minimal-programmatic.ts');
fs.writeFileSync(minimal, 'import { Schemantic } from "../../..";\nnew Schemantic({ schemaFile: "schema.json", outputDir: "generated" });\n');
const auth = path.join(work, 'auth-example.ts');
fs.writeFileSync(auth, 'import { DXProbeApiClient } from "./configured";\nconst client = new DXProbeApiClient({baseUrl:"http://localhost"});\nclient.setDefaultHeader("Authorization", "Bearer token");\nclient.removeDefaultHeader("Authorization");\n');
function check(name, files, options) {
  const program = ts.createProgram(files, { strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2020, ...options });
  return { name, diagnostics: ts.getPreEmitDiagnostics(program).map(d => ({ file: d.file?.fileName, line: d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : undefined, code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, '\n') })) };
}
const results = [
  check('generated NodeNext ESM files', [path.join(esm, 'index.ts'), path.join(esm, 'api-client.ts')], { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext }),
  check('minimal programmatic defaults', [minimal], { module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10 }),
  check('tutorial header helpers', [auth], { module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10 }),
];
fs.writeFileSync(path.join(__dirname, 'compile-results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
