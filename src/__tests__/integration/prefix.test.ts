import * as fs from "fs/promises";
import * as path from "path";
import { Schemantic } from "../../core/schemantic";
import { DEFAULT_CONFIG } from "../../types/core";

describe("integration: prefix handling", () => {
  jest.setTimeout(20000);

  test("generated types have no API prefix when typePrefix is empty", async () => {
    const schemaPath = path.resolve(
      __dirname,
      "../../../test-schemas/allof-inher-union.json"
    );
    const outDir = path.resolve(
      __dirname,
      "../../../test-output/generated-test"
    );

    // Clean output
    await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});

    const config = {
      ...DEFAULT_CONFIG,
      schemaFile: schemaPath,
      outputDir: outDir,
      generateTypes: true,
      generateApiClient: false,
      typePrefix: "",
      typeSuffix: "",
      generateIndexFile: false,
      generateBarrelExports: false,
    } as any;

    const s = new Schemantic(config);
    const result = await s.generate();
    if (!result.success) {
      // Throw a helpful error so test output includes generation errors
      throw new Error(
        `Generation failed: ${JSON.stringify(result.errors || result, null, 2)}`
      );
    }

    const typesPath = path.join(outDir, "types.ts");
    const typesContent = await fs.readFile(typesPath, "utf-8");

    // Expect that the generated types include BasePet and no API-prefixed names
    expect(typesContent).toMatch(/export interface BasePet/);
    expect(typesContent).not.toMatch(/export interface API/);
  });
});
