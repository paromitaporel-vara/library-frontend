export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isAvailable: boolean
}

export interface Borrow {
  id: string;
  userId: string;
  bookId: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  user?: User;
  book?: Book;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}
