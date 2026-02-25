/**
 * Registration wizard state management
 * Persists to localStorage so users don't lose progress on refresh.
 * Step count is dynamic — computed from getRegistrationSteps() based on current data.
 */

import { useCallback, useMemo, useState } from 'react';
import { getRegistrationSteps } from '../lib/registrationSteps';

// ---------------------------------------------------------------------------
// Data model — matches the v6 registration flow
// ---------------------------------------------------------------------------

export interface RegistrationData {
  // Location
  city: string;
  province: string;
  country: string;

  // Name
  first_name: string;
  middle_name: string;
  last_name: string;
  common_name: string;
  phone_number: string;
  gender: string;

  // Secondary will
  wants_secondary_will: boolean | null;

  // POA
  wants_poa: boolean | null;
  poa_type: 'property' | 'health' | 'both' | 'none' | null;

  // Partner
  has_partner: 'yes' | 'no' | '';
  marital_status: 'married' | 'commonLaw' | 'single' | '';
  partner_first_name: string;
  partner_middle_name: string;
  partner_last_name: string;
  partner_common_name: string;
  partner_email: string;
  partner_phone: string;
  partner_same_address: boolean;
  partner_city: string;
  partner_province: string;
  partner_country: string;
  partner_gender: string;

  // Planning together
  wants_spousal_package: boolean | null;

  // Package selection
  selected_package: number | null;
  package_price: number;
  package_name: string;
  skip_package_selection: boolean;
  from_couples_plan_selection: boolean;

  // Account
  email: string;
  password: string;
  password_confirmation: string;
  is_google_user: boolean;
  google_id: string;

  // Payment
  payment_status: string;
  payment_intent_id: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_DATA: RegistrationData = {
  // Location
  city: '',
  province: '',
  country: 'Canada',

  // Name
  first_name: '',
  middle_name: '',
  last_name: '',
  common_name: '',
  phone_number: '',
  gender: '',

  // Secondary will
  wants_secondary_will: null,

  // POA
  wants_poa: null,
  poa_type: null,

  // Partner
  has_partner: '',
  marital_status: '',
  partner_first_name: '',
  partner_middle_name: '',
  partner_last_name: '',
  partner_common_name: '',
  partner_email: '',
  partner_phone: '',
  partner_same_address: true,
  partner_city: '',
  partner_province: '',
  partner_country: 'Canada',
  partner_gender: '',

  // Planning together
  wants_spousal_package: null,

  // Package selection
  selected_package: null,
  package_price: 0,
  package_name: '',
  skip_package_selection: false,
  from_couples_plan_selection: false,

  // Account
  email: '',
  password: '',
  password_confirmation: '',
  is_google_user: false,
  google_id: '',

  // Payment
  payment_status: '',
  payment_intent_id: '',
};

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'ifw-registration';

function loadState(): { step: number; data: RegistrationData } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { step: number; data: Partial<RegistrationData> };
      // Merge with defaults so newly-added fields are always present
      return { step: parsed.step, data: { ...DEFAULT_DATA, ...parsed.data } };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { step: 0, data: { ...DEFAULT_DATA } };
}

function saveState(step: number, data: RegistrationData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * `updateData` accepts either:
 *  - a partial object:  updateData({ province: 'Ontario', city: 'Toronto' })
 *  - a key-value pair:  updateData('province', 'Ontario')
 *
 * The key-value overload mirrors the v6 `setData(key, value)` API.
 */
type UpdateDataFn = {
  (partial: Partial<RegistrationData>): void;
  <K extends keyof RegistrationData>(key: K, value: RegistrationData[K]): void;
};

export function useRegistrationWizard() {
  const initial = loadState();
  const [step, setStep] = useState(initial.step);
  const [data, setData] = useState<RegistrationData>(initial.data);

  // Dynamic step list derived from current data
  const steps = useMemo(() => getRegistrationSteps(data), [data]);

  // totalSteps excludes the welcome step (index 0)
  const totalSteps = useMemo(() => {
    const progressSteps = steps.filter((s) => s.showProgress);
    return progressSteps.length;
  }, [steps]);

  const updateData: UpdateDataFn = useCallback(
    (
      partialOrKey: Partial<RegistrationData> | keyof RegistrationData,
      value?: RegistrationData[keyof RegistrationData],
    ) => {
      setData((prev) => {
        const partial: Partial<RegistrationData> =
          typeof partialOrKey === 'string'
            ? ({ [partialOrKey]: value } as Partial<RegistrationData>)
            : partialOrKey;
        const next = { ...prev, ...partial };
        saveState(step, next);
        return next;
      });
    },
    [step],
  );

  const nextStep = useCallback(() => {
    setStep((prev) => {
      const next = Math.min(prev + 1, steps.length - 1);
      saveState(next, data);
      return next;
    });
  }, [data, steps.length]);

  const prevStep = useCallback(() => {
    setStep((prev) => {
      const next = Math.max(prev - 1, 0);
      saveState(next, data);
      return next;
    });
  }, [data]);

  const goToStep = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(target, steps.length - 1));
      setStep(clamped);
      saveState(clamped, data);
    },
    [data, steps.length],
  );

  const clearWizard = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStep(0);
    setData({ ...DEFAULT_DATA });
  }, []);

  return {
    step,
    data,
    steps,
    totalSteps,
    updateData,
    nextStep,
    prevStep,
    goToStep,
    clearWizard,
    isFirst: step === 0,
    isLast: step === steps.length - 1,
  };
}
