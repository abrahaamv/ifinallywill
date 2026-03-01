/**
 * Gift a Will — purchase a will for someone else
 */

import { Gift, Mail, Send } from 'lucide-react';
import { useCallback, useState } from 'react';

export function GiftAWillPage() {
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = useCallback(() => {
    if (!recipientName.trim() || !recipientEmail.trim()) return;
    // Demo mode — just show success
    setSent(true);
  }, [recipientName, recipientEmail]);

  if (sent) {
    return (
      <div style={{ backgroundColor: '#FAFAFA', minHeight: '100%' }}>
        <div
          className="py-6 sm:py-10 px-4 -mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-6"
          style={{ background: 'linear-gradient(135deg, #FFBF00 0%, #FFD54F 100%)' }}
        >
          <div className="max-w-3xl mx-auto">
            <p
              className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-1 sm:mb-2"
              style={{ color: '#0A1E86', opacity: 0.7 }}
            >
              Gift a Will
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2" style={{ color: '#0A1E86' }}>
              Gift Sent!
            </h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 text-center py-12">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #FFBF00, #FFD54F)' }}
          >
            <Gift className="h-8 w-8 text-[#0C1F3C]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--ifw-neutral-900)] mb-2">
            Your gift is on its way!
          </h2>
          <p className="text-sm text-[var(--ifw-neutral-600)] mb-6">
            We've sent an email to <strong>{recipientEmail}</strong> with instructions
            to create their free estate plan.
          </p>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setRecipientName('');
              setRecipientEmail('');
              setMessage('');
            }}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-all"
            style={{ backgroundColor: '#FFBF00', color: '#0C1F3C' }}
          >
            Gift Another Will
          </button>
        </div>
      </div>
    );
  }

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
            Gift a Will
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2" style={{ color: '#0A1E86' }}>
            Give the Gift of Peace of Mind
          </h1>
          <p className="text-base sm:text-lg" style={{ color: '#061254' }}>
            Help a loved one protect their family with a professionally guided estate plan.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-6">
        {/* Gift form */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-[var(--ifw-neutral-900)] mb-4 flex items-center gap-2">
            <Send className="h-5 w-5 text-[var(--ifw-primary-500)]" />
            Send a Gift
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ifw-neutral-700)] mb-1">
                Recipient's Name
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[var(--ifw-primary-300)] focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-100)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ifw-neutral-700)] mb-1">
                Recipient's Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ifw-neutral-400)]" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-[var(--ifw-primary-300)] focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-100)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ifw-neutral-700)] mb-1">
                Personal Message <span className="text-[var(--ifw-neutral-400)]">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="I care about you and want to help you get this important task done..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[var(--ifw-primary-300)] focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-100)] resize-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!recipientName.trim() || !recipientEmail.trim()}
            className="mt-5 w-full rounded-lg px-5 py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FFBF00', color: '#0C1F3C' }}
          >
            Send Gift
          </button>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-[var(--ifw-neutral-900)] mb-4">What They'll Receive</h2>
          <ul className="space-y-3">
            {[
              'Free access to create a complete estate plan',
              'Step-by-step guided will builder',
              'AI-powered legal assistance',
              'Secure document storage and sharing',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[var(--ifw-neutral-600)]">
                <span className="text-green-500 mt-0.5">&#10003;</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
