/**
 * Admin Dashboard — overview stats, recent activity
 */

import { trpc } from '../../utils/trpc';

export function AdminDashboardPage() {
  const { data: documents } = trpc.estateDocuments.list.useQuery();
  const { data: partners } = trpc.partners.list.useQuery();
  const { data: orders } = trpc.documentOrders.list.useQuery();

  const totalDocs = documents?.length ?? 0;
  const completedDocs = documents?.filter((d) => d.status === 'complete').length ?? 0;
  const totalOrders = orders?.length ?? 0;
  const paidOrders = orders?.filter((o) => o.status !== 'pending').length ?? 0;
  const totalRevenue = orders?.reduce((sum, o) => sum + o.finalPrice, 0) ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Documents"
          value={String(totalDocs)}
          sub={`${completedDocs} completed`}
        />
        <StatCard label="Total Orders" value={String(totalOrders)} sub={`${paidOrders} paid`} />
        <StatCard label="Revenue" value={`$${(totalRevenue / 100).toFixed(2)}`} sub="All time" />
        <StatCard label="Partners" value={String(partners?.length ?? 0)} sub="Active affiliates" />
      </div>

      {/* Quick links */}
      <h2 className="font-semibold mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a
          href="/app/admin/users"
          className="border rounded-lg p-4 hover:border-[var(--ifw-primary-500)] transition-colors"
        >
          <div className="text-lg mb-1">👥</div>
          <div className="font-medium text-sm">Manage Users</div>
          <div className="text-xs text-[var(--ifw-text-muted)]">View and manage user accounts</div>
        </a>
        <a
          href="/app/admin/templates"
          className="border rounded-lg p-4 hover:border-[var(--ifw-primary-500)] transition-colors"
        >
          <div className="text-lg mb-1">📝</div>
          <div className="font-medium text-sm">Manage Templates</div>
          <div className="text-xs text-[var(--ifw-text-muted)]">
            Edit and version document templates
          </div>
        </a>
        <a
          href="/app/admin/payments"
          className="border rounded-lg p-4 hover:border-[var(--ifw-primary-500)] transition-colors"
        >
          <div className="text-lg mb-1">💳</div>
          <div className="font-medium text-sm">View Payments</div>
          <div className="text-xs text-[var(--ifw-text-muted)]">Orders, revenue, and refunds</div>
        </a>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="border border-[var(--ifw-border)] rounded-xl p-4">
      <div className="text-xs text-[var(--ifw-text-muted)] mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-[var(--ifw-text-muted)] mt-1">{sub}</div>
    </div>
  );
}
