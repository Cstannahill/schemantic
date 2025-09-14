/**
 * Tests for the main Schemantic class
 */

import { Schemantic } from "../core/Schemantic";
import { SchemanticConfig } from "../types/core";
import { OpenAPISchema } from "../types/openapi";
import { createTestConfig } from "./test-config";

describe("Schemantic", () => {
  const mockSchema: OpenAPISchema = {
    openapi: "3.0.0",
    info: {
      title: "Test API",
      version: "1.0.0",
    },
    paths: {
      "/users": {
        get: {
          operationId: "getUsers",
          responses: {
            "200": {
              description: "List of users",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/User",
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: "createUser",
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CreateUserRequest",
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Created user",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/User",
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string", format: "email" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: ["id", "email", "firstName", "lastName"],
        },
        CreateUserRequest: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            firstName: { type: "string" },
            lastName: { type: "string" },
          },
          required: ["email", "firstName", "lastName"],
        },
      },
    },
  };

  const createConfig = (
    overrides: Partial<SchemanticConfig> = {}
  ): SchemanticConfig =>
    createTestConfig({
      schemaData: mockSchema,
      outputDir: "./test-output",
      ...overrides,
    });

  beforeEach(() => {
    // Clean up test output directory
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create instance with valid config", () => {
      const config = createConfig();
      const Schemantic = new Schemantic(config);

      expect(Schemantic).toBeInstanceOf(Schemantic);
      expect(Schemantic.getConfig()).toEqual(config);
    });

    it("should handle invalid config gracefully", () => {
      const invalidConfig = {} as SchemanticConfig;

      // The constructor should not throw, but validation should happen during generation
      const Schemantic = new Schemantic(invalidConfig);
      expect(Schemantic).toBeInstanceOf(Schemantic);
    });
  });

  describe("generate", () => {
    it("should generate types and API client successfully", async () => {
      const config = createConfig({
        generateTypes: true,
        generateApiClient: true,
      });

      const Schemantic = new Schemantic(config);
      const result = await Schemantic.generate();

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(4); // types.ts, api-client.ts, index.ts, barrel.ts
      expect(result.statistics.totalTypes).toBe(2); // User, CreateUserRequest
      expect(result.statistics.totalEndpoints).toBe(2); // getUsers, createUser
      expect(result.errors).toHaveLength(0);
    });

    it("should generate types only when generateApiClient is false", async () => {
      const config = createConfig({
        generateTypes: true,
        generateApiClient: false,
      });

      const Schemantic = new Schemantic(config);
      const result = await Schemantic.generate();

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(3); // types.ts, index.ts, barrel.ts
      expect(result.statistics.totalTypes).toBe(2);
      expect(result.statistics.totalEndpoints).toBe(0);
    });

    it("should generate API client only when generateTypes is false", async () => {
      const config = createConfig({
        generateTypes: false,
        generateApiClient: true,
      });

      const Schemantic = new Schemantic(config);
      const result = await Schemantic.generate();

      expect(result.success).toBe(true);
      expect(result.generatedFiles).toHaveLength(3); // api-client.ts, index.ts, barrel.ts
      expect(result.statistics.totalTypes).toBe(0);
      expect(result.statistics.totalEndpoints).toBe(2);
    });

    it("should handle generation errors gracefully", async () => {
      const config = createConfig({
        schemaData: undefined as unknown as OpenAPISchema, // Invalid schema
      });

      const Schemantic = new Schemantic(config);
      const result = await Schemantic.generate();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("validate", () => {
    it("should validate valid schema successfully", async () => {
      const config = createConfig();
      const Schemantic = new Schemantic(config);

      const result = await Schemantic.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid schema", async () => {
      const invalidSchema = {
        openapi: "3.0.0",
        // Missing required fields
      } as OpenAPISchema;

      const config = createConfig({
        schemaData: invalidSchema,
      });

      const Schemantic = new Schemantic(config);
      const result = await Schemantic.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("plugin management", () => {
    it("should provide plugin manager", () => {
      const config = createConfig();
      const Schemantic = new Schemantic(config);

      const pluginManager = Schemantic.getPluginManager();

      expect(pluginManager).toBeDefined();
      expect(typeof pluginManager.registerPlugin).toBe("function");
      expect(typeof pluginManager.enablePlugin).toBe("function");
    });
  });

  describe("configuration", () => {
    it("should return current configuration", () => {
      const config = createConfig();
      const Schemantic = new Schemantic(config);

      const returnedConfig = Schemantic.getConfig();

      expect(returnedConfig).toEqual(config);
    });
  });
});
