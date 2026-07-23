export interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LOCKED' | 'PENDING' | 'DISABLED';
  status_changed_at: string | null;
  status_changed_by: string | null;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface UserListResponse {
  success: boolean;
  users: User[];
  total: number;
}
