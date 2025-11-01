/**
 * FingerprintJS Client Integration
 * Device fingerprinting for widget abuse prevention
 */

// import FingerprintJS from '@fingerprintjs/fingerprintjs-pro'; // TODO: Add dependency when implementing Phase 11
import type { FingerprintResult } from '@platform/shared';

let fpPromise: Promise<any> | null = null;

/**
 * Initialize FingerprintJS
 * Lazy-loaded on first use
 */
function initFingerprint(): Promise<any> {
  if (!fpPromise) {
    // TODO: Re-enable when FingerprintJS dependency is added
    // const apiKey = import.meta.env.VITE_FINGERPRINT_API_KEY;

    // Return mock fingerprint for development
    fpPromise = Promise.resolve({
      get: () =>
        Promise.resolve({
          visitorId: 'dev-visitor-id',
          requestId: 'dev-request-id',
          confidence: { score: 1.0 },
          browserDetails: {
            browserName: 'Chrome',
            browserVersion: '120.0',
            os: 'Linux',
            osVersion: '6.0',
            device: 'Desktop',
          },
          incognito: false,
        }),
    });
  }

  return fpPromise;
}

/**
 * Get device fingerprint
 * @returns Visitor ID and full fingerprint result
 */
export async function getDeviceFingerprint(): Promise<{
  visitorId: string;
  result: FingerprintResult;
}> {
  try {
    const fp = await initFingerprint();
    const result = await fp.get();

    return {
      visitorId: result.visitorId,
      result: result as FingerprintResult,
    };
  } catch (error) {
    console.error('Failed to get device fingerprint:', error);

    // Return fallback fingerprint in case of error
    return {
      visitorId: `fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      result: {
        visitorId: 'fallback',
        requestId: 'fallback',
        confidence: { score: 0.0, comment: 'Fingerprint service unavailable' },
        browserDetails: {
          browserName: 'Unknown',
          browserVersion: 'Unknown',
          os: 'Unknown',
          osVersion: 'Unknown',
          device: 'Unknown',
        },
        incognito: false,
      },
    };
  }
}

/**
 * Get just the visitor ID (simplified)
 * @returns Visitor ID string
 */
export async function getVisitorId(): Promise<string> {
  const { visitorId } = await getDeviceFingerprint();
  return visitorId;
}

/**
 * Check if fingerprinting is available
 * @returns true if FingerprintJS is configured
 */
export function isFingerprintingEnabled(): boolean {
  return !!import.meta.env.VITE_FINGERPRINT_API_KEY;
}

/**
 * Preload fingerprinting (optional optimization)
 * Call this early in the widget lifecycle
 */
export function preloadFingerprint(): void {
  if (isFingerprintingEnabled()) {
    initFingerprint().catch((error) => {
      console.warn('Failed to preload fingerprint:', error);
    });
  }
}
