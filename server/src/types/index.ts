export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin';
  avatar_url?: string;
  bio?: string;
  reputation: number;
  created_at: string;
  updated_at: string;
}

export interface UserWithoutPassword extends Omit<User, 'password_hash'> {}

export interface Question {
  id: number;
  title: string;
  description: string;
  user_id: number;
  views: number;
  votes: number;
  created_at: string;
  updated_at: string;
  user?: UserWithoutPassword;
  tags?: Tag[];
  answers?: Answer[];
  answer_count?: number;
}

export interface Answer {
  id: number;
  content: string;
  question_id: number;
  user_id: number;
  votes: number;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
  user?: UserWithoutPassword;
  comments?: Comment[];
}

export interface Tag {
  id: number;
  name: string;
  description?: string;
  color: string;
  created_at: string;
}

export interface Vote {
  id: number;
  user_id: number;
  target_type: 'question' | 'answer';
  target_id: number;
  vote_type: -1 | 1;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: 'answer' | 'comment' | 'mention' | 'vote';
  title: string;
  message: string;
  related_id?: number;
  related_type?: string;
  is_read: boolean;
  created_at: string;
}

export interface Comment {
  id: number;
  content: string;
  user_id: number;
  target_type: 'question' | 'answer';
  target_id: number;
  created_at: string;
  updated_at: string;
  user?: UserWithoutPassword;
}

export interface AuthRequest extends Request {
  user?: UserWithoutPassword;
}

export interface CreateQuestionRequest {
  title: string;
  description: string;
  tags: string[];
}

export interface CreateAnswerRequest {
  content: string;
}

export interface VoteRequest {
  vote_type: -1 | 1;
}

export interface CreateCommentRequest {
  content: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} 