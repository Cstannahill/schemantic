export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface FileUploadResponse {
  fileId: string;
  url: string;
}