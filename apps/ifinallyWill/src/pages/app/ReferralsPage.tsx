/**
 * Referrals — invite friends & earn rewards
 */

import { Copy, Gift, Share2, Users } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';

export function ReferralsPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = `IFW-${(user?.id ?? 'DEMO').slice(0, 6).toUpperCase()}`;
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink]);

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
            Referrals
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2" style={{ color: '#0A1E86' }}>
            Invite Friends & Earn Rewards
          </h1>
          <p className="text-base sm:text-lg" style={{ color: '#061254' }}>
            Share iFinallyWill with friends and family. You both save.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-6">
        {/* Referral link card */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-[var(--ifw-neutral-900)] mb-1">Your Referral Link</h2>
          <p className="text-sm text-[var(--ifw-neutral-500)] mb-4">
            Share this link with anyone. When they sign up and complete their will, you both get $10 off.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-[var(--ifw-neutral-700)] font-mono truncate">
              {referralLink}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
              style={{ backgroundColor: '#FFBF00', color: '#0C1F3C' }}
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-[var(--ifw-neutral-400)]">Your code:</span>
            <span className="text-xs font-bold text-[var(--ifw-primary-700)] bg-[var(--ifw-primary-50)] px-2 py-0.5 rounded">
              {referralCode}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Friends Invited', value: '0', icon: Users },
            { label: 'Signed Up', value: '0', icon: Share2 },
            { label: 'Rewards Earned', value: '$0', icon: Gift },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-200 text-center">
              <stat.icon className="h-6 w-6 mx-auto mb-2 text-[var(--ifw-primary-500)]" />
              <div className="text-2xl font-bold text-[var(--ifw-neutral-900)]">{stat.value}</div>
              <div className="text-xs text-[var(--ifw-neutral-500)] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-[var(--ifw-neutral-900)] mb-4">How It Works</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Share your link', desc: 'Send your unique referral link to friends and family.' },
              { step: '2', title: 'They sign up', desc: 'Your friend creates an account using your link.' },
              { step: '3', title: 'You both save', desc: 'When they complete their will, you both get $10 off your next purchase.' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: '#FFBF00', color: '#0C1F3C' }}
                >
                  {item.step}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--ifw-neutral-900)]">{item.title}</div>
                  <div className="text-sm text-[var(--ifw-neutral-500)]">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
