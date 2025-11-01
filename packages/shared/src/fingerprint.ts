/**
 * Device Fingerprinting Utilities
 * FingerprintJS integration for abuse prevention
 */

/**
 * FingerprintJS configuration
 * Note: This is a client-side only library
 */
export const FINGERPRINT_CONFIG = {
  apiKey: process.env.VITE_FINGERPRINT_API_KEY || '',
  endpoint: 'https://api.fpjs.io',
  region: 'us', // 'us', 'eu', 'ap'
  scriptUrl: 'https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs-pro@3/dist/fp.min.js',
};

/**
 * Fingerprint result interface
 */
export interface FingerprintResult {
  visitorId: string;
  requestId: string;
  confidence: {
    score: number; // 0-1
    comment?: string;
  };
  browserDetails: {
    browserName: string;
    browserVersion: string;
    os: string;
    osVersion: string;
    device: string;
  };
  ipLocation?: {
    city: string;
    country: string;
    continent: string;
    latitude: number;
    longitude: number;
  };
  incognito: boolean;
  bot?: {
    probability: number;
    type?: string;
  };
}

/**
 * Extended fingerprint data with additional metadata
 */
export interface ExtendedFingerprint {
  visitorId: string;
  confidence: number;
  isBot: boolean;
  isIncognito: boolean;
  browserName: string;
  os: string;
  country?: string;
  requestId: string;
}

/**
 * Parse FingerprintJS result into simplified format
 */
export function parseFingerprintResult(result: FingerprintResult): ExtendedFingerprint {
  return {
    visitorId: result.visitorId,
    confidence: result.confidence.score,
    isBot: (result.bot?.probability || 0) > 0.5,
    isIncognito: result.incognito,
    browserName: result.browserDetails.browserName,
    os: result.browserDetails.os,
    country: result.ipLocation?.country,
    requestId: result.requestId,
  };
}

/**
 * Validate fingerprint confidence score
 * @param confidence 0-1 confidence score
 * @returns true if confidence is acceptable (>0.5)
 */
export function isValidFingerprint(confidence: number): boolean {
  return confidence > 0.5;
}

/**
 * Check if fingerprint indicates potential abuse
 */
export function isPotentialAbuse(fingerprint: ExtendedFingerprint): {
  isAbusive: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (fingerprint.isBot) {
    reasons.push('Bot detected');
  }

  if (fingerprint.confidence < 0.3) {
    reasons.push('Low confidence score');
  }

  if (fingerprint.isIncognito) {
    reasons.push('Incognito mode detected');
  }

  return {
    isAbusive: reasons.length > 0,
    reasons,
  };
}

/**
 * Generate a short hash from visitor ID for display
 * @param visitorId Full FingerprintJS visitor ID
 * @returns Short hash (first 8 chars)
 */
export function getShortFingerprint(visitorId: string): string {
  return visitorId.substring(0, 8);
}
