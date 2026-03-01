/**
 * Sidebar state hook — collapsed toggle with localStorage persistence
 */

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'ifw-sidebar-collapsed';

/** Steps that auto-collapse the sidebar for more content space */
const AUTO_COLLAPSE_STEPS = new Set(['assets', 'bequests']);

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const expand = useCallback(() => {
    setCollapsed(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'false');
    } catch {
      // ignore
    }
  }, []);

  const collapse = useCallback(() => {
    setCollapsed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  }, []);

  /** Auto-collapse for certain steps (assets, bequests) */
  const autoCollapse = useCallback(
    (stepId: string | null) => {
      if (stepId && AUTO_COLLAPSE_STEPS.has(stepId)) {
        collapse();
      }
    },
    [collapse]
  );

  return { collapsed, toggle, expand, collapse, autoCollapse };
}
