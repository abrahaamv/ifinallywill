/**
 * Step 13: Wipeout Clause
 * Ported from v6 Wipeout.jsx (1,500+ lines)
 *
 * V6 features preserved:
 * - 2 dynamic family distribution cards (changes based on married/single)
 * - "Specific Wipeout Beneficiary" card with sub-form (beneficiary, backup, shares, per stirpes/capita)
 * - "To be determined" card
 * - Available shares tracking (starts 100, decremented as rows added)
 * - Organization vs person mode toggle
 */

import { useEffect, useState, useMemo } from 'react';
import { wipeoutSchema } from '@platform/api-contract/schemas';
import type { z } from 'zod';
import { StepLayout } from '../shared/StepLayout';
import { useAutoSave } from '../../hooks/useAutoSave';
import type { StepProps } from '../../lib/types';
import { trpc } from '../../utils/trpc';

type WipeoutData = z.infer<typeof wipeoutSchema>;
type BeneficiaryRow = NonNullable<WipeoutData['table_dataBequest']>[number];

export function WipeoutStep({ estateDocId, willData, onNext, onPrev, isFirstStep, isLastStep }: StepProps) {
  const existing = willData.wipeout as WipeoutData | undefined;
  const autoSave = useAutoSave({ estateDocId, section: 'wipeout' });
  const { data: keyPeople } = trpc.keyNames.list.useQuery();

  const isMarried = willData.maritalStatus === 'married' || willData.maritalStatus === 'common_law';

  // Dynamic family distribution options (v6 pattern: changes based on married/single)
  const familyOptions = useMemo(() => {
    if (isMarried) {
      return [
        { icon: '👨‍👩‍👧‍👦', title: '50% Parents & Siblings', subtitle: "50% to spouse's family", value: '50% to parents and siblings and 50% to parents and siblings of spouse' },
        { icon: '👥', title: '50% Siblings Each', subtitle: 'Split between families', value: '50% to siblings and 50% to siblings of spouse' },
      ];
    }
    return [
      { icon: '👨‍👩‍👧‍👦', title: '100% Parents & Siblings', subtitle: 'Per stirpes distribution', value: '100% to parents and siblings' },
      { icon: '👥', title: '100% Siblings', subtitle: 'Per stirpes distribution', value: '100% to siblings' },
    ];
  }, [isMarried]);

  const [selectedCategory, setSelectedCategory] = useState<string>(existing?.selectedCategory ?? '');
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRow[]>(existing?.table_dataBequest ?? []);
  const [availableShares, setAvailableShares] = useState<number>(existing?.availableShares ?? 100);

  // Specific beneficiary sub-form state
  const [isOrg, setIsOrg] = useState(false);
  const [beneficiary, setBeneficiary] = useState('');
  const [backup, setBackup] = useState('');
  const [shareType, setShareType] = useState<'per_stirpes' | 'per_capita' | ''>('');
  const [shares, setShares] = useState('');
  const [formError, setFormError] = useState('');

  const buildData = (): WipeoutData => ({
    selectedCategory,
    selectedOption: selectedCategory,
    table_dataBequest: selectedCategory === 'specific' ? beneficiaries : undefined,
    availableShares: selectedCategory === 'specific' ? availableShares : undefined,
  });

  useEffect(() => {
    autoSave.save(buildData());
  }, [selectedCategory, JSON.stringify(beneficiaries), availableShares]);

  const addBeneficiary = () => {
    setFormError('');
    if (!beneficiary.trim()) { setFormError('Beneficiary is required'); return; }
    if (!isOrg && beneficiary === backup) { setFormError("Beneficiary and backup can't be the same"); return; }
    const sharesNum = parseInt(shares, 10);
    if (isNaN(sharesNum) || sharesNum <= 0 || sharesNum > availableShares) {
      setFormError(`Please enter a valid number between 1 and ${availableShares}`);
      return;
    }
    if (!isOrg && !shareType) { setFormError('Please select a distribution type'); return; }

    setBeneficiaries((prev) => [...prev, {
      beneficiary: beneficiary.trim(),
      backup: isOrg ? undefined : backup || undefined,
      type: isOrg ? undefined : (shareType as 'per_stirpes' | 'per_capita'),
      shares: sharesNum,
      isOrganization: isOrg || undefined,
    }]);
    setAvailableShares((prev) => prev - sharesNum);
    setBeneficiary(''); setBackup(''); setShareType(''); setShares(''); setIsOrg(false);
  };

  const removeBeneficiary = (index: number) => {
    const removed = beneficiaries[index];
    setBeneficiaries((prev) => prev.filter((_, i) => i !== index));
    if (removed) setAvailableShares((prev) => prev + (removed.shares ?? 0));
  };

  const onSubmit = () => {
    autoSave.saveNow(buildData());
    onNext();
  };

  const totalShares = beneficiaries.reduce((sum, b) => sum + (b.shares ?? 0), 0);

  return (
    <StepLayout
      title="Wipeout Clause"
      description="If all your beneficiaries pass away before you, who should inherit your estate? This is your backup plan."
      onNext={onSubmit}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={autoSave.status}
    >
      <div className="space-y-6">
        {/* Info box */}
        <div className="ifw-info-box">
          <strong>What is a wipeout clause?</strong> A wipeout clause ensures your estate goes to someone
          you choose, even if all your named beneficiaries are unable to inherit. Without it, provincial
          intestacy laws would decide.
        </div>

        {/* Family distribution cards */}
        <div>
          <h3 className="ifw-section-title">Family Distribution</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {familyOptions.map((opt, i) => (
              <button
                key={i}
                type="button"
                className="ifw-option-card text-left"
                data-selected={selectedCategory === opt.value}
                onClick={() => setSelectedCategory(opt.value)}
              >
                <span className="text-xl flex-shrink-0">{opt.icon}</span>
                <div>
                  <div className="font-medium text-sm">{opt.title}</div>
                  <div className="text-xs text-[var(--ifw-text-muted)]">{opt.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom selection cards */}
        <div>
          <h3 className="ifw-section-title">Custom Selection</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              className="ifw-option-card text-left"
              data-selected={selectedCategory === 'specific'}
              onClick={() => setSelectedCategory('specific')}
            >
              <span className="text-xl flex-shrink-0">📋</span>
              <div>
                <div className="font-medium text-sm">Specific Wipeout Beneficiary</div>
                <div className="text-xs text-[var(--ifw-text-muted)]">Choose specific people or organizations</div>
              </div>
            </button>
            <button
              type="button"
              className="ifw-option-card text-left"
              data-selected={selectedCategory === 'tbd'}
              onClick={() => setSelectedCategory('tbd')}
            >
              <span className="text-xl flex-shrink-0">⏳</span>
              <div>
                <div className="font-medium text-sm">To Be Determined</div>
                <div className="text-xs text-[var(--ifw-text-muted)]">Decide later</div>
              </div>
            </button>
          </div>
        </div>

        {/* Specific beneficiary sub-form */}
        {selectedCategory === 'specific' && (
          <div className="border border-[var(--ifw-border)] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="ifw-section-title mb-0">Add Wipeout Beneficiary</h3>
              <span className="text-xs text-[var(--ifw-text-muted)]">
                Available shares: <strong>{availableShares}</strong> of 100
              </span>
            </div>

            {/* Organization toggle */}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isOrg} onChange={(e) => { setIsOrg(e.target.checked); setBackup(''); setShareType(''); }} className="h-4 w-4 rounded" />
              This is an organization (not a person)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {isOrg ? 'Organization Name *' : 'Beneficiary *'}
                </label>
                {isOrg ? (
                  <input type="text" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} className="ifw-input" placeholder="Enter organization name" />
                ) : (
                  <select value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} className="ifw-input">
                    <option value="">Select person...</option>
                    {(keyPeople ?? []).map((p) => (
                      <option key={p.id} value={`${p.firstName} ${p.lastName}`}>
                        {p.firstName} {p.lastName} ({p.relationship})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {!isOrg && (
                <div>
                  <label className="block text-sm font-medium mb-1">Backup</label>
                  <select value={backup} onChange={(e) => setBackup(e.target.value)} className="ifw-input">
                    <option value="">None</option>
                    {(keyPeople ?? []).filter((p) => `${p.firstName} ${p.lastName}` !== beneficiary).map((p) => (
                      <option key={p.id} value={`${p.firstName} ${p.lastName}`}>
                        {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Shares *</label>
                <input type="number" value={shares} onChange={(e) => setShares(e.target.value)} className="ifw-input" min={1} max={availableShares} placeholder={`1-${availableShares}`} />
              </div>

              {!isOrg && (
                <div>
                  <label className="block text-sm font-medium mb-1">Distribution Type *</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" name="wipeout-type" value="per_stirpes" checked={shareType === 'per_stirpes'} onChange={() => setShareType('per_stirpes')} />
                      Per Stirpes
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="radio" name="wipeout-type" value="per_capita" checked={shareType === 'per_capita'} onChange={() => setShareType('per_capita')} />
                      Per Capita
                    </label>
                  </div>
                </div>
              )}
            </div>

            {formError && <p className="text-xs text-[var(--ifw-error)]">{formError}</p>}

            <button type="button" onClick={addBeneficiary} disabled={availableShares <= 0}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--ifw-primary-500)] text-[var(--ifw-primary-text)] hover:bg-[var(--ifw-primary-hover)] disabled:opacity-40 transition-colors">
              Add Beneficiary
            </button>

            {beneficiaries.length > 0 && (
              <div className="border border-[var(--ifw-border)] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--ifw-neutral-100)]">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Beneficiary</th>
                      <th className="text-left px-3 py-2 font-medium">Backup</th>
                      <th className="text-left px-3 py-2 font-medium">Type</th>
                      <th className="text-right px-3 py-2 font-medium">Shares</th>
                      <th className="text-right px-3 py-2 font-medium">%</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {beneficiaries.map((row, i) => (
                      <tr key={i} className="border-t border-[var(--ifw-border)]">
                        <td className="px-3 py-2">{row.beneficiary}{row.isOrganization ? ' (Org)' : ''}</td>
                        <td className="px-3 py-2 text-[var(--ifw-text-muted)]">{row.backup ?? '—'}</td>
                        <td className="px-3 py-2 text-[var(--ifw-text-muted)]">{row.type === 'per_stirpes' ? 'Per Stirpes' : row.type === 'per_capita' ? 'Per Capita' : '—'}</td>
                        <td className="px-3 py-2 text-right">{row.shares}</td>
                        <td className="px-3 py-2 text-right">{totalShares > 0 ? ((row.shares ?? 0) / totalShares * 100).toFixed(1) : 0}%</td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" onClick={() => removeBeneficiary(i)} className="text-xs text-[var(--ifw-error)] hover:underline">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </StepLayout>
  );
}
