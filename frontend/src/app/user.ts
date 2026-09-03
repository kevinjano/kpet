// Mirrors the backend User entity. role is either "Admin" or "Client" (see
// AuthGuard, which checks route data['role'] against this).
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  noTel: string;
  password: string;
  role: string;
}
