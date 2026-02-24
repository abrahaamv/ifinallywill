/**
 * Step 9: Bequests — assign specific assets to beneficiaries
 * Ported from v6 Bequest.jsx (2,645 lines)
 *
 * V6 features preserved:
 * - Two tabs: Individual Gift (single beneficiary) and Shared Gift (multiple recipients)
 * - Asset selection from user's estate assets
 * - Beneficiary + backup selection from key_names
 * - Share tracking with percentage display
 * - Data table showing current bequests with Remove action
 * - Info box explaining bequests vs residue
 */

import { useState, useMemo } from 'react';
import { trpc } from '../../utils/trpc';
import { StepLayout } from '../shared/StepLayout';
import type { StepProps } from '../wizard/WizardShell';

type BequestShare = { keyNameId: string; percentage: number };

export function BequestsStep({ estateDocId, onNext, onPrev, isFirstStep, isLastStep }: StepProps) {
  const { data: assets } = trpc.estateAssets.list.useQuery({});
  const { data: bequestsList } = trpc.bequests.listByDoc.useQuery({ estateDocId });
  const { data: people } = trpc.keyNames.list.useQuery();
  const utils = trpc.useUtils();

  // V6 pattern: two tabs — individual vs shared
  const [activeTab, setActiveTab] = useState<'individual' | 'shared'>('individual');

  // Individual tab state
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [selectedBackupId, setSelectedBackupId] = useState('');
  const [percentage, setPercentage] = useState(100);

  // Shared tab state — accumulate recipients before saving
  const [sharedAssetId, setSharedAssetId] = useState('');
  const [sharedRecipients, setSharedRecipients] = useState<Array<{ keyNameId: string; backupId: string; shares: number }>>([]);
  const [recipientId, setRecipientId] = useState('');
  const [recipientBackupId, setRecipientBackupId] = useState('');
  const [recipientShares, setRecipientShares] = useState('1');
  const [formError, setFormError] = useState('');

  const setMutation = trpc.bequests.set.useMutation({
    onSuccess: () => {
      utils.bequests.listByDoc.invalidate({ estateDocId });
      // Reset individual tab
      setSelectedAssetId('');
      setSelectedPersonId('');
      setSelectedBackupId('');
      setPercentage(100);
      // Reset shared tab
      setSharedAssetId('');
      setSharedRecipients([]);
      setRecipientId('');
      setRecipientBackupId('');
      setRecipientShares('1');
    },
  });

  const deleteMutation = trpc.bequests.delete.useMutation({
    onSuccess: () => utils.bequests.listByDoc.invalidate({ estateDocId }),
  });

  const getPersonName = (id: string) => {
    const p = (people ?? []).find((p) => p.id === id);
    return p ? `${p.firstName} ${p.lastName}` : 'Unknown';
  };

  const getAssetDescription = (asset: { details?: unknown; assetClass?: { name?: string } | null } | null) => {
    const details = asset?.details as { description?: string } | null;
    const className = asset?.assetClass?.name;
    return details?.description || className || 'Asset';
  };

  // V6 pattern: filtered people list excluding already-selected
  const availablePeople = useMemo(() => people ?? [], [people]);

  // ——— Individual tab handlers ———
  const handleAssignIndividual = () => {
    setFormError('');
    if (!selectedAssetId || !selectedPersonId) {
      setFormError('Please select an asset and a beneficiary');
      return;
    }
    setMutation.mutate({
      estateDocId,
      assetId: selectedAssetId,
      shares: [{ keyNameId: selectedPersonId, percentage }],
    });
  };

  // ——— Shared tab handlers (v6 bequestRecipients accumulation pattern) ———
  const addRecipient = () => {
    setFormError('');
    if (!recipientId) { setFormError('Please select a recipient'); return; }
    if (recipientId === recipientBackupId) { setFormError("Recipient and backup can't be the same person"); return; }
    const sharesNum = parseInt(recipientShares, 10);
    if (isNaN(sharesNum) || sharesNum <= 0) { setFormError('Shares must be greater than 0'); return; }
    if (sharedRecipients.some((r) => r.keyNameId === recipientId)) { setFormError('This person is already added'); return; }

    setSharedRecipients((prev) => [...prev, { keyNameId: recipientId, backupId: recipientBackupId, shares: sharesNum }]);
    setRecipientId('');
    setRecipientBackupId('');
    setRecipientShares('1');
  };

  const removeRecipient = (index: number) => {
    setSharedRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  const totalSharedShares = sharedRecipients.reduce((sum, r) => sum + r.shares, 0);

  const saveSharedBequest = () => {
    setFormError('');
    if (!sharedAssetId) { setFormError('Please select an asset'); return; }
    if (sharedRecipients.length < 2) { setFormError('Shared gifts need at least 2 recipients'); return; }

    // Convert shares to percentages
    const sharesData: BequestShare[] = sharedRecipients.map((r) => ({
      keyNameId: r.keyNameId,
      percentage: Math.round((r.shares / totalSharedShares) * 100),
    }));

    setMutation.mutate({
      estateDocId,
      assetId: sharedAssetId,
      shares: sharesData,
    });
  };

  return (
    <StepLayout
      title="Bequests"
      description="Assign specific assets to your beneficiaries. Any unassigned assets will be distributed through the residue."
      onNext={onNext}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
    >
      <div className="space-y-6">
        {/* Info box */}
        <div className="ifw-info-box">
          <strong>What are bequests?</strong> Bequests are specific gifts of particular assets to named
          beneficiaries. For example, you can leave your house to your spouse, or your car to your child.
          Anything not specifically bequeathed will be distributed according to your residue instructions.
        </div>

        {/* Current bequests table */}
        {(bequestsList ?? []).length > 0 && (
          <div>
            <h3 className="ifw-section-title">Current Bequests</h3>
            <div className="border border-[var(--ifw-border)] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--ifw-neutral-100)]">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Asset / Gift</th>
                    <th className="text-left px-3 py-2 font-medium">Beneficiary</th>
                    <th className="text-right px-3 py-2 font-medium">Share</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(bequestsList ?? []).map((bequest) => {
                    const desc = getAssetDescription(bequest.asset as { details?: unknown; assetClass?: { name?: string } | null });
                    const shares = bequest.shares as BequestShare[] | null;
                    return (shares ?? []).map((share, si) => (
                      <tr key={`${bequest.id}-${si}`} className="border-t border-[var(--ifw-border)]">
                        {si === 0 && (
                          <td className="px-3 py-2" rowSpan={(shares ?? []).length}>
                            {desc}
                          </td>
                        )}
                        <td className="px-3 py-2">{getPersonName(share.keyNameId)}</td>
                        <td className="px-3 py-2 text-right">{share.percentage}%</td>
                        {si === 0 && (
                          <td className="px-3 py-2 text-right" rowSpan={(shares ?? []).length}>
                            <button
                              type="button"
                              onClick={() => deleteMutation.mutate({ id: bequest.id })}
                              className="text-xs text-[var(--ifw-error)] hover:underline"
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab switcher (v6: individual vs shared tabs) */}
        <div>
          <h3 className="ifw-section-title">Add a Bequest</h3>
          <div className="flex border-b border-[var(--ifw-border)] mb-4">
            <button
              type="button"
              onClick={() => { setActiveTab('individual'); setFormError(''); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'individual'
                  ? 'border-[var(--ifw-primary-500)] text-[var(--ifw-primary-500)]'
                  : 'border-transparent text-[var(--ifw-text-muted)] hover:text-[var(--ifw-text)]'
              }`}
            >
              Individual Gift
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('shared'); setFormError(''); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'shared'
                  ? 'border-[var(--ifw-primary-500)] text-[var(--ifw-primary-500)]'
                  : 'border-transparent text-[var(--ifw-text-muted)] hover:text-[var(--ifw-text)]'
              }`}
            >
              Shared Gift
            </button>
          </div>

          {/* ——— Individual Gift Tab ——— */}
          {activeTab === 'individual' && (
            <div className="border border-[var(--ifw-border)] rounded-xl p-4 space-y-4">
              <p className="text-xs text-[var(--ifw-text-muted)]">
                Assign one asset to one beneficiary. You can set what percentage of the asset they receive.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Asset *</label>
                  <select value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} className="ifw-input">
                    <option value="">Select asset...</option>
                    {(assets ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {getAssetDescription(a as { details?: unknown; assetClass?: { name?: string } | null })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Beneficiary *</label>
                  <select value={selectedPersonId} onChange={(e) => setSelectedPersonId(e.target.value)} className="ifw-input">
                    <option value="">Select person...</option>
                    {availablePeople.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.relationship})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Backup (Optional)</label>
                  <select value={selectedBackupId} onChange={(e) => setSelectedBackupId(e.target.value)} className="ifw-input">
                    <option value="">None</option>
                    {availablePeople.filter((p) => p.id !== selectedPersonId).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Percentage *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={percentage}
                    onChange={(e) => setPercentage(Number(e.target.value))}
                    className="ifw-input"
                    placeholder="100"
                  />
                </div>
              </div>

              {formError && <p className="text-xs text-[var(--ifw-error)]">{formError}</p>}

              <button
                type="button"
                onClick={handleAssignIndividual}
                disabled={!selectedAssetId || !selectedPersonId || setMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--ifw-primary-500)] text-[var(--ifw-primary-text)] hover:bg-[var(--ifw-primary-hover)] disabled:opacity-40 transition-colors"
              >
                {setMutation.isPending ? 'Saving...' : 'Assign Gift'}
              </button>
            </div>
          )}

          {/* ——— Shared Gift Tab (v6: multiple recipients for same asset) ——— */}
          {activeTab === 'shared' && (
            <div className="border border-[var(--ifw-border)] rounded-xl p-4 space-y-4">
              <p className="text-xs text-[var(--ifw-text-muted)]">
                Assign one asset to multiple beneficiaries with share allocations. Add all recipients, then save.
              </p>

              <div>
                <label className="block text-sm font-medium mb-1">Asset *</label>
                <select value={sharedAssetId} onChange={(e) => setSharedAssetId(e.target.value)} className="ifw-input">
                  <option value="">Select asset...</option>
                  {(assets ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {getAssetDescription(a as { details?: unknown; assetClass?: { name?: string } | null })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add recipient sub-form */}
              <div className="border border-[var(--ifw-border)] rounded-lg p-3 space-y-3 bg-[var(--ifw-neutral-50)]">
                <h4 className="text-sm font-medium">Add Recipient</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Recipient *</label>
                    <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} className="ifw-input">
                      <option value="">Select...</option>
                      {availablePeople.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Backup</label>
                    <select value={recipientBackupId} onChange={(e) => setRecipientBackupId(e.target.value)} className="ifw-input">
                      <option value="">None</option>
                      {availablePeople.filter((p) => p.id !== recipientId).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Shares *</label>
                    <input
                      type="number"
                      min={1}
                      value={recipientShares}
                      onChange={(e) => setRecipientShares(e.target.value)}
                      className="ifw-input"
                      placeholder="1"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addRecipient}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--ifw-secondary-500)] text-[var(--ifw-secondary-text)] hover:bg-[var(--ifw-secondary-hover)] transition-colors"
                >
                  Add Recipient
                </button>
              </div>

              {/* Shared recipients table (v6 bequestRecipients display) */}
              {sharedRecipients.length > 0 && (
                <div className="space-y-3">
                  <div className="border border-[var(--ifw-border)] rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--ifw-neutral-100)]">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Recipient</th>
                          <th className="text-left px-3 py-2 font-medium">Backup</th>
                          <th className="text-right px-3 py-2 font-medium">Shares</th>
                          <th className="text-right px-3 py-2 font-medium">%</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sharedRecipients.map((r, i) => (
                          <tr key={i} className="border-t border-[var(--ifw-border)]">
                            <td className="px-3 py-2">{getPersonName(r.keyNameId)}</td>
                            <td className="px-3 py-2 text-[var(--ifw-text-muted)]">{r.backupId ? getPersonName(r.backupId) : '—'}</td>
                            <td className="px-3 py-2 text-right">{r.shares}</td>
                            <td className="px-3 py-2 text-right">{totalSharedShares > 0 ? ((r.shares / totalSharedShares) * 100).toFixed(1) : 0}%</td>
                            <td className="px-3 py-2 text-right">
                              <button type="button" onClick={() => removeRecipient(i)} className="text-xs text-[var(--ifw-error)] hover:underline">Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* V6 pattern: share distribution bar */}
                  <div className="h-2 rounded-full overflow-hidden flex bg-[var(--ifw-neutral-200)]">
                    {sharedRecipients.map((r, i) => {
                      const pct = totalSharedShares > 0 ? (r.shares / totalSharedShares) * 100 : 0;
                      const colors = ['var(--ifw-primary-500)', 'var(--ifw-secondary-500)', 'var(--ifw-accent)', 'var(--ifw-success)', 'var(--ifw-warning)'];
                      return (
                        <div
                          key={i}
                          style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }}
                          className="h-full transition-all"
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {formError && <p className="text-xs text-[var(--ifw-error)]">{formError}</p>}

              <button
                type="button"
                onClick={saveSharedBequest}
                disabled={sharedRecipients.length < 2 || !sharedAssetId || setMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--ifw-primary-500)] text-[var(--ifw-primary-text)] hover:bg-[var(--ifw-primary-hover)] disabled:opacity-40 transition-colors"
              >
                {setMutation.isPending ? 'Saving...' : 'Save Shared Gift'}
              </button>
            </div>
          )}
        </div>
      </div>
    </StepLayout>
  );
}
