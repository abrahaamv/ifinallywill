/**
 * Registration wizard state management
 * Persists to localStorage so users don't lose progress on refresh
 */

import { useCallback, useState } from 'react';

export interface RegistrationData {
  planType: 'individual' | 'couples' | null;
  province: string;
  selectedDocuments: string[];
  email: string;
  password: string;
  fullName: string;
}

const STORAGE_KEY = 'ifw-registration';
const TOTAL_STEPS = 5;

function loadState(): { step: number; data: RegistrationData } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    step: 0,
    data: {
      planType: null,
      province: '',
      selectedDocuments: [],
      email: '',
      password: '',
      fullName: '',
    },
  };
}

function saveState(step: number, data: RegistrationData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
}

export function useRegistrationWizard() {
  const initial = loadState();
  const [step, setStep] = useState(initial.step);
  const [data, setData] = useState<RegistrationData>(initial.data);

  const updateData = useCallback(
    (partial: Partial<RegistrationData>) => {
      setData((prev) => {
        const next = { ...prev, ...partial };
        saveState(step, next);
        return next;
      });
    },
    [step],
  );

  const nextStep = useCallback(() => {
    setStep((prev) => {
      const next = Math.min(prev + 1, TOTAL_STEPS - 1);
      saveState(next, data);
      return next;
    });
  }, [data]);

  const prevStep = useCallback(() => {
    setStep((prev) => {
      const next = Math.max(prev - 1, 0);
      saveState(next, data);
      return next;
    });
  }, [data]);

  const goToStep = useCallback(
    (target: number) => {
      setStep(target);
      saveState(target, data);
    },
    [data],
  );

  const clearWizard = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStep(0);
    setData({
      planType: null,
      province: '',
      selectedDocuments: [],
      email: '',
      password: '',
      fullName: '',
    });
  }, []);

  return {
    step,
    data,
    totalSteps: TOTAL_STEPS,
    updateData,
    nextStep,
    prevStep,
    goToStep,
    clearWizard,
    isFirst: step === 0,
    isLast: step === TOTAL_STEPS - 1,
  };
}
