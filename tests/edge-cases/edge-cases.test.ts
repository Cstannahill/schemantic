import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execAsync = promisify(exec);

describe("Edge Case Handling", () => {
  const testOutputDir = path.join(__dirname, "output");

  beforeAll(async () => {
    // Ensure output directory exists
    await fs.mkdir(testOutputDir, { recursive: true });

    // Also create schemas directory for test schemas
    await fs.mkdir(path.join(__dirname, "schemas"), { recursive: true });
  });

  afterAll(async () => {
    // Clean up generated files
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // Helper function to run CLI with proper path quoting
  const runCLI = async (schemaPath: string) => {
    const cliPath = path.join(__dirname, "../../dist/cli/index.js");
    await execAsync(
      `node "${cliPath}" generate --file "${schemaPath}" --output "${testOutputDir}" --quiet`
    );
  };

  test("should handle discriminated unions correctly", async () => {
    const schemaPath = path.join(
      __dirname,
      "schemas/discriminated-unions.json"
    );
    const schema = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      components: {
        schemas: {
          Cat: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["cat"] },
              meowVolume: { type: "integer" },
            },
            required: ["type", "meowVolume"],
          },
          Dog: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["dog"] },
              barkVolume: { type: "integer" },
            },
            required: ["type", "barkVolume"],
          },
          Animal: {
            oneOf: [
              { $ref: "#/components/schemas/Cat" },
              { $ref: "#/components/schemas/Dog" },
            ],
            discriminator: {
              propertyName: "type",
            },
          },
        },
      },
      paths: {
        "/animals": {
          get: {
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Animal" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    // Generate types
    await runCLI(schemaPath);

    // Read generated types
    const typesContent = await fs.readFile(
      path.join(testOutputDir, "types.ts"),
      "utf-8"
    );

    // Verify discriminated union is properly generated
    expect(typesContent).toContain("export type APIAnimal = APICat | APIDog");
    expect(typesContent).toContain('type: "cat"');
    expect(typesContent).toContain('type: "dog"');
    expect(typesContent).toContain("meowVolume: number");
    expect(typesContent).toContain("barkVolume: number");

    // Clean up
    await fs.unlink(schemaPath);
  });

  test("should handle nullable vs optional correctly", async () => {
    const schemaPath = path.join(__dirname, "schemas/nullable-optional.json");
    const schema = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      components: {
        schemas: {
          Product: {
            type: "object",
            properties: {
              name: { type: "string" }, // Required
              description: { type: "string" }, // Optional
              price: { type: "number", nullable: true }, // Required but nullable
              salePrice: { type: "number", nullable: true }, // Optional AND nullable
            },
            required: ["name", "price"],
          },
        },
      },
      paths: {
        "/products": {
          get: {
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Product" },
                  },
                },
              },
            },
          },
        },
      },
    };

    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    // Generate types
    await runCLI(schemaPath);

    // Read generated types
    const typesContent = await fs.readFile(
      path.join(testOutputDir, "types.ts"),
      "utf-8"
    );

    // Verify nullable vs optional handling
    expect(typesContent).toContain("name: string;"); // Required
    expect(typesContent).toContain("description?: string;"); // Optional
    expect(typesContent).toContain("price: number | null;"); // Required but nullable
    expect(typesContent).toContain("salePrice?: number | null;"); // Optional AND nullable

    // Clean up
    await fs.unlink(schemaPath);
  });

  test("should handle complex inheritance (allOf)", async () => {
    const schemaPath = path.join(__dirname, "schemas/inheritance.json");
    const schema = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      components: {
        schemas: {
          BaseUser: {
            type: "object",
            properties: {
              id: { type: "string" },
              email: { type: "string" },
            },
            required: ["id", "email"],
          },
          AdminUser: {
            allOf: [
              { $ref: "#/components/schemas/BaseUser" },
              {
                type: "object",
                properties: {
                  permissions: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["permissions"],
              },
            ],
          },
        },
      },
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/AdminUser" },
                  },
                },
              },
            },
          },
        },
      },
    };

    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    // Generate types
    await runCLI(schemaPath);

    // Read generated types
    const typesContent = await fs.readFile(
      path.join(testOutputDir, "types.ts"),
      "utf-8"
    );

    // Verify inheritance is properly handled
    expect(typesContent).toContain("export interface APIBaseUser");
    expect(typesContent).toContain(
      "export interface APIAdminUser extends APIBaseUser"
    );
    expect(typesContent).toContain("permissions: string[]");

    // Clean up
    await fs.unlink(schemaPath);
  });

  test("should generate proper enum types", async () => {
    const schemaPath = path.join(__dirname, "schemas/enums.json");
    const schema = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      components: {
        schemas: {
          Status: {
            type: "string",
            enum: ["active", "inactive", "pending"],
          },
          Product: {
            type: "object",
            properties: {
              name: { type: "string" },
              status: { $ref: "#/components/schemas/Status" },
            },
            required: ["name", "status"],
          },
        },
      },
      paths: {
        "/products": {
          get: {
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Product" },
                  },
                },
              },
            },
          },
        },
      },
    };

    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    // Generate types
    await runCLI(schemaPath);

    // Read generated types
    const typesContent = await fs.readFile(
      path.join(testOutputDir, "types.ts"),
      "utf-8"
    );

    // Verify enum generation
    expect(typesContent).toContain("export enum APIStatus");
    expect(typesContent).toContain('"active"');
    expect(typesContent).toContain('"inactive"');
    expect(typesContent).toContain('"pending"');
    expect(typesContent).toContain("status: APIStatus");

    // Clean up
    await fs.unlink(schemaPath);
  });

  test("should handle nested discriminated unions", async () => {
    const schemaPath = path.join(
      __dirname,
      "schemas/nested-discriminated.json"
    );
    const schema = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      components: {
        schemas: {
          CreditCard: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["credit_card"] },
              cardNumber: { type: "string" },
            },
            required: ["type", "cardNumber"],
          },
          BankTransfer: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["bank_transfer"] },
              accountNumber: { type: "string" },
            },
            required: ["type", "accountNumber"],
          },
          PaymentMethod: {
            oneOf: [
              { $ref: "#/components/schemas/CreditCard" },
              { $ref: "#/components/schemas/BankTransfer" },
            ],
            discriminator: {
              propertyName: "type",
            },
          },
          Order: {
            type: "object",
            properties: {
              id: { type: "string" },
              paymentMethod: { $ref: "#/components/schemas/PaymentMethod" },
            },
            required: ["id", "paymentMethod"],
          },
        },
      },
      paths: {
        "/orders": {
          post: {
            requestBody: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Order" },
                },
              },
            },
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Order" },
                  },
                },
              },
            },
          },
        },
      },
    };

    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    // Generate types
    await runCLI(schemaPath);

    // Read generated types
    const typesContent = await fs.readFile(
      path.join(testOutputDir, "types.ts"),
      "utf-8"
    );

    // Verify nested discriminated unions
    expect(typesContent).toContain(
      "export type APIPaymentMethod = APICreditCard | APIBankTransfer"
    );
    expect(typesContent).toContain("paymentMethod: APIPaymentMethod");
    expect(typesContent).toContain('type: "credit_card"');
    expect(typesContent).toContain('type: "bank_transfer"');

    // Clean up
    await fs.unlink(schemaPath);
  });

  test("should validate generated TypeScript compiles without errors", async () => {
    const schemaPath = path.join(__dirname, "schemas/comprehensive.json");
    const schema = {
      openapi: "3.0.0",
      info: { title: "Comprehensive Test API", version: "1.0.0" },
      components: {
        schemas: {
          User: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string", nullable: true },
              age: { type: "integer" },
              status: { type: "string", enum: ["active", "inactive"] },
            },
            required: ["id", "name", "age"],
          },
        },
      },
      paths: {
        "/users": {
          get: {
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      type: "array",
                      items: { $ref: "#/components/schemas/User" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));

    // Generate types
    await runCLI(schemaPath);

    // Validate TypeScript compilation
    try {
      await execAsync(
        `npx tsc "${path.join(testOutputDir, "*.ts")}" --noEmit --strict`
      );
    } catch (error) {
      throw new Error(`TypeScript compilation failed: ${error}`);
    }

    // Clean up
    await fs.unlink(schemaPath);
  });
});
