import * as fs from "fs/promises";
import * as path from "path";
import * as ts from "typescript";
import { Schemantic } from "../../core/schemantic";
import { SchemanticConfig } from "../../types/core";
import zodValidationPlugin from "../../plugins/zod-validation";

describe("integration: zod validation shape", () => {
  jest.setTimeout(20000);
  let outDir: string;

  beforeEach(async () => {
    // Keep generated sources beneath the workspace so TypeScript can resolve zod.
    const parent = path.resolve(__dirname, "../../../.artifacts/jest");
    await fs.mkdir(parent, { recursive: true });
    outDir = await fs.mkdtemp(path.join(parent, "validation-shape-"));
  });

  afterEach(async () => {
    if (outDir) await fs.rm(outDir, { recursive: true, force: true, maxRetries: 3 });
  });

  test("generated client avoids schema ValidationError collision and validateResponse uses issues", async () => {
    const schemaPath = path.resolve(
      __dirname,
      "../../../test-schemas/image-conversion-schema-openapi.json"
    );
    const config: SchemanticConfig = {
      // Required fields with sensible defaults for test
      schemaFile: schemaPath,
      outputDir: outDir,
      generateTypes: true,
      generateApiClient: true,
      generateHooks: false,
      generateQueries: false,
      useStrictTypes: true,
      useOptionalChaining: true,
      useNullishCoalescing: true,
      namingConvention: "camelCase",
      typePrefix: "",
      typeSuffix: "",
      preserveComments: true,
      generateIndexFile: false,
      plugins: [{ name: "zod-validation", enabled: true }],
    } as unknown as SchemanticConfig;

    const s = new Schemantic(config);
    // Ensure the plugin is registered in the plugin manager for this instance
    s.getPluginManager().registerPlugin(zodValidationPlugin);
    s.getPluginManager().enablePlugin("zod-validation");
    const result = await s.generate();
    if (!result.success) {
      throw new Error(
        `Generation failed: ${JSON.stringify(result.errors || result, null, 2)}`
      );
    }

    const clientPath = path.join(outDir, "api-client.ts");
    const clientContent = await fs.readFile(clientPath, "utf-8");

    expect(clientContent).toMatch(/class ResponseValidationError/);
    expect(clientContent).toMatch(/public issues/);
    expect(clientContent).toMatch(/validateResponse/);
    // generator may emit either `issues || []` or `issues ?? []` depending on nullish-coalescing settings
    expect(clientContent).toMatch(/issues *(?:\|\||\?\?) *\[\]/);
    const files = (await fs.readdir(outDir)).filter(file => file.endsWith(".ts")).map(file => path.join(outDir, file));
    const program = ts.createProgram(files, { strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, skipLibCheck: true, types: [], lib: ["lib.es2020.d.ts", "lib.dom.d.ts"] });
    expect(ts.getPreEmitDiagnostics(program).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))).toEqual([]);
  });
});
