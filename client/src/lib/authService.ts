import { apiRequest } from './api'; // Your existing API utility

//import { apiRequest }  from "../../../server/routes"

export interface User {
  id: number;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' }
    });
    return response;
  },

  async logout(): Promise<void> {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  async getSession(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await apiRequest('/api/auth/session', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.user;
    } catch (error) {
      this.clearAuth();
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem('authToken');
  },

  saveAuth(token: string, user: User): void {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearAuth(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }
};