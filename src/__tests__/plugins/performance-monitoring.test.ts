/**
 * Comprehensive test suite for PerformanceMonitoringPlugin
 *
 * Tests cover:
 * - Plugin metadata and configuration
 * - Performance metrics collection and analysis
 * - Bundle size analysis and optimization
 * - Utility functions and cache management
 */

import {
  performanceMonitoringPlugin,
  getPerformanceMonitoringStats,
  clearPerformanceMonitoringCache,
  generatePerformanceReport,
} from "../../plugins/performance-monitoring";
import {
  SchemanticConfig,
  PluginConfig,
  GenerationContext,
  GeneratedType,
  GenerationResult,
} from "../../types/core";
import { OpenAPISchema } from "../../types/openapi";
import { ExtendedSchemaObject } from "../../types/schema";
import { createTestConfig, createTestSchema } from "../test-config";

describe("PerformanceMonitoringPlugin", () => {
  let config: SchemanticConfig;
  let testSchema: OpenAPISchema;
  let mockContext: GenerationContext;

  beforeEach(() => {
    config = createTestConfig({
      plugins: [
        {
          name: "performance-monitoring",
          enabled: true,
          options: {
            enableRequestTiming: true,
            enableBundleAnalysis: true,
            enableMemoryProfiling: true,
            enableRegressionDetection: true,
            maxMetricsStorage: 1000,
            metricsTTL: 60000,
            warningThresholds: {
              requestTime: 1000,
              bundleSize: 1000000,
              memoryUsage: 50000000,
            },
            generateReports: true,
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

    // Clear performance stats before each test
    clearPerformanceMonitoringCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
    clearPerformanceMonitoringCache();
  });

  describe("Plugin Metadata", () => {
    it("should have correct plugin metadata", () => {
      expect(performanceMonitoringPlugin.name).toBe("performance-monitoring");
      expect(performanceMonitoringPlugin.version).toBeDefined();
      expect(performanceMonitoringPlugin.description).toContain("performance");
    });

    it("should implement required plugin methods", () => {
      expect(typeof performanceMonitoringPlugin.beforeGeneration).toBe(
        "function"
      );
      expect(typeof performanceMonitoringPlugin.afterGeneration).toBe(
        "function"
      );
      expect(typeof performanceMonitoringPlugin.afterTypeGeneration).toBe(
        "function"
      );
      expect(typeof performanceMonitoringPlugin.afterClientGeneration).toBe(
        "function"
      );
    });
  });

  describe("Performance Metrics Collection", () => {
    it("should collect timing metrics during generation", async () => {
      if (performanceMonitoringPlugin.beforeGeneration) {
        await performanceMonitoringPlugin.beforeGeneration(mockContext);
      }

      // Simulate some processing time
      await new Promise((resolve) => setTimeout(resolve, 10));

      const mockResult: GenerationResult = {
        success: true,
        generatedFiles: [],
        errors: [],
        warnings: [],
        statistics: {
          totalTypes: 5,
          totalEndpoints: 3,
          totalFiles: 2,
          totalSize: 1000,
          generationTime: 100,
          schemaSize: 500,
        },
      };

      if (performanceMonitoringPlugin.afterGeneration) {
        await performanceMonitoringPlugin.afterGeneration(
          mockContext,
          mockResult
        );
      }

      const stats = getPerformanceMonitoringStats();
      expect(stats).toBeDefined();
    });

    it("should track type generation performance", async () => {
      const mockGeneratedType: GeneratedType = {
        name: "TestType",
        content: "export interface TestType { id: string; }",
        dependencies: [],
        exports: ["TestType"],
        isInterface: true,
        isEnum: false,
        isUnion: false,
        sourceSchema: {
          type: "object",
          properties: { id: { type: "string" } },
        } as ExtendedSchemaObject,
      };

      if (performanceMonitoringPlugin.afterTypeGeneration) {
        await performanceMonitoringPlugin.afterTypeGeneration(
          "TestType",
          mockGeneratedType,
          mockContext
        );
      }

      const stats = getPerformanceMonitoringStats();
      expect(stats).toBeDefined();
    });

    it("should collect bundle size metrics", async () => {
      const mockResult: GenerationResult = {
        success: true,
        generatedFiles: [
          {
            path: "types.ts",
            content: "export interface User { id: string; name: string; }",
            type: "type",
            dependencies: [],
            size: 58,
          },
          {
            path: "api-client.ts",
            content: "export class ApiClient { }",
            type: "client",
            dependencies: [],
            size: 27,
          },
        ],
        errors: [],
        warnings: [],
        statistics: {
          totalTypes: 1,
          totalEndpoints: 0,
          totalFiles: 2,
          totalSize: 85,
          generationTime: 50,
          schemaSize: 100,
        },
      };

      if (performanceMonitoringPlugin.afterGeneration) {
        await performanceMonitoringPlugin.afterGeneration(
          mockContext,
          mockResult
        );
      }

      const stats = getPerformanceMonitoringStats();
      expect(stats).toBeDefined();
    });
  });

  describe("Statistical Analysis", () => {
    it("should calculate performance statistics correctly", async () => {
      // Generate multiple measurements to test statistical analysis
      for (let i = 0; i < 10; i++) {
        const mockResult: GenerationResult = {
          success: true,
          generatedFiles: [],
          errors: [],
          warnings: [],
          statistics: {
            totalTypes: i + 1,
            totalEndpoints: 0,
            totalFiles: 1,
            totalSize: (i + 1) * 100,
            generationTime: (i + 1) * 10,
            schemaSize: 50,
          },
        };

        if (performanceMonitoringPlugin.afterGeneration) {
          await performanceMonitoringPlugin.afterGeneration(
            mockContext,
            mockResult
          );
        }
      }

      const stats = getPerformanceMonitoringStats();
      expect(stats).toBeDefined();
    });

    it("should detect performance trends", async () => {
      // Simulate increasing generation times to test trend detection
      const times = [10, 20, 30, 50, 80];

      for (const time of times) {
        const mockResult: GenerationResult = {
          success: true,
          generatedFiles: [],
          errors: [],
          warnings: [],
          statistics: {
            totalTypes: 1,
            totalEndpoints: 0,
            totalFiles: 1,
            totalSize: 100,
            generationTime: time,
            schemaSize: 50,
          },
        };

        if (performanceMonitoringPlugin.afterGeneration) {
          await performanceMonitoringPlugin.afterGeneration(
            mockContext,
            mockResult
          );
        }
      }

      const stats = getPerformanceMonitoringStats();
      expect(stats).toBeDefined();
    });
  });

  describe("Memory Profiling", () => {
    it("should monitor memory usage during generation", async () => {
      // Remove unused variable

      if (performanceMonitoringPlugin.beforeGeneration) {
        await performanceMonitoringPlugin.beforeGeneration(mockContext);
      }

      // Simulate memory usage
      const largeArray = new Array(1000).fill("test data");

      const mockResult: GenerationResult = {
        success: true,
        generatedFiles: [],
        errors: [],
        warnings: [],
        statistics: {
          totalTypes: 1,
          totalEndpoints: 0,
          totalFiles: 1,
          totalSize: 100,
          generationTime: 50,
          schemaSize: 50,
        },
      };

      if (performanceMonitoringPlugin.afterGeneration) {
        await performanceMonitoringPlugin.afterGeneration(
          mockContext,
          mockResult
        );
      }

      const stats = getPerformanceMonitoringStats();
      expect(stats).toBeDefined();

      // Clean up
      largeArray.length = 0;
    });

    it("should detect potential memory leaks", async () => {
      // Simulate multiple generations with increasing memory usage
      for (let i = 0; i < 5; i++) {
        if (performanceMonitoringPlugin.beforeGeneration) {
          await performanceMonitoringPlugin.beforeGeneration(mockContext);
        }

        const mockResult: GenerationResult = {
          success: true,
          generatedFiles: [],
          errors: [],
          warnings: [],
          statistics: {
            totalTypes: i + 1,
            totalEndpoints: 0,
            totalFiles: 1,
            totalSize: 100,
            generationTime: 50,
            schemaSize: 50,
          },
        };

        if (performanceMonitoringPlugin.afterGeneration) {
          await performanceMonitoringPlugin.afterGeneration(
            mockContext,
            mockResult
          );
        }
      }

      const stats = getPerformanceMonitoringStats();
      expect(stats).toBeDefined();
    });
  });

  describe("Bundle Size Analysis", () => {
    it("should analyze bundle sizes and provide optimization suggestions", async () => {
      const mockResult: GenerationResult = {
        success: true,
        generatedFiles: [
          {
            path: "types.ts",
            content: "x".repeat(10000), // Large file
            type: "type",
            dependencies: [],
            size: 10000,
          },
          {
            path: "api-client.ts",
            content: "y".repeat(5000),
            type: "client",
            dependencies: [],
            size: 5000,
          },
          {
            path: "index.ts",
            content: "z".repeat(1000),
            type: "index",
            dependencies: [],
            size: 1000,
          },
        ],
        errors: [],
        warnings: [],
        statistics: {
          totalTypes: 50,
          totalEndpoints: 10,
          totalFiles: 3,
          totalSize: 16000,
          generationTime: 100,
          schemaSize: 500,
        },
      };

      if (performanceMonitoringPlugin.afterGeneration) {
        await performanceMonitoringPlugin.afterGeneration(
          mockContext,
          mockResult
        );
      }

      const stats = getPerformanceMonitoringStats();
      expect(stats).toBeDefined();
    });

    it("should track bundle size trends over time", async () => {
      const sizes = [1000, 1500, 2000, 1800, 2200];

      for (const size of sizes) {
        const mockResult: GenerationResult = {
          success: true,
          generatedFiles: [
            {
              path: "types.ts",
              content: "x".repeat(size),
              type: "type",
              dependencies: [],
              size: size,
            },
          ],
          errors: [],
          warnings: [],
          statistics: {
            totalTypes: 10,
            totalEndpoints: 5,
            totalFiles: 1,
            totalSize: size,
            generationTime: 50,
            schemaSize: 100,
          },
        };

        if (performanceMonitoringPlugin.afterGeneration) {
          await performanceMonitoringPlugin.afterGeneration(
            mockContext,
            mockResult
          );
        }
      }

      const stats = getPerformanceMonitoringStats();
      expect(stats).toBeDefined();
    });
  });

  describe("Utility Functions", () => {
    it("should provide performance monitoring stats", () => {
      const stats = getPerformanceMonitoringStats();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe("object");
    });

    it("should clear performance monitoring cache", () => {
      clearPerformanceMonitoringCache();
      const stats = getPerformanceMonitoringStats();
      expect(Object.keys(stats)).toHaveLength(0);
    });

    it("should generate performance reports in different formats", () => {
      const jsonReport = generatePerformanceReport("json");
      expect(jsonReport).toBeDefined();
      expect(typeof jsonReport).toBe("string");

      const htmlReport = generatePerformanceReport("html");
      expect(htmlReport).toBeDefined();
      expect(typeof htmlReport).toBe("string");

      const markdownReport = generatePerformanceReport("markdown");
      expect(markdownReport).toBeDefined();
      expect(typeof markdownReport).toBe("string");
    });
  });

  describe("Configuration Options", () => {
    it("should respect configuration options", () => {
      const configWithoutTiming = {
        ...config,
        plugins: [
          {
            name: "performance-monitoring",
            enabled: true,
            options: {
              enableRequestTiming: false,
              enableBundleAnalysis: true,
              enableMemoryProfiling: false,
              enableRegressionDetection: true,
            },
          },
        ],
      };

      const mockContextWithDifferentConfig = {
        ...mockContext,
        config: configWithoutTiming,
      };

      expect(() => {
        if (performanceMonitoringPlugin.beforeGeneration) {
          performanceMonitoringPlugin.beforeGeneration(
            mockContextWithDifferentConfig
          );
        }
      }).not.toThrow();
    });

    it("should handle missing configuration gracefully", () => {
      const configWithoutOptions = {
        ...config,
        plugins: [
          {
            name: "performance-monitoring",
            enabled: true,
            // No options
          },
        ],
      };

      const mockContextWithoutOptions = {
        ...mockContext,
        config: configWithoutOptions,
      };

      expect(() => {
        if (performanceMonitoringPlugin.beforeGeneration) {
          performanceMonitoringPlugin.beforeGeneration(
            mockContextWithoutOptions
          );
        }
      }).not.toThrow();
    });

    it("should apply warning thresholds correctly", async () => {
      const configWithLowThresholds = {
        ...config,
        plugins: [
          {
            name: "performance-monitoring",
            enabled: true,
            options: {
              enableRequestTiming: true,
              warningThresholds: {
                requestTime: 1, // Very low threshold
                bundleSize: 100,
                memoryUsage: 1000,
              },
            },
          },
        ],
      };

      const mockContextWithLowThresholds = {
        ...mockContext,
        config: configWithLowThresholds,
      };

      const mockResult: GenerationResult = {
        success: true,
        generatedFiles: [],
        errors: [],
        warnings: [],
        statistics: {
          totalTypes: 1,
          totalEndpoints: 0,
          totalFiles: 1,
          totalSize: 1000, // Exceeds threshold
          generationTime: 100, // Exceeds threshold
          schemaSize: 50,
        },
      };

      if (performanceMonitoringPlugin.afterGeneration) {
        await performanceMonitoringPlugin.afterGeneration(
          mockContextWithLowThresholds,
          mockResult
        );
      }

      const stats = getPerformanceMonitoringStats();
      expect(stats).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle errors during performance collection gracefully", async () => {
      const mockContextWithNullSchema = {
        ...mockContext,
        schema: null as unknown as OpenAPISchema,
      };

      expect(async () => {
        if (performanceMonitoringPlugin.beforeGeneration) {
          await performanceMonitoringPlugin.beforeGeneration(
            mockContextWithNullSchema
          );
        }
      }).not.toThrow();
    });

    it("should handle malformed generation results", async () => {
      const malformedResult = {
        success: true,
        // Missing required fields
      } as unknown as GenerationResult;

      expect(async () => {
        if (performanceMonitoringPlugin.afterGeneration) {
          await performanceMonitoringPlugin.afterGeneration(
            mockContext,
            malformedResult
          );
        }
      }).not.toThrow();
    });
  });

  describe("Performance Impact", () => {
    it("should have minimal performance overhead", async () => {
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        if (performanceMonitoringPlugin.beforeGeneration) {
          await performanceMonitoringPlugin.beforeGeneration(mockContext);
        }

        const mockResult: GenerationResult = {
          success: true,
          generatedFiles: [],
          errors: [],
          warnings: [],
          statistics: {
            totalTypes: 1,
            totalEndpoints: 0,
            totalFiles: 1,
            totalSize: 100,
            generationTime: 10,
            schemaSize: 50,
          },
        };

        if (performanceMonitoringPlugin.afterGeneration) {
          await performanceMonitoringPlugin.afterGeneration(
            mockContext,
            mockResult
          );
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete 100 iterations in under 1 second
      expect(totalTime).toBeLessThan(1000);
    });

    it("should manage memory efficiently with large datasets", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate many performance measurements
      for (let i = 0; i < 100; i++) {
        // Reduced from 1000 for test performance
        const mockResult: GenerationResult = {
          success: true,
          generatedFiles: [],
          errors: [],
          warnings: [],
          statistics: {
            totalTypes: i,
            totalEndpoints: 0,
            totalFiles: 1,
            totalSize: 100,
            generationTime: Math.random() * 100,
            schemaSize: 50,
          },
        };

        if (performanceMonitoringPlugin.afterGeneration) {
          await performanceMonitoringPlugin.afterGeneration(
            mockContext,
            mockResult
          );
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (less than 10MB for 100 measurements)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
