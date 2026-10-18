import { z } from 'zod';

export interface BasePet {
  id: number;
  name: string;
  age?: number | null | undefined;
}



/**
 * Zod validation schema for BasePet
 */
export const BasePetSchema: z.ZodType = z.object({
  id: z.number().int(),
  name: z.string(),
  age: z.number().int().nullable().optional()
}).strict();

/**
 * Validate BasePet data with detailed error reporting
 */
export function validateBasePet(data: unknown): { success: true; data: BasePet } | { success: false; errors: string[] } {
  const result = BasePetSchema.safeParse(data);

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

  return { success: true, data: result.data as BasePet };
}

/**
 * Parse BasePet data with exception on validation failure
 */
export function parseBasePet(data: unknown): BasePet {
  return BasePetSchema.parse(data) as BasePet;
}

/**
 * Branded type for BasePet with compile-time guarantees
 */
export type BrandedBasePet = BasePet & { __brand: 'BasePet' };

/**
 * Create a branded BasePet instance
 */
export function createBrandedBasePet(data: BasePet): BrandedBasePet {
  return data as BrandedBasePet;
}
/**
 * Runtime type guard for BasePet
 */
export function isBasePet(value: unknown): value is BasePet {
  return BasePetSchema.safeParse(value).success;
}

export type Dog = BasePet & ({ breed: string; trained?: boolean | undefined; });



/**
 * Zod validation schema for Dog
 */
export const DogSchema: z.ZodType = z.intersection(z.intersection(z.intersection(z.intersection(z.object({
  id: z.number().int(),
  name: z.string(),
  age: z.number().int().nullable().optional()
}).passthrough(), z.unknown()), z.unknown()), z.object({
  breed: z.string(),
  trained: z.boolean().optional()
}).passthrough()), z.unknown());

/**
 * Validate Dog data with detailed error reporting
 */
export function validateDog(data: unknown): { success: true; data: Dog } | { success: false; errors: string[] } {
  const result = DogSchema.safeParse(data);

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

  return { success: true, data: result.data as Dog };
}

/**
 * Parse Dog data with exception on validation failure
 */
export function parseDog(data: unknown): Dog {
  return DogSchema.parse(data) as Dog;
}

/**
 * Branded type for Dog with compile-time guarantees
 */
export type BrandedDog = Dog & { __brand: 'Dog' };

/**
 * Create a branded Dog instance
 */
export function createBrandedDog(data: Dog): BrandedDog {
  return data as BrandedDog;
}
/**
 * Runtime type guard for Dog
 */
export function isDog(value: unknown): value is Dog {
  return DogSchema.safeParse(value).success;
}

export type Cat = BasePet & ({ color?: string | undefined; indoor?: boolean | undefined; });



/**
 * Zod validation schema for Cat
 */
export const CatSchema: z.ZodType = z.intersection(z.intersection(z.intersection(z.intersection(z.object({
  id: z.number().int(),
  name: z.string(),
  age: z.number().int().nullable().optional()
}).passthrough(), z.unknown()), z.unknown()), z.object({
  color: z.string().optional(),
  indoor: z.boolean().optional()
}).passthrough()), z.unknown());

/**
 * Validate Cat data with detailed error reporting
 */
export function validateCat(data: unknown): { success: true; data: Cat } | { success: false; errors: string[] } {
  const result = CatSchema.safeParse(data);

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

  return { success: true, data: result.data as Cat };
}

/**
 * Parse Cat data with exception on validation failure
 */
export function parseCat(data: unknown): Cat {
  return CatSchema.parse(data) as Cat;
}

/**
 * Branded type for Cat with compile-time guarantees
 */
export type BrandedCat = Cat & { __brand: 'Cat' };

/**
 * Create a branded Cat instance
 */
export function createBrandedCat(data: Cat): BrandedCat {
  return data as BrandedCat;
}
/**
 * Runtime type guard for Cat
 */
export function isCat(value: unknown): value is Cat {
  return CatSchema.safeParse(value).success;
}

export type PetResponse = Dog | Cat;



/**
 * Zod validation schema for PetResponse
 */
export const PetResponseSchema: z.ZodType = z.intersection(z.union([z.lazy(() => DogSchema), z.lazy(() => CatSchema)]).refine((value: unknown) => [z.lazy(() => DogSchema), z.lazy(() => CatSchema)].filter(variant => variant.safeParse(value).success).length === 1, { message: "Expected exactly one matching schema" }), z.unknown());

/**
 * Validate PetResponse data with detailed error reporting
 */
export function validatePetResponse(data: unknown): { success: true; data: PetResponse } | { success: false; errors: string[] } {
  const result = PetResponseSchema.safeParse(data);

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

  return { success: true, data: result.data as PetResponse };
}

/**
 * Parse PetResponse data with exception on validation failure
 */
export function parsePetResponse(data: unknown): PetResponse {
  return PetResponseSchema.parse(data) as PetResponse;
}

/**
 * Branded type for PetResponse with compile-time guarantees
 */
export type BrandedPetResponse = PetResponse & { __brand: 'PetResponse' };

/**
 * Create a branded PetResponse instance
 */
export function createBrandedPetResponse(data: PetResponse): BrandedPetResponse {
  return data as BrandedPetResponse;
}
/**
 * Runtime type guard for PetResponse
 */
export function isPetResponse(value: unknown): value is PetResponse {
  return PetResponseSchema.safeParse(value).success;
}