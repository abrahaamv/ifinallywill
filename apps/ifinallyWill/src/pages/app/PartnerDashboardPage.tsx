/**
 * Partner Dashboard — earnings, discount codes, analytics
 *
 * Shows partner stats, manages discount codes, and tracks usage.
 * Only accessible to admin/owner roles.
 */

import { useState } from 'react';
import { trpc } from '../../utils/trpc';

export function PartnerDashboardPage() {
  const { data: partnerList, isLoading } = trpc.partners.list.useQuery();
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const selectedPartner = partnerList?.find((p) => p.id === selectedPartnerId);
  const { data: earnings } = trpc.partners.getEarnings.useQuery(
    { partnerId: selectedPartnerId! },
    { enabled: !!selectedPartnerId }
  );
  const { data: codes } = trpc.partners.listCodes.useQuery(
    { partnerId: selectedPartnerId! },
    { enabled: !!selectedPartnerId }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-[var(--ifw-primary-500)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Partner Management</h1>

      {/* Partner list */}
      {!partnerList || partnerList.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-8 text-center">
          <div className="text-3xl mb-3">🤝</div>
          <h2 className="text-lg font-semibold mb-2">No Partners Yet</h2>
          <p className="text-sm text-[var(--ifw-text-muted)]">
            Partners are affiliate organizations that refer clients to IFinallyWill.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Partner cards */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="font-semibold text-sm text-[var(--ifw-text-muted)] uppercase tracking-wide">
              Partners
            </h2>
            {partnerList.map((partner) => (
              <button
                key={partner.id}
                type="button"
                onClick={() => setSelectedPartnerId(partner.id)}
                className={`w-full text-left border rounded-lg p-4 transition-all ${
                  selectedPartnerId === partner.id
                    ? 'border-[var(--ifw-primary-500)] bg-[var(--ifw-primary-50)]'
                    : 'border-[var(--ifw-border)] hover:border-[var(--ifw-neutral-400)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {partner.logoUrl ? (
                    <img src={partner.logoUrl} alt="" className="w-8 h-8 rounded" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: partner.primaryColor ?? 'var(--ifw-primary-500)' }}
                    >
                      {partner.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-sm">{partner.name}</div>
                    <div className="text-xs text-[var(--ifw-text-muted)]">{partner.subdomain}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      partner.status === 'active'
                        ? 'bg-green-50 text-green-700'
                        : partner.status === 'pending'
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {partner.status}
                  </span>
                  <span className="text-[10px] text-[var(--ifw-text-muted)]">
                    {partner.revenueSharePct}% rev share
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Partner detail */}
          <div className="lg:col-span-2">
            {selectedPartner && earnings ? (
              <div className="space-y-6">
                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard
                    label="Total Earnings"
                    value={`$${(earnings.totalEarnings / 100).toFixed(2)}`}
                  />
                  <StatCard label="Code Usages" value={String(earnings.totalCodeUsages)} />
                  <StatCard
                    label="Active Codes"
                    value={`${earnings.activeCodes}/${earnings.totalCodes}`}
                  />
                  <StatCard label="Docs Given" value={String(earnings.totalDocumentsGiven)} />
                </div>

                {/* Discount codes */}
                <div>
                  <h3 className="font-semibold mb-3">Discount Codes</h3>
                  {codes && codes.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--ifw-neutral-50)] text-xs">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium">Code</th>
                            <th className="text-left px-4 py-2 font-medium">Discount</th>
                            <th className="text-left px-4 py-2 font-medium">Uses</th>
                            <th className="text-left px-4 py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {codes.map((code) => (
                            <tr key={code.id} className="border-t border-[var(--ifw-border)]">
                              <td className="px-4 py-2 font-mono text-xs">{code.code}</td>
                              <td className="px-4 py-2">
                                {code.isFree ? 'FREE' : `${code.discountPct}%`}
                              </td>
                              <td className="px-4 py-2">
                                {code.currentUses}
                                {code.maxUses ? `/${code.maxUses}` : ''}
                              </td>
                              <td className="px-4 py-2">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    code.isActive
                                      ? 'bg-green-50 text-green-700'
                                      : 'bg-[var(--ifw-neutral-100)] text-[var(--ifw-text-muted)]'
                                  }`}
                                >
                                  {code.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--ifw-text-muted)]">
                      No discount codes created yet.
                    </p>
                  )}
                </div>

                {/* Contact info */}
                <div className="border rounded-lg p-4 text-sm">
                  <h3 className="font-semibold mb-2">Contact</h3>
                  <p>{selectedPartner.contactName ?? '—'}</p>
                  <p className="text-[var(--ifw-text-muted)]">{selectedPartner.contactEmail}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-[var(--ifw-text-muted)]">
                Select a partner to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--ifw-border)] rounded-lg p-3">
      <div className="text-xs text-[var(--ifw-text-muted)]">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}
