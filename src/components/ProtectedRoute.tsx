import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'gerente' | 'operador' | 'ceo';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    // CEO is a special role - only CEO and admin can access CEO-required pages
    if (requiredRole === 'ceo') {
      if (role !== 'ceo' && role !== 'admin') {
        return <Navigate to="/" replace />;
      }
    } else {
      const roleHierarchy: Record<string, number> = { admin: 3, gerente: 2, operador: 1 };
      const userLevel = role ? (roleHierarchy[role] || 0) : 0;
      const requiredLevel = roleHierarchy[requiredRole];
      if (userLevel < requiredLevel) {
        return <Navigate to="/" replace />;
      }
    }
  }

  return <>{children}</>;
}
