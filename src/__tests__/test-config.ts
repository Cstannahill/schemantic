/**
 * Test configuration and utilities
 */

import { SchemanticConfig, DEFAULT_CONFIG } from "../types/core";
import { OpenAPISchema } from "../types/openapi";

/**
 * Create a test configuration
 */
export function createTestConfig(
  overrides: Partial<SchemanticConfig> = {}
): SchemanticConfig {
  const config: SchemanticConfig = {
    outputDir: "./test-output",
    generateTypes: true,
    generateApiClient: true,
    useStrictTypes: true,
    useOptionalChaining: true,
    useNullishCoalescing: true,
    namingConvention: "camelCase",
    preserveComments: true,
    generateIndexFile: true,
    generateBarrelExports: true,
    ...DEFAULT_CONFIG,
    ...overrides,
  };

  return config;
}

/**
 * Create a minimal test schema
 */
export function createTestSchema(): OpenAPISchema {
  return {
    openapi: "3.0.0",
    info: {
      title: "Test API",
      version: "1.0.0",
      description: "A test API for unit tests",
    },
    paths: {
      "/users": {
        get: {
          operationId: "getUsers",
          summary: "Get all users",
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
          summary: "Create a new user",
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
      "/users/{id}": {
        get: {
          operationId: "getUserById",
          summary: "Get user by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            "200": {
              description: "User details",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/User",
                  },
                },
              },
            },
            "404": {
              description: "User not found",
            },
          },
        },
        put: {
          operationId: "updateUser",
          summary: "Update user",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UpdateUserRequest",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Updated user",
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
        delete: {
          operationId: "deleteUser",
          summary: "Delete user",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: {
                type: "string",
              },
            },
          ],
          responses: {
            "204": {
              description: "User deleted",
            },
            "404": {
              description: "User not found",
            },
          },
        },
      },
    },
    components: {
      schemas: {
        User: {
          type: "object",
          description: "A user object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Unique identifier",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            firstName: {
              type: "string",
              description: "User first name",
            },
            lastName: {
              type: "string",
              description: "User last name",
            },
            role: {
              type: "string",
              enum: ["admin", "user", "moderator"],
              description: "User role",
            },
            isActive: {
              type: "boolean",
              description: "Whether the user is active",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
            },
          },
          required: ["id", "email", "firstName", "lastName"],
        },
        CreateUserRequest: {
          type: "object",
          description: "Request to create a new user",
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            firstName: {
              type: "string",
              description: "User first name",
            },
            lastName: {
              type: "string",
              description: "User last name",
            },
            role: {
              type: "string",
              enum: ["admin", "user", "moderator"],
              default: "user",
              description: "User role",
            },
          },
          required: ["email", "firstName", "lastName"],
        },
        UpdateUserRequest: {
          type: "object",
          description: "Request to update a user",
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            firstName: {
              type: "string",
              description: "User first name",
            },
            lastName: {
              type: "string",
              description: "User last name",
            },
            role: {
              type: "string",
              enum: ["admin", "user", "moderator"],
              description: "User role",
            },
            isActive: {
              type: "boolean",
              description: "Whether the user is active",
            },
          },
        },
        Error: {
          type: "object",
          description: "Error response",
          properties: {
            code: {
              type: "string",
              description: "Error code",
            },
            message: {
              type: "string",
              description: "Error message",
            },
            details: {
              type: "object",
              description: "Additional error details",
            },
          },
          required: ["code", "message"],
        },
      },
    },
  };
}

/**
 * Create a complex test schema with various types
 */
export function createComplexTestSchema(): OpenAPISchema {
  return {
    openapi: "3.0.0",
    info: {
      title: "Complex Test API",
      version: "1.0.0",
      description: "A complex test API with various schema types",
    },
    paths: {
      "/products": {
        get: {
          operationId: "getProducts",
          parameters: [
            {
              name: "category",
              in: "query",
              schema: {
                type: "string",
                enum: ["electronics", "clothing", "books"],
              },
            },
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
            },
            {
              name: "offset",
              in: "query",
              schema: {
                type: "integer",
                minimum: 0,
                default: 0,
              },
            },
          ],
          responses: {
            "200": {
              description: "List of products",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      products: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/Product",
                        },
                      },
                      total: {
                        type: "integer",
                      },
                      hasMore: {
                        type: "boolean",
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
    components: {
      schemas: {
        Product: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
            },
            description: {
              type: "string",
            },
            price: {
              type: "number",
              format: "decimal",
            },
            category: {
              $ref: "#/components/schemas/Category",
            },
            tags: {
              type: "array",
              items: {
                type: "string",
              },
            },
            metadata: {
              type: "object",
              additionalProperties: true,
            },
            specifications: {
              type: "object",
              properties: {
                weight: {
                  type: "number",
                },
                dimensions: {
                  type: "object",
                  properties: {
                    width: { type: "number" },
                    height: { type: "number" },
                    depth: { type: "number" },
                  },
                },
              },
            },
            availability: {
              type: "object",
              properties: {
                inStock: {
                  type: "boolean",
                },
                quantity: {
                  type: "integer",
                  minimum: 0,
                },
                lastRestocked: {
                  type: "string",
                  format: "date-time",
                },
              },
            },
          },
          required: ["id", "name", "price", "category"],
        },
        Category: {
          type: "object",
          properties: {
            id: {
              type: "string",
            },
            name: {
              type: "string",
            },
            parent: {
              $ref: "#/components/schemas/Category",
            },
          },
          required: ["id", "name"],
        },
        Order: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
            },
            customerId: {
              type: "string",
              format: "uuid",
            },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productId: {
                    type: "string",
                    format: "uuid",
                  },
                  quantity: {
                    type: "integer",
                    minimum: 1,
                  },
                  price: {
                    type: "number",
                    format: "decimal",
                  },
                },
                required: ["productId", "quantity", "price"],
              },
            },
            status: {
              type: "string",
              enum: [
                "pending",
                "confirmed",
                "shipped",
                "delivered",
                "cancelled",
              ],
            },
            total: {
              type: "number",
              format: "decimal",
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
          },
          required: ["id", "customerId", "items", "status", "total"],
        },
      },
    },
  };
}

/**
 * Mock file system operations for tests
 */
export const mockFs = {
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  access: jest.fn(),
  readdir: jest.fn(),
};

/**
 * Setup mock file system
 */
export function setupMockFs(): void {
  jest.mock("fs/promises", () => mockFs);

  mockFs.mkdir.mockResolvedValue(undefined);
  mockFs.writeFile.mockResolvedValue(undefined);
  mockFs.readFile.mockResolvedValue("{}");
  mockFs.access.mockResolvedValue(undefined);
  mockFs.readdir.mockResolvedValue([]);
}

/**
 * Reset mock file system
 */
export function resetMockFs(): void {
  jest.clearAllMocks();
}

/**
 * Basic test to ensure the test utilities work
 */
describe("Test Utilities", () => {
  it("should create test configuration", () => {
    const config = createTestConfig();
    expect(config).toBeDefined();
    expect(config.outputDir).toBe("./test-output");
    expect(config.generateTypes).toBe(true);
  });

  it("should create test schema", () => {
    const schema = createTestSchema();
    expect(schema).toBeDefined();
    expect(schema.openapi).toBe("3.0.0");
    expect(schema.info.title).toBe("Test API");
  });
});
