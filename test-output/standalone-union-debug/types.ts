import { z } from 'zod';

export type Standalone = { a: number; } | string;



/**
 * Zod validation schema for Standalone
 */
export const StandaloneSchema: z.ZodType = z.intersection(z.union([z.object({
  a: z.number()
}).strict(), z.string()]).refine((value: unknown) => [z.object({
  a: z.number()
}).strict(), z.string()].filter(variant => variant.safeParse(value).success).length === 1, { message: "Expected exactly one matching schema" }), z.unknown());

/**
 * Validate Standalone data with detailed error reporting
 */
export function validateStandalone(data: unknown): { success: true; data: Standalone } | { success: false; errors: string[] } {
  const result = StandaloneSchema.safeParse(data);

  if (!result.success) {
    const issues = result.error?.issues ?? [];
    console.warn('Response validation failed:', issues);
    // Return a structured failure result so consumers can handle errors without requiring a runtime ValidationError class
    return {
      success: false,
      errors: issues.length > 0
        ? issues.map((iss: z.core.$ZodIssue) => (iss.path && iss.path.length > 0 ? iss.path.join('.') + ': ' + iss.message : '(root): ' + iss.message))
        : []
    };
  }

  return { success: true, data: result.data as Standalone };
}

/**
 * Parse Standalone data with exception on validation failure
 */
export function parseStandalone(data: unknown): Standalone {
  return StandaloneSchema.parse(data) as Standalone;
}

/**
 * Branded type for Standalone with compile-time guarantees
 */
export type BrandedStandalone = Standalone & { __brand: 'Standalone' };

/**
 * Create a branded Standalone instance
 */
export function createBrandedStandalone(data: Standalone): BrandedStandalone {
  return data as BrandedStandalone;
}
/**
 * Runtime type guard for Standalone
 */
export function isStandalone(value: unknown): value is Standalone {
  return StandaloneSchema.safeParse(value).success;
}