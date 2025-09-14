/**
 * Comprehensive test suite for ZodValidationPlugin
 *
 * Tests cover:
 * - Plugin metadata and structure
 * - Schema transformation capabilities
 * - Lifecycle hooks integration
 * - Error handling and edge cases
 * - Performance characteristics
 */

import { zodValidationPlugin } from "../../plugins/zod-validation";
import {
  SchemanticConfig,
  PluginConfig,
  GenerationContext,
  GeneratedType,
  GenerationResult,
} from "../../types/core";
import { OpenAPISchema } from "../../types/openapi";
import { ResolvedSchema, ExtendedSchemaObject } from "../../types/schema";
import { createTestConfig, createTestSchema } from "../test-config";

describe("ZodValidationPlugin", () => {
  let config: SchemanticConfig;
  let testSchema: OpenAPISchema;
  let mockContext: GenerationContext;

  beforeEach(() => {
    config = createTestConfig({
      plugins: [
        {
          name: "zod-validation",
          enabled: true,
          options: {
            strictMode: true,
            cacheSchemas: true,
            generateBrandedTypes: true,
            generateTypeGuards: true,
          },
        } as PluginConfig,
      ],
    });
    testSchema = createTestSchema();
    mockContext = {
      schema: testSchema,
      config,
      resolvedSchemas: new Map(),
      generatedTypes: new Map(),
      generatedClients: new Map(),
      typeRegistry: {
        registerType: jest.fn(),
        getType: jest.fn(),
        getAllTypes: jest.fn(() => []),
        getDependencies: jest.fn(() => []),
        resolveDependencies: jest.fn(() => []),
      },
      schemaResolver: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Plugin Metadata", () => {
    it("should have correct plugin metadata", () => {
      expect(zodValidationPlugin.name).toBe("zod-validation");
      expect(zodValidationPlugin.version).toBeDefined();
      expect(zodValidationPlugin.description).toContain("Zod");
    });

    it("should implement transformSchema method", () => {
      expect(typeof zodValidationPlugin.transformSchema).toBe("function");
    });

    it("should implement afterTypeGeneration hook", () => {
      expect(typeof zodValidationPlugin.afterTypeGeneration).toBe("function");
    });

    it("should implement transformSchema hook", () => {
      expect(typeof zodValidationPlugin.transformSchema).toBe("function");
    });
  });

  describe("Schema Transformation", () => {
    it("should transform schema without throwing errors", () => {
      const mockResolvedSchema: ResolvedSchema = {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
        required: ["id"],
      } as ExtendedSchemaObject;

      expect(() => {
        zodValidationPlugin.transformSchema!(mockResolvedSchema, mockContext);
      }).not.toThrow();
    });

    it("should return a valid schema after transformation", () => {
      const mockResolvedSchema: ResolvedSchema = {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
        },
        required: ["id", "email"],
      } as ExtendedSchemaObject;

      const result = zodValidationPlugin.transformSchema!(
        mockResolvedSchema,
        mockContext
      );

      expect(result).toBeDefined();
      // Check if it's an ExtendedSchemaObject and has type property
      if ("type" in result) {
        expect(result.type).toBe("object");
      }
    });

    it("should handle complex schema properties", () => {
      const complexSchema: ResolvedSchema = {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { type: "string" },
          },
          metadata: {
            type: "object",
            additionalProperties: true,
          },
          status: {
            type: "string",
            enum: ["active", "inactive"],
          },
        },
      } as ExtendedSchemaObject;

      const result = zodValidationPlugin.transformSchema!(
        complexSchema,
        mockContext
      );
      expect(result).toBeDefined();
      if ("properties" in result) {
        expect(result.properties).toBeDefined();
      }
    });

    it("should handle array schemas", () => {
      const arraySchema: ResolvedSchema = {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 10,
      } as ExtendedSchemaObject;

      const result = zodValidationPlugin.transformSchema!(
        arraySchema,
        mockContext
      );
      expect(result).toBeDefined();
      if ("type" in result) {
        expect(result.type).toBe("array");
      }
    });

    it("should handle string schemas with formats", () => {
      const stringSchema: ResolvedSchema = {
        type: "string",
        format: "email",
        minLength: 5,
        maxLength: 100,
      } as ExtendedSchemaObject;

      const result = zodValidationPlugin.transformSchema!(
        stringSchema,
        mockContext
      );
      expect(result).toBeDefined();
      if ("type" in result) {
        expect(result.type).toBe("string");
      }
    });

    it("should handle number schemas with constraints", () => {
      const numberSchema: ResolvedSchema = {
        type: "number",
        minimum: 0,
        maximum: 100,
        multipleOf: 0.01,
      } as ExtendedSchemaObject;

      const result = zodValidationPlugin.transformSchema!(
        numberSchema,
        mockContext
      );
      expect(result).toBeDefined();
      if ("type" in result) {
        expect(result.type).toBe("number");
      }
    });
  });

  describe("Lifecycle Hooks", () => {
    it("should execute beforeGeneration hook without errors", async () => {
      if (zodValidationPlugin.beforeGeneration) {
        await expect(
          zodValidationPlugin.beforeGeneration(mockContext)
        ).resolves.not.toThrow();
      }
    });

    it("should execute afterGeneration hook without errors", async () => {
      const mockResult: GenerationResult = {
        success: true,
        generatedFiles: [],
        errors: [],
        warnings: [],
        statistics: {
          totalTypes: 0,
          totalEndpoints: 0,
          totalFiles: 0,
          totalSize: 0,
          generationTime: 0,
          schemaSize: 0,
        },
      };

      if (zodValidationPlugin.afterGeneration) {
        await expect(
          zodValidationPlugin.afterGeneration(mockContext, mockResult)
        ).resolves.not.toThrow();
      }
    });

    it("should execute afterTypeGeneration hook without errors", async () => {
      const mockGeneratedType: GeneratedType = {
        name: "User",
        content: "export interface User { id: string; }",
        dependencies: [],
        exports: ["User"],
        isInterface: true,
        isEnum: false,
        isUnion: false,
        sourceSchema: {
          type: "object",
          properties: { id: { type: "string" } },
        } as ExtendedSchemaObject,
      };

      if (zodValidationPlugin.afterTypeGeneration) {
        await expect(
          zodValidationPlugin.afterTypeGeneration(
            "User",
            mockGeneratedType,
            mockContext
          )
        ).resolves.not.toThrow();
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid schema gracefully", () => {
      const invalidSchema = {
        type: "invalid",
      } as unknown as ResolvedSchema;

      expect(() => {
        zodValidationPlugin.transformSchema!(invalidSchema, mockContext);
      }).not.toThrow();
    });

    it("should handle missing properties gracefully", () => {
      const incompleteSchema = {
        type: "object",
        // Missing properties
      } as ExtendedSchemaObject;

      expect(() => {
        zodValidationPlugin.transformSchema!(incompleteSchema, mockContext);
      }).not.toThrow();
    });

    it("should handle null/undefined schema", () => {
      const nullSchema = null as unknown as ResolvedSchema;

      expect(() => {
        zodValidationPlugin.transformSchema!(nullSchema, mockContext);
      }).not.toThrow();
    });

    it("should handle circular references", () => {
      const circularSchema = {
        type: "object",
        properties: {
          self: null as unknown, // Will be set to circularSchema
        },
      } as ExtendedSchemaObject;
      circularSchema.properties!.self = circularSchema;

      expect(() => {
        zodValidationPlugin.transformSchema!(
          circularSchema as ResolvedSchema,
          mockContext
        );
      }).not.toThrow();
    });
  });

  describe("Performance Characteristics", () => {
    it("should perform transformations within reasonable time", () => {
      const startTime = Date.now();

      const schema: ResolvedSchema = {
        type: "object",
        properties: {
          id: { type: "string" },
          data: { type: "object", additionalProperties: true },
        },
      } as ExtendedSchemaObject;

      // Perform multiple transformations
      for (let i = 0; i < 10; i++) {
        zodValidationPlugin.transformSchema!(schema, mockContext);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete 10 transformations in under 1 second
      expect(duration).toBeLessThan(1000);
    });

    it("should handle large schemas efficiently", () => {
      const largeSchema: ExtendedSchemaObject = {
        type: "object",
        properties: {},
      };

      // Add many properties to simulate a large schema
      for (let i = 0; i < 100; i++) {
        largeSchema.properties![`prop${i}`] = { type: "string" };
      }

      const startTime = Date.now();
      const result = zodValidationPlugin.transformSchema!(
        largeSchema as ResolvedSchema,
        mockContext
      );
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(500); // Should be fast
    });
  });

  describe("Schema Enhancement", () => {
    it("should maintain original schema structure", () => {
      const originalSchema: ResolvedSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
      } as ExtendedSchemaObject;

      const result = zodValidationPlugin.transformSchema!(
        originalSchema,
        mockContext
      );

      // Check that essential properties are preserved
      if ("type" in result && "type" in originalSchema) {
        expect(result.type).toBe(originalSchema.type);
      }
      if ("properties" in result) {
        expect(result.properties).toBeDefined();
      }
      if ("required" in result && "required" in originalSchema) {
        expect(result.required).toEqual(originalSchema.required);
      }
    });

    it("should handle oneOf schemas", () => {
      const oneOfSchema: ResolvedSchema = {
        oneOf: [{ type: "string" }, { type: "number" }],
      } as ExtendedSchemaObject;

      const result = zodValidationPlugin.transformSchema!(
        oneOfSchema,
        mockContext
      );
      expect(result).toBeDefined();
      if ("oneOf" in result) {
        expect(result.oneOf).toBeDefined();
      }
    });

    it("should handle allOf schemas", () => {
      const allOfSchema: ResolvedSchema = {
        allOf: [
          { type: "object", properties: { id: { type: "string" } } },
          { type: "object", properties: { name: { type: "string" } } },
        ],
      } as ExtendedSchemaObject;

      const result = zodValidationPlugin.transformSchema!(
        allOfSchema,
        mockContext
      );
      expect(result).toBeDefined();
      if ("allOf" in result) {
        expect(result.allOf).toBeDefined();
      }
    });

    it("should handle anyOf schemas", () => {
      const anyOfSchema: ResolvedSchema = {
        anyOf: [
          { type: "object", properties: { option1: { type: "string" } } },
          { type: "object", properties: { option2: { type: "number" } } },
        ],
      } as ExtendedSchemaObject;

      const result = zodValidationPlugin.transformSchema!(
        anyOfSchema,
        mockContext
      );
      expect(result).toBeDefined();
      if ("anyOf" in result) {
        expect(result.anyOf).toBeDefined();
      }
    });
  });

  describe("Configuration Options", () => {
    it("should work with different plugin configurations", () => {
      const configWithDifferentOptions = {
        ...config,
        plugins: [
          {
            name: "zod-validation",
            enabled: true,
            options: {
              strictMode: false,
              cacheSchemas: false,
              generateBrandedTypes: false,
            },
          },
        ],
      };

      const mockContextWithDifferentConfig = {
        ...mockContext,
        config: configWithDifferentOptions,
      };

      const schema: ResolvedSchema = {
        type: "string",
      } as ExtendedSchemaObject;

      expect(() => {
        zodValidationPlugin.transformSchema!(
          schema,
          mockContextWithDifferentConfig
        );
      }).not.toThrow();
    });

    it("should handle missing plugin options", () => {
      const configWithoutOptions = {
        ...config,
        plugins: [
          {
            name: "zod-validation",
            enabled: true,
            // No options property
          },
        ],
      };

      const mockContextWithoutOptions = {
        ...mockContext,
        config: configWithoutOptions,
      };

      const schema: ResolvedSchema = {
        type: "boolean",
      } as ExtendedSchemaObject;

      expect(() => {
        zodValidationPlugin.transformSchema!(schema, mockContextWithoutOptions);
      }).not.toThrow();
    });
  });
});
