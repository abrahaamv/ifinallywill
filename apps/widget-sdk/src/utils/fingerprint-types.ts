/**
 * FingerprintJS Result Types
 * Local types to avoid dependency on @platform/shared
 */

export interface FingerprintResult {
  visitorId: string;
  requestId: string;
  confidence: {
    score: number;
    comment?: string;
  };
  browserDetails: {
    browserName: string;
    browserVersion: string;
    os: string;
    osVersion: string;
    device: string;
  };
  incognito: boolean;
}
