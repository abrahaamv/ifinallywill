/**
 * Mock for Node.js perf_hooks module (browser compatibility)
 * Only used when backend code is tree-shaken into frontend bundle
 */

export const performance = {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {},
  clearMarks: () => {},
  clearMeasures: () => {},
  getEntriesByName: () => [],
  getEntriesByType: () => [],
};

export class PerformanceObserver {
  observe() {}
  disconnect() {}
}
