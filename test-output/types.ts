export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
}