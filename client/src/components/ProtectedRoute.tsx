import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
//import { LoginForm } from './LoginForm';

import { LoginForm } from  "@/pages/LoginForm"

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <LoginForm />;
  }

  return <>{children}</>;
};