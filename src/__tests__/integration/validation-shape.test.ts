import * as fs from "fs/promises";
import * as path from "path";
import { Schemantic } from "../../core/schemantic";
import { SchemanticConfig } from "../../types/core";
import zodValidationPlugin from "../../plugins/zod-validation";

describe("integration: zod validation shape", () => {
  jest.setTimeout(20000);

  test("generated client includes ValidationError with issues and validateResponse uses issues", async () => {
    const schemaPath = path.resolve(
      __dirname,
      "../../../test-schemas/image-conversion-schema-openapi.json"
    );
    const outDir = path.resolve(
      __dirname,
      "../../../test-output/generated-zod"
    );

    await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});

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
      generateBarrelExports: false,
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

    expect(clientContent).toMatch(/class ValidationError/);
    expect(clientContent).toMatch(/public issues/);
    expect(clientContent).toMatch(/validateResponse/);
    // generator may emit either `issues || []` or `issues ?? []` depending on nullish-coalescing settings
    expect(clientContent).toMatch(/issues *(?:\|\||\?\?) *\[\]/);
  });
});
