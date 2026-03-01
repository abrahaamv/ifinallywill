/**
 * Step 10: Residue — distribute remaining estate
 * Ported from v6 Residue.jsx (1,600+ lines)
 *
 * V6 features preserved:
 * - 3 modes: bloodline options (dynamic based on married/kid status), custom clause, specific beneficiaries
 * - Bloodline options change text based on isMarried and hasKids
 * - Specific beneficiaries mode with: beneficiary, backup, per stirpes/capita, shares, org mode
 * - Custom clause mode with textarea
 * - Card-based selection UI (v6 ResidueOptionCard)
 */

import type { residueSchema } from '@platform/api-contract/schemas';
import { useEffect, useMemo, useState } from 'react';
import type { z } from 'zod';
import { useAutoSave } from '../../hooks/useAutoSave';
import type { StepProps } from '../../lib/types';
import { trpc } from '../../utils/trpc';
import { StepLayout } from '../shared/StepLayout';

type ResidueData = z.infer<typeof residueSchema>;
type BeneficiaryRow = NonNullable<ResidueData['beneficiary']>[number];

export function ResidueStep({
  estateDocId,
  willData,
  onNext,
  onPrev,
  isFirstStep,
  isLastStep,
}: StepProps) {
  const existing = willData.residue as ResidueData | undefined;
  const autoSave = useAutoSave({ estateDocId, section: 'residue' });
  const { data: keyPeople } = trpc.keyNames.list.useQuery();

  const isMarried = willData.maritalStatus === 'married' || willData.maritalStatus === 'common_law';
  const hasKids = (keyPeople ?? []).some((p) => p.relationship === 'child');

  // Dynamic bloodline options (v6 pattern: different text based on married + hasKids)
  const bloodlineOptions = useMemo(() => {
    const opts: Array<{ icon: string; title: string; subtitle: string; value: string }> = [];
    if (isMarried) {
      opts.push(
        {
          icon: '💑',
          title: 'Spouse first, then children',
          subtitle: 'Per stirpes',
          value:
            'Have the residue of my estate to go to my spouse first, then my children equally per stirpes',
        },
        {
          icon: '👨‍👩‍👧',
          title: 'Spouse first, then children',
          subtitle: 'Per capita',
          value:
            'Have the residue of my estate to go to my spouse first, then my children equally per capita',
        }
      );
    }
    if (hasKids) {
      opts.push(
        {
          icon: '👶',
          title: 'Children per stirpes',
          subtitle: 'Share passes to their descendants',
          value: 'Have the residue go to children per stirpes',
        },
        {
          icon: '👧',
          title: 'Children per capita',
          subtitle: 'Equal share among survivors only',
          value: 'Have the residue go to children per capita',
        }
      );
    }
    opts.push(
      {
        icon: '👨‍👩‍👧‍👦',
        title: 'Parents then siblings',
        subtitle: 'Per stirpes distribution',
        value: 'Have the residue go to parents then siblings per stirpes',
      },
      {
        icon: '👥',
        title: 'Siblings',
        subtitle: 'Per stirpes distribution',
        value: 'Have the residue go to siblings per stirpes',
      }
    );
    return opts;
  }, [isMarried, hasKids]);

  const [selected, setSelected] = useState<string>(existing?.selected ?? '');
  const [clause, setClause] = useState<string>(existing?.clause ?? '');
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRow[]>(existing?.beneficiary ?? []);

  // Specific beneficiary sub-form state
  const [isOrg, setIsOrg] = useState(false);
  const [beneficiary, setBeneficiary] = useState('');
  const [backup, setBackup] = useState('');
  const [shareType, setShareType] = useState<'per_stirpes' | 'per_capita' | ''>('');
  const [shares, setShares] = useState('');
  const [formError, setFormError] = useState('');

  const buildData = (): ResidueData => {
    if (selected === 'Custom Clause') {
      return { selected, clause };
    }
    if (selected === 'Specific Beneficiaries') {
      return { selected, beneficiary: beneficiaries };
    }
    return { selected };
  };

  useEffect(() => {
    if (selected) autoSave.save(buildData());
  }, [selected, clause, JSON.stringify(beneficiaries)]);

  const addBeneficiary = () => {
    setFormError('');
    if (!beneficiary.trim()) {
      setFormError(isOrg ? 'Organization name is required' : 'Beneficiary is required');
      return;
    }
    if (!isOrg && beneficiary === backup) {
      setFormError("Beneficiary and backup can't be the same person");
      return;
    }
    const sharesNum = Number.parseInt(shares, 10);
    if (isNaN(sharesNum) || sharesNum <= 0) {
      setFormError('Shares must be a valid number greater than 0');
      return;
    }
    if (!isOrg && !shareType) {
      setFormError('Backup type is required');
      return;
    }

    setBeneficiaries((prev) => [
      ...prev,
      {
        beneficiary: beneficiary.trim(),
        backup: isOrg ? undefined : backup || undefined,
        type: isOrg ? undefined : (shareType as 'per_stirpes' | 'per_capita'),
        shares: sharesNum,
        isOrganization: isOrg || undefined,
      },
    ]);
    setBeneficiary('');
    setBackup('');
    setShareType('');
    setShares('');
    setIsOrg(false);
  };

  const removeBeneficiary = (index: number) => {
    setBeneficiaries((prev) => prev.filter((_, i) => i !== index));
  };

  const totalShares = beneficiaries.reduce((sum, b) => sum + (b.shares ?? 0), 0);

  const onSubmit = () => {
    autoSave.saveNow(buildData());
    onNext();
  };

  return (
    <StepLayout
      title="What's Left (Residue)"
      description="After all specific gifts are distributed, how should the remainder of your estate be shared?"
      onNext={onSubmit}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={autoSave.status}
      canProceed={!!selected}
    >
      <div className="space-y-6">
        {/* Info box */}
        <div className="ifw-info-box">
          <strong>What is residue?</strong> The residue of your estate is everything that remains
          after specific gifts (bequests) have been distributed. This is typically the largest
          portion of your estate.
        </div>

        {/* Section 1: Bloodline options (dynamic based on marital/kid status) */}
        <div>
          <h3 className="ifw-section-title">How the rest is shared</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {bloodlineOptions.map((opt, i) => (
              <button
                key={i}
                type="button"
                className="ifw-option-card text-left"
                data-selected={selected === opt.value}
                onClick={() => setSelected(opt.value)}
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

        {/* Section 2: Custom selection options */}
        <div>
          <h3 className="ifw-section-title">Custom Selection</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              className="ifw-option-card text-left"
              data-selected={selected === 'Custom Clause'}
              onClick={() => setSelected('Custom Clause')}
            >
              <span className="text-xl flex-shrink-0">📝</span>
              <div>
                <div className="font-medium text-sm">Custom Clause</div>
                <div className="text-xs text-[var(--ifw-text-muted)]">
                  Write your own residue instructions
                </div>
              </div>
            </button>
            <button
              type="button"
              className="ifw-option-card text-left"
              data-selected={selected === 'Specific Beneficiaries'}
              onClick={() => setSelected('Specific Beneficiaries')}
            >
              <span className="text-xl flex-shrink-0">👤</span>
              <div>
                <div className="font-medium text-sm">Specific Beneficiaries</div>
                <div className="text-xs text-[var(--ifw-text-muted)]">
                  Name specific people or organizations with shares
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Custom clause textarea */}
        {selected === 'Custom Clause' && (
          <div className="border border-[var(--ifw-border)] rounded-xl p-4">
            <label className="block text-sm font-medium mb-2">Your Custom Residue Clause</label>
            <textarea
              value={clause}
              onChange={(e) => setClause(e.target.value)}
              rows={5}
              className="ifw-input resize-y"
              style={{ minHeight: '120px' }}
              placeholder="Enter your custom residue clause here..."
            />
          </div>
        )}

        {/* Specific beneficiaries sub-form */}
        {selected === 'Specific Beneficiaries' && (
          <div className="border border-[var(--ifw-border)] rounded-xl p-4 space-y-4">
            <h3 className="ifw-section-title">Add Residue Beneficiary</h3>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isOrg}
                onChange={(e) => {
                  setIsOrg(e.target.checked);
                  setBackup('');
                  setShareType('');
                }}
                className="h-4 w-4 rounded"
              />
              This is an organization (not a person)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {isOrg ? 'Organization Name *' : 'Beneficiary *'}
                </label>
                {isOrg ? (
                  <input
                    type="text"
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    className="ifw-input"
                    placeholder="Enter organization name"
                  />
                ) : (
                  <select
                    value={beneficiary}
                    onChange={(e) => setBeneficiary(e.target.value)}
                    className="ifw-input"
                  >
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
                  <select
                    value={backup}
                    onChange={(e) => setBackup(e.target.value)}
                    className="ifw-input"
                  >
                    <option value="">None</option>
                    {(keyPeople ?? [])
                      .filter((p) => `${p.firstName} ${p.lastName}` !== beneficiary)
                      .map((p) => (
                        <option key={p.id} value={`${p.firstName} ${p.lastName}`}>
                          {p.firstName} {p.lastName}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Shares *</label>
                <input
                  type="number"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  className="ifw-input"
                  min={1}
                  placeholder="e.g. 50"
                />
              </div>

              {!isOrg && (
                <div>
                  <label className="block text-sm font-medium mb-1">Distribution Type *</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        name="residue-type"
                        value="per_stirpes"
                        checked={shareType === 'per_stirpes'}
                        onChange={() => setShareType('per_stirpes')}
                      />
                      Per Stirpes
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="radio"
                        name="residue-type"
                        value="per_capita"
                        checked={shareType === 'per_capita'}
                        onChange={() => setShareType('per_capita')}
                      />
                      Per Capita
                    </label>
                  </div>
                </div>
              )}
            </div>

            {formError && <p className="text-xs text-[var(--ifw-error)]">{formError}</p>}

            <button
              type="button"
              onClick={addBeneficiary}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--ifw-primary-500)] text-[var(--ifw-primary-text)] hover:bg-[var(--ifw-primary-hover)] disabled:opacity-40 transition-colors"
            >
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
                        <td className="px-3 py-2">
                          {row.beneficiary}
                          {row.isOrganization ? ' (Org)' : ''}
                        </td>
                        <td className="px-3 py-2 text-[var(--ifw-text-muted)]">
                          {row.backup ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-[var(--ifw-text-muted)]">
                          {row.type === 'per_stirpes'
                            ? 'Per Stirpes'
                            : row.type === 'per_capita'
                              ? 'Per Capita'
                              : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">{row.shares}</td>
                        <td className="px-3 py-2 text-right">
                          {totalShares > 0
                            ? (((row.shares ?? 0) / totalShares) * 100).toFixed(1)
                            : 0}
                          %
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeBeneficiary(i)}
                            className="text-xs text-[var(--ifw-error)] hover:underline"
                          >
                            Remove
                          </button>
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
