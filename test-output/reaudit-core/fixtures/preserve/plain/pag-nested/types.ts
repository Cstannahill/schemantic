export interface User {
  id: number;
  username: string;
}

export interface Post {
  id: number;
  title: string;
  author: User;
  tags?: string[] | undefined;
}

export interface PostListResponse {
  items: Post[];
  total: number;
}