export type UserRole = 'User';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};
