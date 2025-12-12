/**
 * Coming Soon Context for Meeting App
 * Provides a way for child components to trigger the Coming Soon modal
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { ComingSoonModal } from '../components/ComingSoonModal';

interface ComingSoonContextType {
  openModal: () => void;
}

const ComingSoonContext = createContext<ComingSoonContextType | null>(null);

export function ComingSoonProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  return (
    <ComingSoonContext.Provider value={{ openModal }}>
      {children}
      <ComingSoonModal isOpen={isOpen} onClose={closeModal} />
    </ComingSoonContext.Provider>
  );
}

export function useComingSoon() {
  const context = useContext(ComingSoonContext);
  if (!context) {
    throw new Error('useComingSoon must be used within a ComingSoonProvider');
  }
  return context;
}
