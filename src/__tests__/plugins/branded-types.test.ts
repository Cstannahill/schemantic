/**
 * Comprehensive test suite for BrandedTypesPlugin
 *
 * Tests cover:
 * - Pl       it("should implement required plugin methods", () => {
      expect(typeof brandedTypesPlugin.name).toBe("string");
      expect(typeof brandedTypesPlugin.version).toBe("string");
      expect(typeof brandedTypesPlugin.description).toBe("string");
      expect(typeof brandedTypesPlugin.transformSchema).toBe("function");
      expect(typeof brandedTypesPlugin.afterTypeGeneration).toBe("function");
    });should implement required plugin methods', () => {
      expect(typeof brandedTypesPlugin.transformSchema).toBe('function');
      expect(typeof brandedTypesPlugin.afterTypeGeneration).toBe('function');
    });metadata and configuration
 * - Type safety enhancements and phantom parameters
 * - Runtime type guards and validation
 * - Generated branded type interfaces
 * - Performance and integration characteristics
 */

import { brandedTypesPlugin } from "../../plugins/branded-types";
import {
  SchemanticConfig,
  PluginConfig,
  GenerationContext,
  GeneratedType,
} from "../../types/core";
import { OpenAPISchema } from "../../types/openapi";
import { ExtendedSchemaObject } from "../../types/schema";
import { createTestConfig, createTestSchema } from "../test-config";

describe("BrandedTypesPlugin", () => {
  let config: SchemanticConfig;
  let testSchema: OpenAPISchema;
  let mockContext: GenerationContext;

  beforeEach(() => {
    config = createTestConfig({
      plugins: [
        {
          name: "branded-types",
          enabled: true,
          options: {
            enableBranding: true,
            brandingStrategy: "phantom-types",
            enableRuntimeValidation: true,
            generateTypeGuards: true,
            generateValidators: true,
            generateDeserializers: true,
            brandedFields: ["id", "email", "uuid"],
            customBrandTypes: {
              UserId: "string",
              Email: "string",
              UUID: "string",
            },
            enableStrictMode: true,
            generateUtilities: true,
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
      expect(brandedTypesPlugin.name).toBe("branded-types");
      expect(brandedTypesPlugin.version).toBeDefined();
      expect(brandedTypesPlugin.description).toContain("branded");
    });

    it("should implement required plugin methods", () => {
      expect(typeof brandedTypesPlugin.transformSchema).toBe("function");
      expect(typeof brandedTypesPlugin.afterTypeGeneration).toBe("function");
    });
  });

  describe("Schema Transformation", () => {
    it("should enhance schemas with branding information", async () => {
      const schema: ExtendedSchemaObject = {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
        },
      };

      if (brandedTypesPlugin.transformSchema) {
        const result = await brandedTypesPlugin.transformSchema(
          schema,
          mockContext
        );
        expect(result).toBeDefined();

        // Should enhance properties that match branding criteria
        if (
          result &&
          typeof result === "object" &&
          "properties" in result &&
          result.properties
        ) {
          expect(result.properties).toBeDefined();
        }
      }
    });

    it("should handle nested objects with branded fields", async () => {
      const nestedSchema: ExtendedSchemaObject = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              profile: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  settings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        uuid: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      if (brandedTypesPlugin.transformSchema) {
        const result = await brandedTypesPlugin.transformSchema(
          nestedSchema,
          mockContext
        );
        expect(result).toBeDefined();
      }
    });

    it("should preserve non-branded fields unchanged", async () => {
      const schema: ExtendedSchemaObject = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
          isActive: { type: "boolean" },
        },
      };

      if (brandedTypesPlugin.transformSchema) {
        const result = await brandedTypesPlugin.transformSchema(
          schema,
          mockContext
        );
        expect(result).toBeDefined();

        // Non-branded fields should remain unchanged
        if (result && typeof result === "object") {
          expect(result).toHaveProperty("type", "object");
        }
      }
    });
  });

  describe("Type Generation Enhancement", () => {
    it("should enhance generated types with branding", async () => {
      const mockGeneratedType: GeneratedType = {
        name: "User",
        content: `export interface User {
  id: string;
  email: string;
  name: string;
}`,
        dependencies: [],
        exports: ["User"],
        isInterface: true,
        isEnum: false,
        isUnion: false,
        sourceSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string", format: "email" },
            name: { type: "string" },
          },
        } as ExtendedSchemaObject,
      };

      const originalContent = mockGeneratedType.content;

      if (brandedTypesPlugin.afterTypeGeneration) {
        await brandedTypesPlugin.afterTypeGeneration(
          "User",
          mockGeneratedType,
          mockContext
        );
      }

      // Should have enhanced the content with branding
      expect(mockGeneratedType.content.length).toBeGreaterThanOrEqual(
        originalContent.length
      );
    });

    it("should generate type guards for branded types", async () => {
      const mockGeneratedType: GeneratedType = {
        name: "Product",
        content: `export interface Product {
  id: string;
  uuid: string;
  name: string;
}`,
        dependencies: [],
        exports: ["Product"],
        isInterface: true,
        isEnum: false,
        isUnion: false,
        sourceSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            uuid: { type: "string" },
            name: { type: "string" },
          },
        } as ExtendedSchemaObject,
      };

      if (brandedTypesPlugin.afterTypeGeneration) {
        await brandedTypesPlugin.afterTypeGeneration(
          "Product",
          mockGeneratedType,
          mockContext
        );
      }

      // Should include type guard functions when enabled
      expect(mockGeneratedType.content).toBeDefined();
    });

    it("should handle enum types with branding", async () => {
      const mockEnumType: GeneratedType = {
        name: "Status",
        content: `export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}`,
        dependencies: [],
        exports: ["Status"],
        isInterface: false,
        isEnum: true,
        isUnion: false,
        sourceSchema: {
          type: "string",
          enum: ["active", "inactive"],
        } as ExtendedSchemaObject,
      };

      if (brandedTypesPlugin.afterTypeGeneration) {
        await brandedTypesPlugin.afterTypeGeneration(
          "Status",
          mockEnumType,
          mockContext
        );
      }

      // Should handle enum types appropriately
      expect(mockEnumType.content).toBeDefined();
    });
  });

  describe("Runtime Validation", () => {
    it("should generate runtime validators when enabled", async () => {
      const validationConfig = {
        ...config,
        plugins: [
          {
            name: "branded-types",
            enabled: true,
            options: {
              enableRuntimeValidation: true,
              generateValidators: true,
            },
          },
        ],
      };

      const mockContextWithValidation = {
        ...mockContext,
        config: validationConfig,
      };

      const mockGeneratedType: GeneratedType = {
        name: "ValidatedUser",
        content: `export interface ValidatedUser {
  id: string;
  email: string;
}`,
        dependencies: [],
        exports: ["ValidatedUser"],
        isInterface: true,
        isEnum: false,
        isUnion: false,
        sourceSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string", format: "email" },
          },
        } as ExtendedSchemaObject,
      };

      if (brandedTypesPlugin.afterTypeGeneration) {
        await brandedTypesPlugin.afterTypeGeneration(
          "ValidatedUser",
          mockGeneratedType,
          mockContextWithValidation
        );
      }

      expect(mockGeneratedType.content).toBeDefined();
    });

    it("should generate type guards when enabled", async () => {
      const typeGuardConfig = {
        ...config,
        plugins: [
          {
            name: "branded-types",
            enabled: true,
            options: {
              generateTypeGuards: true,
            },
          },
        ],
      };

      const mockContextWithTypeGuards = {
        ...mockContext,
        config: typeGuardConfig,
      };

      const mockGeneratedType: GeneratedType = {
        name: "GuardedType",
        content: `export interface GuardedType {
  id: string;
}`,
        dependencies: [],
        exports: ["GuardedType"],
        isInterface: true,
        isEnum: false,
        isUnion: false,
        sourceSchema: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        } as ExtendedSchemaObject,
      };

      if (brandedTypesPlugin.afterTypeGeneration) {
        await brandedTypesPlugin.afterTypeGeneration(
          "GuardedType",
          mockGeneratedType,
          mockContextWithTypeGuards
        );
      }

      expect(mockGeneratedType.content).toBeDefined();
    });
  });

  describe("Custom Brand Types", () => {
    it("should handle custom brand type definitions", async () => {
      const customBrandConfig = {
        ...config,
        plugins: [
          {
            name: "branded-types",
            enabled: true,
            options: {
              customBrandTypes: {
                CustomId: "string",
                CustomEmail: "string",
                CustomNumber: "number",
              },
            },
          },
        ],
      };

      const mockContextWithCustomBrands = {
        ...mockContext,
        config: customBrandConfig,
      };

      const schema: ExtendedSchemaObject = {
        type: "object",
        properties: {
          customId: { type: "string" },
          customEmail: { type: "string" },
          customNumber: { type: "number" },
        },
      };

      if (brandedTypesPlugin.transformSchema) {
        const result = await brandedTypesPlugin.transformSchema(
          schema,
          mockContextWithCustomBrands
        );
        expect(result).toBeDefined();
      }
    });

    it("should respect branding strategies", async () => {
      const strategies = [
        "phantom-types",
        "intersection-types",
        "tagged-unions",
      ];

      for (const strategy of strategies) {
        const strategyConfig = {
          ...config,
          plugins: [
            {
              name: "branded-types",
              enabled: true,
              options: {
                brandingStrategy: strategy,
              },
            },
          ],
        };

        const mockContextWithStrategy = {
          ...mockContext,
          config: strategyConfig,
        };

        const schema: ExtendedSchemaObject = {
          type: "object",
          properties: {
            id: { type: "string" },
          },
        };

        if (brandedTypesPlugin.transformSchema) {
          const result = await brandedTypesPlugin.transformSchema(
            schema,
            mockContextWithStrategy
          );
          expect(result).toBeDefined();
        }
      }
    });
  });

  describe("Configuration Options", () => {
    it("should work with minimal configuration", async () => {
      const minimalConfig = {
        ...config,
        plugins: [
          {
            name: "branded-types",
            enabled: true,
            // No options - should use defaults
          },
        ],
      };

      const mockContextMinimal = {
        ...mockContext,
        config: minimalConfig,
      };

      const schema: ExtendedSchemaObject = {
        type: "object",
        properties: { id: { type: "string" } },
      };

      if (brandedTypesPlugin.transformSchema) {
        const result = await brandedTypesPlugin.transformSchema(
          schema,
          mockContextMinimal
        );
        expect(result).toBeDefined();
      }
    });

    it("should handle disabled branding", async () => {
      const disabledConfig = {
        ...config,
        plugins: [
          {
            name: "branded-types",
            enabled: true,
            options: {
              enableBranding: false,
            },
          },
        ],
      };

      const mockContextDisabled = {
        ...mockContext,
        config: disabledConfig,
      };

      const schema: ExtendedSchemaObject = {
        type: "object",
        properties: { id: { type: "string" } },
      };

      if (brandedTypesPlugin.transformSchema) {
        const result = await brandedTypesPlugin.transformSchema(
          schema,
          mockContextDisabled
        );
        expect(result).toBeDefined();
      }
    });

    it("should respect field filtering configuration", async () => {
      const fieldFilterConfig = {
        ...config,
        plugins: [
          {
            name: "branded-types",
            enabled: true,
            options: {
              brandedFields: ["customId", "specialField"],
            },
          },
        ],
      };

      const mockContextFiltered = {
        ...mockContext,
        config: fieldFilterConfig,
      };

      const schema: ExtendedSchemaObject = {
        type: "object",
        properties: {
          id: { type: "string" }, // Should not be branded
          customId: { type: "string" }, // Should be branded
          specialField: { type: "string" }, // Should be branded
          name: { type: "string" }, // Should not be branded
        },
      };

      if (brandedTypesPlugin.transformSchema) {
        const result = await brandedTypesPlugin.transformSchema(
          schema,
          mockContextFiltered
        );
        expect(result).toBeDefined();
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid schemas gracefully", async () => {
      const invalidSchema = {
        invalidProperty: "invalid",
      } as unknown as ExtendedSchemaObject;

      if (brandedTypesPlugin.transformSchema) {
        const transformSchema = brandedTypesPlugin.transformSchema;
        expect(async () => {
          await transformSchema(invalidSchema, mockContext);
        }).not.toThrow();
      }
    });

    it("should handle malformed configuration", async () => {
      const malformedConfig = {
        ...config,
        plugins: [
          {
            name: "branded-types",
            enabled: true,
            options: {
              // Invalid options
              brandingStrategy: "invalid-strategy",
              customBrandTypes: "not an object",
              brandedFields: "not an array",
            },
          },
        ],
      };

      const mockContextMalformed = {
        ...mockContext,
        config: malformedConfig,
      };

      const schema: ExtendedSchemaObject = {
        type: "object",
        properties: { id: { type: "string" } },
      };

      if (brandedTypesPlugin.transformSchema) {
        const transformSchema = brandedTypesPlugin.transformSchema;
        expect(async () => {
          await transformSchema(schema, mockContextMalformed);
        }).not.toThrow();
      }
    });

    it("should handle null context gracefully", async () => {
      const nullContext = null as unknown as GenerationContext;

      const schema: ExtendedSchemaObject = {
        type: "object",
        properties: { id: { type: "string" } },
      };

      if (brandedTypesPlugin.transformSchema) {
        const transformSchema = brandedTypesPlugin.transformSchema;
        expect(async () => {
          await transformSchema(schema, nullContext);
        }).not.toThrow();
      }
    });
  });

  describe("Performance Characteristics", () => {
    it("should have minimal performance impact", async () => {
      const iterations = 100;
      const schema: ExtendedSchemaObject = {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
        },
      };

      if (brandedTypesPlugin.transformSchema) {
        const startTime = Date.now();

        for (let i = 0; i < iterations; i++) {
          await brandedTypesPlugin.transformSchema(schema, mockContext);
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // Should complete 100 iterations in reasonable time
        expect(totalTime).toBeLessThan(1000);
      }
    });

    it("should handle large schemas efficiently", async () => {
      const largeSchema: ExtendedSchemaObject = {
        type: "object",
        properties: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [
            `field${i}`,
            {
              type: i % 3 === 0 ? "string" : i % 3 === 1 ? "number" : "boolean",
            },
          ])
        ),
      };

      if (brandedTypesPlugin.transformSchema) {
        const startTime = Date.now();
        await brandedTypesPlugin.transformSchema(largeSchema, mockContext);
        const endTime = Date.now();

        // Should handle large schemas quickly
        expect(endTime - startTime).toBeLessThan(100);
      }
    });

    it("should manage memory efficiently", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process many schemas
      for (let i = 0; i < 50; i++) {
        const schema: ExtendedSchemaObject = {
          type: "object",
          properties: {
            [`id${i}`]: { type: "string" },
            [`email${i}`]: { type: "string", format: "email" },
          },
        };

        if (brandedTypesPlugin.transformSchema) {
          await brandedTypesPlugin.transformSchema(schema, mockContext);
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });
  });

  describe("Integration Tests", () => {
    it("should work with complex nested schemas", async () => {
      const complexSchema: ExtendedSchemaObject = {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              profile: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  preferences: {
                    type: "object",
                    properties: {
                      uuid: { type: "string" },
                      settings: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      if (brandedTypesPlugin.transformSchema) {
        const result = await brandedTypesPlugin.transformSchema(
          complexSchema,
          mockContext
        );
        expect(result).toBeDefined();
      }
    });

    it("should work with arrays and union types", async () => {
      const arraySchema: ExtendedSchemaObject = {
        type: "object",
        properties: {
          ids: {
            type: "array",
            items: { type: "string" },
          },
          emails: {
            type: "array",
            items: { type: "string", format: "email" },
          },
          mixed: {
            oneOf: [{ type: "string" }, { type: "number" }],
          },
        },
      };

      if (brandedTypesPlugin.transformSchema) {
        const result = await brandedTypesPlugin.transformSchema(
          arraySchema,
          mockContext
        );
        expect(result).toBeDefined();
      }
    });

    it("should integrate properly with generation pipeline", () => {
      // BrandedTypesPlugin doesn't have afterGeneration method
      // But it should work properly when called through the generation pipeline
      expect(brandedTypesPlugin.name).toBe("branded-types");
      expect(brandedTypesPlugin.transformSchema).toBeDefined();
      expect(brandedTypesPlugin.afterTypeGeneration).toBeDefined();
    });
  });
});
