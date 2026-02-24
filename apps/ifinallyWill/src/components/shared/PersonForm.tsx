/**
 * Reusable person entry/edit form (for key_names)
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createKeyNameSchema } from '@platform/api-contract/schemas';
import type { z } from 'zod';

type PersonFormData = z.infer<typeof createKeyNameSchema>;

const RELATIONSHIPS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'parent', label: 'Parent' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'nibling', label: 'Niece/Nephew' },
  { value: 'pibling', label: 'Aunt/Uncle' },
  { value: 'cousin', label: 'Cousin' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Other' },
];

interface Props {
  defaultValues?: Partial<PersonFormData>;
  onSubmit: (data: PersonFormData) => void;
  onCancel: () => void;
  isPending?: boolean;
  submitLabel?: string;
}

export function PersonForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  submitLabel = 'Save',
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonFormData>({
    resolver: zodResolver(createKeyNameSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      relationship: 'other',
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pf-firstName" className="block text-sm font-medium mb-1">
            First Name *
          </label>
          <input
            id="pf-firstName"
            {...register('firstName')}
            className="ifw-input"
          />
          {errors.firstName && (
            <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="pf-lastName" className="block text-sm font-medium mb-1">
            Last Name *
          </label>
          <input
            id="pf-lastName"
            {...register('lastName')}
            className="ifw-input"
          />
          {errors.lastName && (
            <p className="text-xs text-[var(--ifw-error)] mt-1">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="pf-relationship" className="block text-sm font-medium mb-1">
          Relationship *
        </label>
        <select
          id="pf-relationship"
          {...register('relationship')}
          className="ifw-input"
        >
          {RELATIONSHIPS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pf-email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="pf-email"
            type="email"
            {...register('email')}
            className="ifw-input"
          />
        </div>
        <div>
          <label htmlFor="pf-phone" className="block text-sm font-medium mb-1">
            Phone
          </label>
          <input
            id="pf-phone"
            {...register('phone')}
            className="ifw-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pf-city" className="block text-sm font-medium mb-1">
            City
          </label>
          <input
            id="pf-city"
            {...register('city')}
            className="ifw-input"
          />
        </div>
        <div>
          <label htmlFor="pf-province" className="block text-sm font-medium mb-1">
            Province
          </label>
          <input
            id="pf-province"
            {...register('province')}
            className="ifw-input"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-[var(--ifw-neutral-100)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--ifw-primary-500)] text-[var(--ifw-primary-text)] hover:bg-[var(--ifw-primary-hover)] disabled:opacity-40 transition-colors"
        >
          {isPending ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
