import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, UserProfile } from '../shared/hooks/useAuth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  authError: string | null;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Return a fallback or throw an error
    return {
      user: null,
      loading: false,
      authError: null,
      loginWithMicrosoft: async () => {},
      logout: async () => {},
      refreshSession: async () => {}
    };
  }
  return context;
};
