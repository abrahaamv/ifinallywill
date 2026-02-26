/**
 * Admin Payments page — view all orders, revenue, and Stripe payment status
 */

import { trpc } from '../../utils/trpc';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-blue-50 text-blue-700',
  generated: 'bg-green-50 text-green-700',
  downloaded: 'bg-purple-50 text-purple-700',
  expired: 'bg-red-50 text-red-700',
};

export function AdminPaymentsPage() {
  const { data: orders, isLoading } = trpc.documentOrders.list.useQuery();

  const totalRevenue = orders?.reduce((sum, o) => sum + o.finalPrice, 0) ?? 0;
  const totalDiscount = orders?.reduce((sum, o) => sum + o.discountAmount, 0) ?? 0;
  const paidOrders = orders?.filter((o) => o.status !== 'pending' && o.status !== 'expired') ?? [];
  const pendingOrders = orders?.filter((o) => o.status === 'pending') ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Payments & Orders</h1>
        <a href="/app/admin" className="text-sm text-[var(--ifw-primary-700)] hover:underline">
          &larr; Back to Admin
        </a>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="border rounded-lg p-4">
          <div className="text-xs text-[var(--ifw-text-muted)]">Total Revenue</div>
          <div className="text-2xl font-bold mt-1">${(totalRevenue / 100).toFixed(2)}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-[var(--ifw-text-muted)]">Total Discounts</div>
          <div className="text-2xl font-bold mt-1">${(totalDiscount / 100).toFixed(2)}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-[var(--ifw-text-muted)]">Total Orders</div>
          <div className="text-2xl font-bold mt-1">{orders?.length ?? 0}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-[var(--ifw-text-muted)]">Paid / Pending</div>
          <div className="text-2xl font-bold mt-1">
            <span className="text-green-600">{paidOrders.length}</span>
            {' / '}
            <span className="text-yellow-600">{pendingOrders.length}</span>
          </div>
        </div>
      </div>

      {/* Orders table */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-[var(--ifw-neutral-100)] rounded-lg" />
          ))}
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--ifw-neutral-50)]">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Order ID</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-right px-4 py-3 font-medium">Discount</th>
                <th className="text-left px-4 py-3 font-medium">Stripe</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[var(--ifw-border)]">
                  <td className="px-4 py-3 font-mono text-xs">{order.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[order.status] ?? ''}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">${(order.finalPrice / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-[var(--ifw-text-muted)]">
                    {order.discountAmount > 0 ? `-$${(order.discountAmount / 100).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {order.stripeSessionId ? (
                      <span className="text-[10px] font-mono text-[var(--ifw-text-muted)]">
                        {order.stripeSessionId.slice(0, 16)}...
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--ifw-neutral-400)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--ifw-text-muted)]">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-[var(--ifw-text-muted)]">No orders yet.</p>
      )}
    </div>
  );
}
