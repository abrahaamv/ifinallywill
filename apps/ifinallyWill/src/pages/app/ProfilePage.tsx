/**
 * Profile page — display user info, account details, subscription status
 */

import { Calendar, Edit2, Mail, Shield, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { trpc } from '../../utils/trpc';

export function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = trpc.users.me.useQuery();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-[var(--ifw-neutral-100)] rounded" />
          <div className="h-40 bg-[var(--ifw-neutral-100)] rounded-xl" />
          <div className="h-32 bg-[var(--ifw-neutral-100)] rounded-xl" />
        </div>
      </div>
    );
  }

  const displayName = profile?.name || user?.name || 'User';
  const email = profile?.email || user?.email || '';
  const role = profile?.role || user?.role || 'user';
  const createdAt = profile?.createdAt ? new Date(profile.createdAt) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <Link
          to="/app/profile/edit"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--ifw-primary-700)' }}
        >
          <Edit2 className="h-4 w-4" />
          Edit Profile
        </Link>
      </div>

      {/* Profile Card */}
      <div className="border border-[var(--ifw-border)] rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{displayName}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-[var(--ifw-text-muted)]">
              <Mail className="h-3.5 w-3.5" />
              {email}
            </div>
            <div className="mt-2">
              <span
                className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                  role === 'owner'
                    ? 'bg-purple-50 text-purple-700'
                    : role === 'admin'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-[var(--ifw-neutral-100)] text-[var(--ifw-text-muted)]'
                }`}
              >
                <Shield className="h-3 w-3" />
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="border border-[var(--ifw-border)] rounded-xl p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--ifw-text-muted)] mb-4">
          Account Details
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[var(--ifw-border)]">
            <div className="flex items-center gap-2 text-sm text-[var(--ifw-text-muted)]">
              <User className="h-4 w-4" />
              Full Name
            </div>
            <span className="text-sm font-medium">{displayName}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--ifw-border)]">
            <div className="flex items-center gap-2 text-sm text-[var(--ifw-text-muted)]">
              <Mail className="h-4 w-4" />
              Email
            </div>
            <span className="text-sm font-medium">{email}</span>
          </div>
          {createdAt && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-sm text-[var(--ifw-text-muted)]">
                <Calendar className="h-4 w-4" />
                Member Since
              </div>
              <span className="text-sm font-medium">{createdAt.toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
