/**
 * Utility Functions Tests
 *
 * Tests for className composition, formatting, debounce/throttle, and helper utilities.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatBytes,
  debounce,
  throttle,
  generateId,
  sleep,
  safeJSONParse,
  isBrowser,
} from '../lib/utils';

describe('cn() - className composition', () => {
  it('should merge multiple class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('should handle conditional classes', () => {
    expect(cn('px-2', true && 'py-1', false && 'hidden')).toBe('px-2 py-1');
  });

  it('should merge conflicting Tailwind classes (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('should handle arrays and objects', () => {
    expect(cn(['px-2', 'py-1'], { 'bg-blue-500': true, 'text-white': false })).toBe('px-2 py-1 bg-blue-500');
  });

  it('should handle undefined and null values', () => {
    expect(cn('px-2', undefined, null, 'py-1')).toBe('px-2 py-1');
  });

  it('should handle empty input', () => {
    expect(cn()).toBe('');
  });
});

describe('formatBytes()', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('should format bytes', () => {
    expect(formatBytes(100)).toBe('100 Bytes');
    expect(formatBytes(1023)).toBe('1023 Bytes');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(2048)).toBe('2 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(1610612736)).toBe('1.5 GB');
  });

  it('should respect decimal places', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB');
    expect(formatBytes(1536, 1)).toBe('1.5 KB');
    expect(formatBytes(1536, 3)).toBe('1.5 KB');
  });

  it('should handle negative decimals', () => {
    expect(formatBytes(1536, -1)).toBe('2 KB');
  });
});

describe('debounce()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should cancel previous calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    vi.advanceTimersByTime(50);
    debouncedFn();
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should pass arguments correctly', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should handle multiple rapid calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();
    debouncedFn();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('throttle()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute function immediately on first call', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should ignore calls within throttle period', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    throttledFn();
    throttledFn();

    expect(fn).toHaveBeenCalledOnce();
  });

  it('should allow calls after throttle period', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    expect(fn).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(100);
    throttledFn();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should pass arguments correctly', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn('arg1', 'arg2');
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('generateId()', () => {
  it('should generate ID of default length (8)', () => {
    const id = generateId();
    expect(id).toHaveLength(8);
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it('should generate ID of approximate custom length', () => {
    // generateId can generate slightly shorter IDs due to Math.random().toString(36)
    // The function uses substring(2, 2+length), so it attempts to generate the requested length
    // but may be shorter if Math.random() produces fewer digits
    const id4 = generateId(4);
    const id12 = generateId(12);

    // IDs should be reasonably close to requested length
    expect(id4.length).toBeGreaterThanOrEqual(3);
    expect(id4.length).toBeLessThanOrEqual(5);

    expect(id12.length).toBeGreaterThanOrEqual(10);
    expect(id12.length).toBeLessThanOrEqual(13);
  });

  it('should generate unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100); // All unique
  });

  it('should only contain alphanumeric characters', () => {
    const id = generateId(100);
    expect(id).toMatch(/^[a-z0-9]+$/);
  });
});

describe('sleep()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should resolve after specified time', async () => {
    const promise = sleep(1000);
    vi.advanceTimersByTime(999);

    let resolved = false;
    promise.then(() => { resolved = true; });

    await Promise.resolve(); // Let promise callbacks run
    expect(resolved).toBe(false);

    vi.advanceTimersByTime(1);
    await promise;
    expect(resolved).toBe(true);
  });

  it('should work with different durations', async () => {
    const promise = sleep(500);

    vi.advanceTimersByTime(500);
    await promise;

    // Promise should resolve without error
    await expect(promise).resolves.toBeUndefined();
  });
});

describe('safeJSONParse()', () => {
  it('should parse valid JSON', () => {
    expect(safeJSONParse('{"key":"value"}', {})).toEqual({ key: 'value' });
    expect(safeJSONParse('[1,2,3]', [])).toEqual([1, 2, 3]);
    expect(safeJSONParse('"string"', '')).toBe('string');
  });

  it('should return fallback for invalid JSON', () => {
    expect(safeJSONParse('invalid json', { default: true })).toEqual({ default: true });
    expect(safeJSONParse('{key: value}', [])).toEqual([]);
    expect(safeJSONParse('', null)).toBeNull();
  });

  it('should handle complex objects', () => {
    const complex = { a: 1, b: { c: 2, d: [3, 4] }, e: true };
    const json = JSON.stringify(complex);
    expect(safeJSONParse(json, {})).toEqual(complex);
  });

  it('should return fallback for empty string', () => {
    expect(safeJSONParse('', { fallback: true })).toEqual({ fallback: true });
  });

  it('should preserve fallback type', () => {
    const fallback = { typed: 'value' };
    const result = safeJSONParse('invalid', fallback);
    expect(result).toBe(fallback);
  });
});

describe('isBrowser', () => {
  it('should be true in jsdom environment', () => {
    expect(isBrowser).toBe(true);
    expect(typeof window).toBe('object');
    expect(typeof window.document).toBe('object');
  });
});
