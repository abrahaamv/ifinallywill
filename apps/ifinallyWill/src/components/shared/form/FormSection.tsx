/**
 * FormSection — Grouped form section wrapper.
 *
 * Renders a card-like container with an optional title and description,
 * used to visually separate logical groups of form fields within a step.
 */

import type { ReactNode } from 'react';

export interface FormSectionProps {
  /** Section heading displayed at the top of the card */
  title?: string;
  /** Optional description rendered below the title */
  description?: string;
  /** Form fields or any child content */
  children: ReactNode;
  /** Extra CSS class names appended to the outer container */
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <section
      className={[
        'rounded-xl border border-[var(--ifw-border)] bg-[var(--ifw-surface)] p-5',
        'shadow-[var(--ifw-shadow-sm)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-base font-semibold text-[var(--ifw-text)]">{title}</h3>}
          {description && (
            <p className="text-sm text-[var(--ifw-neutral-500)] mt-1">{description}</p>
          )}
        </div>
      )}

      <div className="space-y-4">{children}</div>
    </section>
  );
}
