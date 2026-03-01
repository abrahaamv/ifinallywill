/**
 * Demo Document Store — localStorage-backed will data persistence
 *
 * Provides CRUD for estate documents and will data when no backend is connected.
 * All functions are synchronous (localStorage). Types reuse lib/types.ts interfaces.
 */

import type { DocumentStatus, DocumentType, WillData } from '../lib/types';
import { getAllSteps } from '../lib/wizard';
import type { WizardContext } from '../lib/wizard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DemoDocument {
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

export interface DemoKeyPerson {
  id: string;
  fullName: string;
  relationship: string;
  dateOfBirth?: string | null;
}

export interface DemoAsset {
  id: string;
  name: string;
  category: string;
}

interface DemoStore {
  documents: DemoDocument[];
  willData: Record<string, WillData>;
  keyPeople: DemoKeyPerson[];
  assets: DemoAsset[];
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'ifw_demo_store';

function load(): DemoStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DemoStore;
  } catch {
    // corrupt data — reset
    localStorage.removeItem(STORAGE_KEY);
  }
  return { documents: [], willData: {}, keyPeople: [], assets: [] };
}

function persist(store: DemoStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// ---------------------------------------------------------------------------
// Document CRUD
// ---------------------------------------------------------------------------

export function listDocuments(): DemoDocument[] {
  return load().documents;
}

export function getDocument(id: string): DemoDocument | null {
  return load().documents.find((d) => d.id === id) ?? null;
}

export function createDocument(
  documentType: DocumentType,
  province: string,
  userId?: string
): DemoDocument {
  const store = load();
  const now = new Date().toISOString();
  const doc: DemoDocument = {
    id: crypto.randomUUID(),
    userId: userId ?? 'demo',
    documentType,
    province,
    country: 'CA',
    status: 'draft',
    completionPct: 0,
    createdAt: now,
    updatedAt: now,
  };
  store.documents.push(doc);
  store.willData[doc.id] = {};
  persist(store);
  return doc;
}

// ---------------------------------------------------------------------------
// Will Data
// ---------------------------------------------------------------------------

export function getWillData(docId: string): WillData {
  return load().willData[docId] ?? {};
}

export function saveWillDataSection(
  docId: string,
  section: string,
  data: unknown
): void {
  const store = load();
  if (!store.willData[docId]) {
    store.willData[docId] = {};
  }
  (store.willData[docId] as Record<string, unknown>)[section] = data;
  // Update document timestamp
  const doc = store.documents.find((d) => d.id === docId);
  if (doc) {
    doc.updatedAt = new Date().toISOString();
    if (doc.status === 'draft') doc.status = 'in_progress';
  }
  persist(store);
}

export function markStepComplete(docId: string, stepId: string): void {
  const store = load();
  if (!store.willData[docId]) {
    store.willData[docId] = {};
  }
  const wd = store.willData[docId]!;
  const completed = wd.completedSteps ?? [];
  if (!completed.includes(stepId)) {
    wd.completedSteps = [...completed, stepId];
  }
  persist(store);
}

export function updateCompletionPct(docId: string, ctx: WizardContext): void {
  const store = load();
  const doc = store.documents.find((d) => d.id === docId);
  const wd = store.willData[docId];
  if (!doc || !wd) return;

  const all = getAllSteps(ctx);
  const completed = new Set(wd.completedSteps ?? []);
  const done = all.filter((s) => completed.has(s.id)).length;
  doc.completionPct = all.length > 0 ? Math.round((done / all.length) * 100) : 0;
  doc.status = doc.completionPct === 100 ? 'complete' : doc.completionPct > 0 ? 'in_progress' : 'draft';
  doc.updatedAt = new Date().toISOString();
  persist(store);
}

// ---------------------------------------------------------------------------
// Key People
// ---------------------------------------------------------------------------

export function getKeyPeople(): DemoKeyPerson[] {
  return load().keyPeople;
}

export function addKeyPerson(person: Omit<DemoKeyPerson, 'id'>): DemoKeyPerson {
  const store = load();
  const entry: DemoKeyPerson = { id: crypto.randomUUID(), ...person };
  store.keyPeople.push(entry);
  persist(store);
  return entry;
}

export function removeKeyPerson(id: string): void {
  const store = load();
  store.keyPeople = store.keyPeople.filter((p) => p.id !== id);
  persist(store);
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export function getAssets(): DemoAsset[] {
  return load().assets;
}

export function addAsset(asset: Omit<DemoAsset, 'id'>): DemoAsset {
  const store = load();
  const entry: DemoAsset = { id: crypto.randomUUID(), ...asset };
  store.assets.push(entry);
  persist(store);
  return entry;
}

export function removeAsset(id: string): void {
  const store = load();
  store.assets = store.assets.filter((a) => a.id !== id);
  persist(store);
}

// ---------------------------------------------------------------------------
// Utility — ensure a default document exists for demo mode
// ---------------------------------------------------------------------------

export function ensureDefaultDocument(userId?: string): DemoDocument {
  const docs = listDocuments();
  if (docs.length > 0) return docs[0]!;
  return createDocument('primary_will', 'ON', userId);
}
