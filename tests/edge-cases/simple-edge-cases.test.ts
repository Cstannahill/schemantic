import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execAsync = promisify(exec);

describe("Simple Edge Case Validation", () => {
  const testOutputDir = path.join(__dirname, "simple-output");

  beforeAll(async () => {
    // Ensure output directory exists
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up generated files
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test("should validate type-sync works at all", async () => {
    const schema = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {},
      components: {
        schemas: {
          User: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
            },
            required: ["id", "name", "email"],
          },
        },
      },
    };

    const schemaPath = path.join(__dirname, "simple-schemas", "basic.json");
    await fs.mkdir(path.dirname(schemaPath), { recursive: true });
    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    // Generate types using properly quoted paths
    const cliPath = path.join(__dirname, "../../dist/cli/index.js");
    await execAsync(
      `node "${cliPath}" generate --file "${schemaPath}" --output "${testOutputDir}" --quiet`
    );

    // Read generated types
    const typesContent = await fs.readFile(
      path.join(testOutputDir, "types.ts"),
      "utf-8"
    );

    // Basic validation
    expect(typesContent).toContain("export interface APIUser");
    expect(typesContent).toContain("id: string");
    expect(typesContent).toContain("name: string");
    expect(typesContent).toContain("email: string");
  });
});
