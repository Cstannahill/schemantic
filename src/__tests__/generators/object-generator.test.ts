/**
 * Tests for the ObjectTypeGenerator
 */

import { ObjectTypeGenerator } from "../../generators/object-generator";
import { TypeGenerationOptions } from "../../generators/base";
import { ResolvedSchema } from "../../types/schema";
import { GenerationContext } from "../../types/core";
import { createTestConfig } from "../test-config";

describe("ObjectTypeGenerator", () => {
  const createOptions = (): TypeGenerationOptions => ({
    useStrictTypes: true,
    useOptionalChaining: true,
    useNullishCoalescing: true,
    namingConvention: "camelCase",
    preserveComments: true,
  });

  const createContext = (): GenerationContext => ({
    config: createTestConfig({
      outputDir: "./test-output",
    }),
    schema: {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {},
    },
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
  });

  describe("constructor", () => {
    it("should create instance with options", () => {
      const options = createOptions();
      const generator = new ObjectTypeGenerator(options);

      expect(generator).toBeInstanceOf(ObjectTypeGenerator);
    });
  });

  describe("canHandle", () => {
    let generator: ObjectTypeGenerator;

    beforeEach(() => {
      generator = new ObjectTypeGenerator(createOptions());
    });

    it("should handle object schemas", () => {
      const schema: ResolvedSchema = {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      };

      expect(generator.canHandle(schema)).toBe(true);
    });

    it("should handle schemas with properties", () => {
      const schema: ResolvedSchema = {
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      };

      expect(generator.canHandle(schema)).toBe(true);
    });

    it("should not handle non-object schemas", () => {
      const schema: ResolvedSchema = {
        type: "string",
      };

      expect(generator.canHandle(schema)).toBe(false);
    });

    it("should not handle empty schemas", () => {
      const schema: ResolvedSchema = {};

      expect(generator.canHandle(schema)).toBe(false);
    });
  });

  describe("generate", () => {
    let generator: ObjectTypeGenerator;
    let context: GenerationContext;

    beforeEach(() => {
      generator = new ObjectTypeGenerator(createOptions());
      context = createContext();
    });

    it("should generate interface for object schema", () => {
      const schema: ResolvedSchema = {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
        },
        required: ["id", "name"],
      };

      const result = generator.generate(schema, context);

      expect(result.name).toBe("GeneratedType");
      expect(result.content).toContain("export interface GeneratedType");
      expect(result.content).toContain("id: string;");
      expect(result.content).toContain("name: string;");
      expect(result.content).toContain("email?: string | undefined;");
      expect(result.isInterface).toBe(true);
      expect(result.isEnum).toBe(false);
      expect(result.isUnion).toBe(false);
    });

    it("should handle optional properties", () => {
      const schema: ResolvedSchema = {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
        },
        required: ["id"],
      };

      const result = generator.generate(schema, context);

      expect(result.content).toContain("id: string;");
      expect(result.content).toContain("name?: string | undefined;");
      expect(result.content).toContain("email?: string | undefined;");
    });

    it("should handle array properties", () => {
      const schema: ResolvedSchema = {
        type: "object",
        properties: {
          tags: {
            type: "array",
            items: { type: "string" },
          },
        },
      };

      const result = generator.generate(schema, context);

      expect(result.content).toContain("tags?: string[] | undefined;");
    });

    it("should handle nested object properties", () => {
      const schema: ResolvedSchema = {
        type: "object",
        properties: {
          address: {
            type: "object",
            properties: {
              street: { type: "string" },
              city: { type: "string" },
            },
          },
        },
      };

      const result = generator.generate(schema, context);

      expect(result.content).toContain("address?: {");
      expect(result.content).toContain("street?: string | undefined;");
      expect(result.content).toContain("city?: string | undefined;");
    });

    it("should handle enum properties", () => {
      const schema: ResolvedSchema = {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["active", "inactive", "pending"],
          },
        },
      };

      const result = generator.generate(schema, context);

      expect(result.content).toContain('status?: "active" | "inactive" | "pending" | undefined;');
    });

    it("should handle const properties", () => {
      const schema: ResolvedSchema = {
        type: "object",
        properties: {
          type: {
            const: "user",
          },
        },
      };

      const result = generator.generate(schema, context);

      expect(result.content).toContain('type?: "user" | undefined;');
    });

    it("should handle union properties", () => {
      const schema: ResolvedSchema = {
        type: "object",
        properties: {
          value: {
            oneOf: [{ type: "string" }, { type: "number" }],
          },
        },
      };

      const result = generator.generate(schema, context);

      expect(result.content).toContain("value?: string | number | undefined;");
    });

    it("should handle intersection properties", () => {
      const schema: ResolvedSchema = {
        type: "object",
        properties: {
          user: {
            allOf: [
              { type: "object", properties: { id: { type: "string" } } },
              { type: "object", properties: { name: { type: "string" } } },
            ],
          },
        },
      };

      const result = generator.generate(schema, context);

      expect(result.content).toContain("user?: ({");
      expect(result.content).toContain("id?: string | undefined;");
      expect(result.content).toContain("}) & ({");
      expect(result.content).toContain("name?: string | undefined;");
    });

    it("should handle schema references", () => {
      const schema: ResolvedSchema = {
        type: "object",
        properties: {
          user: {
            $ref: "#/components/schemas/User",
          },
        },
      };

      const result = generator.generate(schema, context);

      expect(result.content).toContain("user?: User | undefined;");
      expect(result.dependencies).toContain("User");
    });

    it("should add comments when description is present", () => {
      const schema: ResolvedSchema = {
        type: "object",
        description: "A user object",
        properties: {
          id: { type: "string", description: "User ID" },
        },
      };

      const result = generator.generate(schema, context);

      expect(result.content).toContain("/**");
      expect(result.content).toContain("A user object");
      expect(result.content).toContain("User ID");
    });

    it("should handle custom type mappings", () => {
      const options = createOptions();
      options.customTypeMappings = {
        uuid: "string",
        datetime: "Date",
      };

      const generator = new ObjectTypeGenerator(options);

      const schema: ResolvedSchema = {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "datetime" },
        },
      };

      const result = generator.generate(schema, context);

      expect(result.content).toContain("id?: string | undefined;");
      expect(result.content).toContain("createdAt?: Date | undefined;");
    });

    it("should preserve wire property names independently of method naming", () => {
      const options = createOptions();
      options.namingConvention = "snake_case";

      const generator = new ObjectTypeGenerator(options);

      const schema: ResolvedSchema = {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
        },
      };

      const result = generator.generate(schema, context);

      expect(result.content).toContain("firstName?: string | undefined;");
      expect(result.content).toContain("lastName?: string | undefined;");
    });

    it("should handle type prefix and suffix", () => {
      const options = createOptions();
      options.typePrefix = "Api";
      options.typeSuffix = "Type";

      const generator = new ObjectTypeGenerator(options);

      const schema: ResolvedSchema = {
        type: "object",
        title: "User",
        properties: {
          id: { type: "string" },
        },
      };

      const result = generator.generate(schema, context);

      expect(result.name).toBe("ApiUserType");
    });
  });

  describe("getPriority", () => {
    it("should return priority value", () => {
      const generator = new ObjectTypeGenerator(createOptions());

      expect(generator.getPriority()).toBe(100);
    });
  });

  describe("getMetadata", () => {
    it("should return metadata", () => {
      const generator = new ObjectTypeGenerator(createOptions());
      const metadata = generator.getMetadata();

      expect(metadata.name).toBe("Object Type Generator");
      expect(metadata.version).toBe("1.0.0");
      expect(metadata.supportedTypes).toContain("object");
      expect(metadata.description).toContain("TypeScript interfaces");
    });
  });
});
