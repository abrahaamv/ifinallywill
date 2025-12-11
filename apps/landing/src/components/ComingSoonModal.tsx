/**
 * Coming Soon Modal
 * Shows when users click dashboard/signup/login buttons during investor preview
 */

import { Button } from '@platform/ui';
import { Mail, Sparkles, X } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComingSoonModal({ isOpen, onClose }: ComingSoonModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-3xl bg-[#0c0c0e] border border-white/10 p-8 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-3">
            Coming Q1 2025
          </h2>

          {/* Description */}
          <p className="text-white/50 mb-6 leading-relaxed">
            We're currently in private beta with select partners.
            Sign up for early access or reach out for partnership opportunities.
          </p>

          {/* Beta badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
            </span>
            <span className="text-sm font-medium text-indigo-300">Private Beta</span>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Button
              asChild
              className="w-full h-12 text-[15px] rounded-xl bg-white text-[#08080a] hover:bg-white/90 font-semibold"
            >
              <Link to="/contact">
                <Mail className="w-4 h-4 mr-2" />
                Request Early Access
              </Link>
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full h-11 text-[14px] text-white/50 hover:text-white hover:bg-white/5"
            >
              Continue Exploring
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage Coming Soon modal state
 */
import { useState, useCallback } from 'react';

export function useComingSoonModal() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}
