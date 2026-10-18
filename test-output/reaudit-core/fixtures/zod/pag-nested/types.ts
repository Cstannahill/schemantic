import { z } from 'zod';

export interface User {
  id: number;
  username: string;
}



/**
 * Zod validation schema for User
 */
export const UserSchema: z.ZodType = z.object({
  id: z.number().int(),
  username: z.string()
}).strict();

/**
 * Validate User data with detailed error reporting
 */
export function validateUser(data: unknown): { success: true; data: User } | { success: false; errors: string[] } {
  const result = UserSchema.safeParse(data);

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

  return { success: true, data: result.data as User };
}

/**
 * Parse User data with exception on validation failure
 */
export function parseUser(data: unknown): User {
  return UserSchema.parse(data) as User;
}

/**
 * Branded type for User with compile-time guarantees
 */
export type BrandedUser = User & { __brand: 'User' };

/**
 * Create a branded User instance
 */
export function createBrandedUser(data: User): BrandedUser {
  return data as BrandedUser;
}
/**
 * Runtime type guard for User
 */
export function isUser(value: unknown): value is User {
  return UserSchema.safeParse(value).success;
}

export interface Post {
  id: number;
  title: string;
  author: User;
  tags?: string[] | undefined;
}



/**
 * Zod validation schema for Post
 */
export const PostSchema: z.ZodType = z.object({
  id: z.number().int(),
  title: z.string(),
  author: z.lazy(() => UserSchema),
  tags: z.array(z.string()).optional()
}).strict();

/**
 * Validate Post data with detailed error reporting
 */
export function validatePost(data: unknown): { success: true; data: Post } | { success: false; errors: string[] } {
  const result = PostSchema.safeParse(data);

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

  return { success: true, data: result.data as Post };
}

/**
 * Parse Post data with exception on validation failure
 */
export function parsePost(data: unknown): Post {
  return PostSchema.parse(data) as Post;
}

/**
 * Branded type for Post with compile-time guarantees
 */
export type BrandedPost = Post & { __brand: 'Post' };

/**
 * Create a branded Post instance
 */
export function createBrandedPost(data: Post): BrandedPost {
  return data as BrandedPost;
}
/**
 * Runtime type guard for Post
 */
export function isPost(value: unknown): value is Post {
  return PostSchema.safeParse(value).success;
}

export interface PostListResponse {
  items: Post[];
  total: number;
}



/**
 * Zod validation schema for PostListResponse
 */
export const PostListResponseSchema: z.ZodType = z.object({
  items: z.array(z.lazy(() => PostSchema)),
  total: z.number().int()
}).strict();

/**
 * Validate PostListResponse data with detailed error reporting
 */
export function validatePostListResponse(data: unknown): { success: true; data: PostListResponse } | { success: false; errors: string[] } {
  const result = PostListResponseSchema.safeParse(data);

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

  return { success: true, data: result.data as PostListResponse };
}

/**
 * Parse PostListResponse data with exception on validation failure
 */
export function parsePostListResponse(data: unknown): PostListResponse {
  return PostListResponseSchema.parse(data) as PostListResponse;
}

/**
 * Branded type for PostListResponse with compile-time guarantees
 */
export type BrandedPostListResponse = PostListResponse & { __brand: 'PostListResponse' };

/**
 * Create a branded PostListResponse instance
 */
export function createBrandedPostListResponse(data: PostListResponse): BrandedPostListResponse {
  return data as BrandedPostListResponse;
}
/**
 * Runtime type guard for PostListResponse
 */
export function isPostListResponse(value: unknown): value is PostListResponse {
  return PostListResponseSchema.safeParse(value).success;
}