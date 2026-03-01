/**
 * Admin Users page — list, search, and manage users with role editing
 */

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { trpc } from '../../utils/trpc';

const ROLES = ['member', 'admin', 'owner'] as const;

export function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, refetch } = trpc.users.list.useQuery({});
  const updateUser = trpc.users.update.useMutation({
    onSuccess: () => refetch(),
  });

  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    if (!search.trim()) return data.users;
    const q = search.toLowerCase();
    return data.users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [data?.users, search]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const pagedUsers = filteredUsers.slice(page * pageSize, (page + 1) * pageSize);

  const handleRoleChange = (userId: string, newRole: string) => {
    updateUser.mutate({ id: userId, role: newRole as 'owner' | 'admin' | 'member' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <a href="/app/admin" className="text-sm text-[var(--ifw-primary-700)] hover:underline">
          &larr; Back to Admin
        </a>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ifw-neutral-400)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search by name, email, or role..."
          className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-500)]"
        />
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-[var(--ifw-neutral-100)] rounded-lg" />
          ))}
        </div>
      ) : pagedUsers.length > 0 ? (
        <>
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
                {pagedUsers.map((user) => (
                  <tr key={user.id} className="border-t border-[var(--ifw-border)]">
                    <td className="px-4 py-3">{user.name ?? '—'}</td>
                    <td className="px-4 py-3 text-[var(--ifw-text-muted)]">{user.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={updateUser.isPending}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${
                          user.role === 'owner'
                            ? 'bg-purple-50 text-purple-700'
                            : user.role === 'admin'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-[var(--ifw-neutral-100)] text-[var(--ifw-text-muted)]'
                        }`}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-[var(--ifw-text-muted)]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-[var(--ifw-text-muted)]">
                Showing {page * pageSize + 1}–
                {Math.min((page + 1) * pageSize, filteredUsers.length)} of {filteredUsers.length}{' '}
                users
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-xs px-3 py-1.5 rounded border disabled:opacity-40 hover:bg-[var(--ifw-neutral-50)]"
                >
                  Previous
                </button>
                <span className="text-xs text-[var(--ifw-text-muted)]">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-xs px-3 py-1.5 rounded border disabled:opacity-40 hover:bg-[var(--ifw-neutral-50)]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-[var(--ifw-text-muted)]">
          {search ? 'No users match your search.' : 'No users found.'}
        </p>
      )}
    </div>
  );
}
