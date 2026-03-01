/**
 * Admin route guard — only allows admin/owner roles
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

export function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--ifw-primary-700)]" />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}
