export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface FileUploadResponse {
  file_id: string;
  url: string;
}