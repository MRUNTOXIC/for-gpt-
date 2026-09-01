import React, { createContext, useContext } from 'react';
import type { AuthUser } from './types';

export type AuthContextValue = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

