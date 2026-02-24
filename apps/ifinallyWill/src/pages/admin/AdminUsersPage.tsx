/**
 * Admin Users page — list and manage users
 */

import { trpc } from '../../utils/trpc';

export function AdminUsersPage() {
  const { data, isLoading } = trpc.users.list.useQuery({});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <a href="/app/admin" className="text-sm text-[var(--ifw-primary-700)] hover:underline">
          &larr; Back to Admin
        </a>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-[var(--ifw-neutral-100)] rounded-lg" />
          ))}
        </div>
      ) : data && data.users.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--ifw-neutral-50)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="border-t border-[var(--ifw-border)]">
                  <td className="px-4 py-3">{user.name ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--ifw-text-muted)]">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.role === 'owner' ? 'bg-purple-50 text-purple-700'
                      : user.role === 'admin' ? 'bg-blue-50 text-blue-700'
                      : 'bg-[var(--ifw-neutral-100)] text-[var(--ifw-text-muted)]'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--ifw-text-muted)]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--ifw-text-muted)]">No users found.</p>
      )}
    </div>
  );
}
