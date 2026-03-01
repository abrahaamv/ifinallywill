/**
 * Discount Codes — apply and manage promo codes
 */

import { CheckCircle, Tag, Ticket } from 'lucide-react';
import { useCallback, useState } from 'react';

export function DiscountCodesPage() {
  const [code, setCode] = useState('');
  const [appliedCodes, setAppliedCodes] = useState<{ code: string; discount: string; appliedAt: string }[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleApply = useCallback(() => {
    setError('');
    setSuccess('');
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a discount code.');
      return;
    }
    if (appliedCodes.some((c) => c.code === trimmed)) {
      setError('This code has already been applied.');
      return;
    }
    // Demo mode — accept any code as 10% off
    setAppliedCodes((prev) => [
      ...prev,
      { code: trimmed, discount: '10% off', appliedAt: new Date().toLocaleDateString() },
    ]);
    setSuccess(`Code "${trimmed}" applied successfully!`);
    setCode('');
  }, [code, appliedCodes]);

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100%' }}>
      {/* Hero */}
      <div
        className="py-6 sm:py-10 px-4 -mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-6"
        style={{ background: 'linear-gradient(135deg, #FFBF00 0%, #FFD54F 100%)' }}
      >
        <div className="max-w-3xl mx-auto">
          <p
            className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-1 sm:mb-2"
            style={{ color: '#0A1E86', opacity: 0.7 }}
          >
            Discount Codes
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2" style={{ color: '#0A1E86' }}>
            Promo & Discount Codes
          </h1>
          <p className="text-base sm:text-lg" style={{ color: '#061254' }}>
            Enter a code to save on your estate planning services.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* Apply code */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-[var(--ifw-neutral-900)] mb-1 flex items-center gap-2">
            <Tag className="h-5 w-5 text-[var(--ifw-primary-500)]" />
            Apply a Code
          </h2>
          <p className="text-sm text-[var(--ifw-neutral-500)] mb-4">
            Have a discount code from a partner, referral, or promotion? Enter it below.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              placeholder="Enter code (e.g. SAVE20)"
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[var(--ifw-primary-300)] focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-100)] uppercase placeholder:normal-case"
            />
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-all"
              style={{ backgroundColor: '#FFBF00', color: '#0C1F3C' }}
            >
              Apply
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          {success && <p className="text-sm text-green-600 mt-2 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> {success}</p>}
        </div>

        {/* Applied codes */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-[var(--ifw-neutral-900)] mb-4 flex items-center gap-2">
            <Ticket className="h-5 w-5 text-[var(--ifw-primary-500)]" />
            Your Active Codes
          </h2>
          {appliedCodes.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-8 w-8 mx-auto mb-2 text-[var(--ifw-neutral-300)]" />
              <p className="text-sm text-[var(--ifw-neutral-500)]">No discount codes applied yet.</p>
              <p className="text-xs text-[var(--ifw-neutral-400)] mt-1">Enter a code above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appliedCodes.map((c) => (
                <div
                  key={c.code}
                  className="flex items-center justify-between rounded-lg border border-green-100 bg-green-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <span className="text-sm font-bold text-[var(--ifw-neutral-900)] font-mono">{c.code}</span>
                      <span className="ml-2 text-xs text-green-700 font-medium">{c.discount}</span>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--ifw-neutral-400)]">Applied {c.appliedAt}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
