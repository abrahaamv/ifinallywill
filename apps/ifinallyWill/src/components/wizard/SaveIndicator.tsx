/**
 * Auto-save status indicator
 */

import type { SaveStatus } from '../../hooks/useAutoSave';

interface Props {
  status: SaveStatus;
}

const STATUS_CONFIG: Record<SaveStatus, { label: string; color: string }> = {
  idle: { label: '', color: '' },
  saving: { label: 'Saving...', color: 'var(--ifw-neutral-400)' },
  saved: { label: 'Saved', color: 'var(--ifw-success)' },
  error: { label: 'Save failed', color: 'var(--ifw-error)' },
};

export function SaveIndicator({ status }: Props) {
  if (status === 'idle') return null;

  const config = STATUS_CONFIG[status];

  return (
    <span className="text-xs font-medium" style={{ color: config.color }}>
      {config.label}
    </span>
  );
}
