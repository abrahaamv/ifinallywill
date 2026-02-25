/**
 * Profile switching hook — manages current profile in couples workflow
 *
 * Tracks which profile is active, available profiles derived from will data,
 * and localStorage persistence for the selected profile.
 */

import { useState, useCallback, useMemo } from 'react';
import { isSharedStep } from '../lib/wizard';

const STORAGE_KEY = 'ifw-current-profile';

export interface Profile {
  email: string;
  name: string;
  docId: string;
  documentType: string;
}

interface UseProfileSwitchingOptions {
  currentDocId: string;
  ownerName: string;
  ownerEmail?: string;
  coupleDocId?: string | null;
  coupleName?: string;
  coupleEmail?: string;
}

export function useProfileSwitching({
  currentDocId,
  ownerName,
  ownerEmail,
  coupleDocId,
  coupleName,
  coupleEmail,
}: UseProfileSwitchingOptions) {
  const [currentProfile, setCurrentProfile] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? ownerEmail ?? currentDocId;
    } catch {
      return ownerEmail ?? currentDocId;
    }
  });

  const availableProfiles = useMemo((): Profile[] => {
    const profiles: Profile[] = [
      {
        email: ownerEmail ?? currentDocId,
        name: ownerName,
        docId: currentDocId,
        documentType: 'primary_will',
      },
    ];

    if (coupleDocId) {
      profiles.push({
        email: coupleEmail ?? coupleDocId,
        name: coupleName ?? 'Partner',
        docId: coupleDocId,
        documentType: 'primary_will',
      });
    }

    return profiles;
  }, [currentDocId, ownerName, ownerEmail, coupleDocId, coupleName, coupleEmail]);

  const switchProfile = useCallback(
    (email: string) => {
      setCurrentProfile(email);
      try {
        localStorage.setItem(STORAGE_KEY, email);
      } catch {
        // ignore
      }
    },
    [],
  );

  const activeProfile = useMemo(
    () => availableProfiles.find((p) => p.email === currentProfile) ?? availableProfiles[0],
    [availableProfiles, currentProfile],
  );

  const isCurrentStepShared = useCallback(
    (stepId: string): boolean => isSharedStep(stepId),
    [],
  );

  return {
    currentProfile,
    activeProfile,
    availableProfiles,
    switchProfile,
    isMultiProfile: availableProfiles.length > 1,
    isCurrentStepShared,
  };
}
