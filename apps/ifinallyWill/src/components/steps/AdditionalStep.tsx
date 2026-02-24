/**
 * Step 14: Additional Wishes
 * Ported from v6 Additional.jsx (802 lines)
 *
 * V6 features preserved:
 * - 6 card-based funeral/resting place options (cremation, burial, mausoleum, donate, green, family)
 * - Custom clause textarea
 * - Dynamic other wishes list with add/remove
 * - Organ donation checkbox
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { additionalSchema } from '@platform/api-contract/schemas';
import type { z } from 'zod';
import { StepLayout } from '../shared/StepLayout';
import { useAutoSave } from '../../hooks/useAutoSave';
import type { StepProps } from '../wizard/WizardShell';

type FormData = z.infer<typeof additionalSchema>;

const RESTING_PLACE_OPTIONS = [
  { key: 'cremation', icon: '🔥', label: 'Cremation', description: 'Have my remains cremated' },
  { key: 'burial', icon: '🌸', label: 'Burial', description: 'Traditional burial' },
  { key: 'mausoleum', icon: '🏛️', label: 'Mausoleum', description: 'Entombment in a mausoleum' },
  { key: 'donate', icon: '❤️', label: 'Donate Body to Science', description: 'Donate for medical research' },
  { key: 'green', icon: '🌳', label: 'Green Burial', description: 'Eco-friendly natural burial' },
  { key: 'family', icon: '👨‍👩‍👧‍👦', label: 'Let My Family Decide', description: 'Leave the decision to my loved ones' },
] as const;

export function AdditionalStep({ estateDocId, willData, onNext, onPrev, isFirstStep, isLastStep }: StepProps) {
  const existing = willData.additional as FormData | undefined;
  const autoSave = useAutoSave({ estateDocId, section: 'additional' });

  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(additionalSchema),
    defaultValues: {
      finalRestingPlace: existing?.finalRestingPlace,
      customClauseText: existing?.customClauseText ?? '',
      otherWishes: existing?.otherWishes ?? [],
      organDonation: existing?.organDonation ?? false,
    },
  });

  const values = watch();
  const [newWish, setNewWish] = useState('');

  useEffect(() => {
    autoSave.save(values);
  }, [values.finalRestingPlace, values.customClauseText, values.organDonation, JSON.stringify(values.otherWishes)]);

  const addWish = () => {
    const trimmed = newWish.trim();
    if (!trimmed) return;
    const current = values.otherWishes ?? [];
    setValue('otherWishes', [...current, trimmed]);
    setNewWish('');
  };

  const removeWish = (index: number) => {
    const current = values.otherWishes ?? [];
    setValue('otherWishes', current.filter((_, i) => i !== index));
  };

  const onSubmit = (data: FormData) => {
    autoSave.saveNow(data);
    onNext();
  };

  return (
    <StepLayout
      title="Additional Wishes"
      description="Optional instructions about your final resting place, special wishes, and other preferences."
      onNext={handleSubmit(onSubmit)}
      onPrev={onPrev}
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      saveStatus={autoSave.status}
    >
      <div className="space-y-8">
        {/* Section 1: Final Resting Place — 6 card options (v6 OptionCard) */}
        <div>
          <h3 className="ifw-section-title">Final Resting Place</h3>
          <p className="text-xs text-[var(--ifw-text-muted)] mb-3">
            Choose your preference. These wishes are not legally binding but guide your family.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RESTING_PLACE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className="ifw-option-card text-left"
                data-selected={values.finalRestingPlace === opt.key}
                onClick={() => setValue('finalRestingPlace', opt.key as FormData['finalRestingPlace'])}
              >
                <span className="ifw-option-icon text-xl flex-shrink-0">{opt.icon}</span>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-xs text-[var(--ifw-text-muted)]">{opt.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Organ Donation */}
        <div className="flex items-start gap-3">
          <input
            id="ad-organ"
            type="checkbox"
            {...register('organDonation')}
            className="mt-1 h-4 w-4 rounded border-[var(--ifw-neutral-300)]"
          />
          <label htmlFor="ad-organ" className="text-sm">
            <span className="font-medium">Organ Donation</span>
            <p className="text-[var(--ifw-text-muted)] text-xs mt-0.5">
              I wish to donate my organs and tissues for transplantation or medical research.
            </p>
          </label>
        </div>

        {/* Section 3: Custom Clause (v6 CustomClauseCard) */}
        <div>
          <h3 className="ifw-section-title">Custom Clause</h3>
          <p className="text-xs text-[var(--ifw-text-muted)] mb-2">
            Add any additional instructions or clauses you'd like included in your will.
          </p>
          <textarea
            {...register('customClauseText')}
            rows={5}
            className="ifw-input resize-y"
            style={{ minHeight: '140px' }}
            placeholder="Enter your custom clause here..."
          />
        </div>

        {/* Section 4: Other Wishes — dynamic list (v6 WishList pattern) */}
        <div>
          <h3 className="ifw-section-title">Other Wishes</h3>
          <p className="text-xs text-[var(--ifw-text-muted)] mb-2">
            Add any other wishes or instructions you'd like to include.
          </p>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newWish}
              onChange={(e) => setNewWish(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addWish())}
              className="ifw-input flex-1"
              placeholder="Enter a wish and press Add"
            />
            <button
              type="button"
              onClick={addWish}
              disabled={!newWish.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--ifw-primary-500)] text-[var(--ifw-primary-text)] hover:bg-[var(--ifw-primary-hover)] disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>

          {(values.otherWishes ?? []).length > 0 && (
            <ul className="space-y-1.5">
              {(values.otherWishes ?? []).map((wish, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--ifw-neutral-100)] text-sm"
                >
                  <span className="min-w-0 truncate">{wish}</span>
                  <button
                    type="button"
                    onClick={() => removeWish(i)}
                    className="text-xs text-[var(--ifw-error)] hover:underline flex-shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Info box */}
        <div className="ifw-info-box">
          <strong>Why do we ask?</strong> While these wishes are not legally enforceable, they provide
          valuable guidance to your family and executor about your personal preferences during a
          difficult time. You can always update these later.
        </div>
      </div>
    </StepLayout>
  );
}
