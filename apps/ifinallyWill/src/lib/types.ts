/**
 * IFinallyWill: Core TypeScript type definitions
 *
 * Typed interfaces for will data, POA data, and related entities.
 * Replaces `Record<string, unknown>` throughout the app.
 */

import type {
  additionalSchema,
  createAssetSchema,
  executorsSchema,
  finalDetailsSchema,
  guardiansSchema,
  keyNameSchema,
  maritalStatusSchema,
  personalInfoSchema,
  petsSchema,
  poaAgentsSchema,
  residueSchema,
  spouseInfoSchema,
  trustingSchema,
  wipeoutSchema,
} from '@platform/api-contract/schemas';
import type { z } from 'zod';

// ---------------------------------------------------------------------------
// Will Data — matches will_data JSONB columns from DB schema
// ---------------------------------------------------------------------------

export type PersonalInfo = z.infer<typeof personalInfoSchema>;
export type SpouseInfo = z.infer<typeof spouseInfoSchema>;
export type ExecutorEntry = z.infer<typeof executorsSchema>[number];
export type Executors = z.infer<typeof executorsSchema>;
export type ResidueData = z.infer<typeof residueSchema>;
export type WipeoutData = z.infer<typeof wipeoutSchema>;
export type TrustEntry = z.infer<typeof trustingSchema>[number];
export type TrustingData = z.infer<typeof trustingSchema>;
export type GuardianEntry = z.infer<typeof guardiansSchema>[number];
export type GuardiansData = z.infer<typeof guardiansSchema>;
export type PetEntry = z.infer<typeof petsSchema>[number];
export type PetsData = z.infer<typeof petsSchema>;
export type AdditionalData = z.infer<typeof additionalSchema>;
export type FinalDetailsData = z.infer<typeof finalDetailsSchema>;
export type MaritalStatus = z.infer<typeof maritalStatusSchema>;

/** Full will data shape — matches will_data DB columns */
export interface WillData {
  personalInfo?: PersonalInfo | null;
  maritalStatus?: MaritalStatus | null;
  spouseInfo?: SpouseInfo | null;
  executors?: Executors | null;
  residue?: ResidueData | null;
  wipeout?: WipeoutData | null;
  trusting?: TrustingData | null;
  guardians?: GuardiansData | null;
  pets?: PetsData | null;
  additional?: AdditionalData | null;
  finalDetails?: FinalDetailsData | null;
  completedSteps?: string[] | null;
}

// ---------------------------------------------------------------------------
// POA Data — matches poa_data DB columns
// ---------------------------------------------------------------------------

export type PoaAgents = z.infer<typeof poaAgentsSchema>;
/** Explicit POA health details — mirrors poaHealthDetailsSchema output */
export interface PoaHealthDetails {
  organDonation: boolean;
  dnr: boolean;
  statements?: {
    terminalCondition?: string;
    unconsciousCondition?: string;
    mentalImpairment?: string;
    violentBehavior?: string;
    painManagement?: string;
    otherDirectives?: string;
  };
}

/** Full POA data shape — matches poa_data DB columns */
export interface PoaData {
  personalInfo?: PersonalInfo | null;
  primaryAgent?: string | null;
  jointAgent?: string | null;
  backupAgents?: string[] | null;
  restrictions?: string | null;
  activationType?: 'immediate' | 'incapacity' | null;
  healthDetails?: PoaHealthDetails | null;
  completedSteps?: string[] | null;
}

// ---------------------------------------------------------------------------
// Key Names (People Pool)
// ---------------------------------------------------------------------------

export type KeyName = z.infer<typeof keyNameSchema>;

export type Relationship =
  | 'spouse'
  | 'child'
  | 'sibling'
  | 'parent'
  | 'grandparent'
  | 'nibling'
  | 'pibling'
  | 'cousin'
  | 'friend'
  | 'other';

// ---------------------------------------------------------------------------
// Assets & Bequests
// ---------------------------------------------------------------------------

export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export interface BequestShare {
  keyNameId: string;
  percentage: number;
}

// ---------------------------------------------------------------------------
// Estate Document
// ---------------------------------------------------------------------------

export type DocumentType = 'primary_will' | 'secondary_will' | 'poa_property' | 'poa_health';
export type DocumentStatus = 'draft' | 'in_progress' | 'complete' | 'expired';

export interface EstateDocument {
  id: string;
  userId: string;
  coupleDocId?: string | null;
  documentType: DocumentType;
  province: string;
  country: string;
  status: DocumentStatus;
  completionPct: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Step Props — used by all wizard step components
// ---------------------------------------------------------------------------

/**
 * Step props for will wizard step components.
 * willData accepts WillData or a generic Record for backward compat.
 */
export interface StepProps {
  estateDocId: string;
  willData: WillData | Record<string, unknown>;
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

/** Alias — prefer StepProps directly */
export type WillStepProps = StepProps;

export interface PoaStepProps {
  estateDocId: string;
  poaData: PoaData | null;
  documentType: 'poa_property' | 'poa_health';
  onNext: () => void;
  onPrev: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}
