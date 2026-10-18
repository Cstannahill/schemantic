export enum UserRole {
  ADMIN = "ADMIN",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER"
}
export type UserRoleValues = "ADMIN" | "EDITOR" | "VIEWER";

export interface UserProfile {
  bio?: string | null | undefined;
  social?: string[] | undefined;
}

export interface UserResponse {
  id: number;
  name: string;
  role: UserRole;
  profile?: UserProfile | undefined;
}

export interface Book {
  type: "book";
  title: string;
  author: string;
}

export interface Movie {
  type: "movie";
  title: string;
  director: string;
}

export type CreateItemRequest = Book | Movie;

export interface Item {
  id: number;
  data: CreateItemRequest;
}