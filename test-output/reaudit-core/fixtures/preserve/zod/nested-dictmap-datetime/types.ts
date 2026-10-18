import { z } from 'zod';

export interface SubEntry {
  label?: string | undefined;
  data_points?: { timestamp: string; value: number; }[] | undefined;
}



/**
 * Zod validation schema for SubEntry
 */
export const SubEntrySchema: z.ZodType = z.object({
  label: z.string().optional(),
  data_points: z.array(z.object({
  timestamp: z.string().datetime(),
  value: z.number()
}).strict()).optional()
}).strict();

/**
 * Validate SubEntry data with detailed error reporting
 */
export function validateSubEntry(data: unknown): { success: true; data: SubEntry } | { success: false; errors: string[] } {
  const result = SubEntrySchema.safeParse(data);

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

  return { success: true, data: result.data as SubEntry };
}

/**
 * Parse SubEntry data with exception on validation failure
 */
export function parseSubEntry(data: unknown): SubEntry {
  return SubEntrySchema.parse(data) as SubEntry;
}

/**
 * Branded type for SubEntry with compile-time guarantees
 */
export type BrandedSubEntry = SubEntry & { __brand: 'SubEntry' };

/**
 * Create a branded SubEntry instance
 */
export function createBrandedSubEntry(data: SubEntry): BrandedSubEntry {
  return data as BrandedSubEntry;
}
/**
 * Runtime type guard for SubEntry
 */
export function isSubEntry(value: unknown): value is SubEntry {
  return SubEntrySchema.safeParse(value).success;
}

export interface Entry {
  value?: number | undefined;
  tags?: string[] | undefined;
  subentries?: SubEntry[] | undefined;
}



/**
 * Zod validation schema for Entry
 */
export const EntrySchema: z.ZodType = z.object({
  value: z.number().optional(),
  tags: z.array(z.string()).optional(),
  subentries: z.array(z.lazy(() => SubEntrySchema)).optional()
}).strict();

/**
 * Validate Entry data with detailed error reporting
 */
export function validateEntry(data: unknown): { success: true; data: Entry } | { success: false; errors: string[] } {
  const result = EntrySchema.safeParse(data);

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

  return { success: true, data: result.data as Entry };
}

/**
 * Parse Entry data with exception on validation failure
 */
export function parseEntry(data: unknown): Entry {
  return EntrySchema.parse(data) as Entry;
}

/**
 * Branded type for Entry with compile-time guarantees
 */
export type BrandedEntry = Entry & { __brand: 'Entry' };

/**
 * Create a branded Entry instance
 */
export function createBrandedEntry(data: Entry): BrandedEntry {
  return data as BrandedEntry;
}
/**
 * Runtime type guard for Entry
 */
export function isEntry(value: unknown): value is Entry {
  return EntrySchema.safeParse(value).success;
}

export interface Report {
  id: string;
  created_at: string;
  metadata?: Record<string, string> | undefined;
  entries: Entry[];
}



/**
 * Zod validation schema for Report
 */
export const ReportSchema: z.ZodType = z.object({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  metadata: z.record(z.string(), z.string()).optional(),
  entries: z.array(z.lazy(() => EntrySchema))
}).strict();

/**
 * Validate Report data with detailed error reporting
 */
export function validateReport(data: unknown): { success: true; data: Report } | { success: false; errors: string[] } {
  const result = ReportSchema.safeParse(data);

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

  return { success: true, data: result.data as Report };
}

/**
 * Parse Report data with exception on validation failure
 */
export function parseReport(data: unknown): Report {
  return ReportSchema.parse(data) as Report;
}

/**
 * Branded type for Report with compile-time guarantees
 */
export type BrandedReport = Report & { __brand: 'Report' };

/**
 * Create a branded Report instance
 */
export function createBrandedReport(data: Report): BrandedReport {
  return data as BrandedReport;
}
/**
 * Runtime type guard for Report
 */
export function isReport(value: unknown): value is Report {
  return ReportSchema.safeParse(value).success;
}