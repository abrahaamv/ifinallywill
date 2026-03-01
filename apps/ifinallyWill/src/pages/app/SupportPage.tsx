/**
 * Support page — FAQ, contact form, and Wilfred CTA
 */

import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  HelpCircle,
  MessageCircle,
  Send,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { submitContactForm } from '../../utils/contact';

const FAQS = [
  {
    q: 'How do I edit my will after completing it?',
    a: 'Go to your Dashboard and click on your will document. You can edit any section at any time. Your changes are auto-saved, and you can regenerate your documents when ready.',
  },
  {
    q: 'How do I add a beneficiary?',
    a: 'Navigate to the "Key People" or "Bequests" step in your will wizard. You can add beneficiaries and specify what they will receive.',
  },
  {
    q: 'Can I create multiple documents?',
    a: 'Yes! From your Dashboard, you can create a Primary Will, Secondary Will (Ontario/BC), Power of Attorney for Property, and Power of Attorney for Personal Care.',
  },
  {
    q: 'How do I download my completed documents?',
    a: 'Once you complete all steps and purchase your package, go to your Dashboard and click "Download" next to your document. You\'ll receive a PDF ready for printing and signing.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. We use bank-level encryption (AES-256) and store all data in Canadian data centres. Your information is never shared with third parties.',
  },
  {
    q: 'How do I properly sign my will?',
    a: 'Print your documents and sign in the presence of two witnesses who are not beneficiaries. Your witnesses must also sign. Detailed instructions are included with your documents.',
  },
  {
    q: 'Can I get a refund?',
    a: "Yes, we offer a 60-day money-back guarantee. Contact our support team and we'll process your refund.",
  },
  {
    q: 'What happens if I need legal advice?',
    a: 'While our platform helps you create legally valid documents, we recommend consulting a lawyer for complex estates. Our AI assistant Wilfred can also help explain legal concepts.',
  },
];

export function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ message: '', email: '' });
  const [submitStatus, setSubmitStatus] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });

  const [isSending, setIsSending] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await submitContactForm({
        fullName: '',
        email: contactForm.email,
        message: contactForm.message,
      });
      setSubmitStatus({
        show: true,
        type: 'success',
        message: "Your message has been sent. We'll get back to you within 24 hours.",
      });
      setContactForm({ message: '', email: '' });
    } catch {
      setSubmitStatus({
        show: true,
        type: 'error',
        message: 'Failed to send message. Please try again.',
      });
    } finally {
      setIsSending(false);
      setTimeout(() => setSubmitStatus((p) => ({ ...p, show: false })), 5000);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Help & Support</h1>
        <p className="mt-1 text-sm text-[var(--ifw-text-muted)]">
          Find answers to common questions or reach out to our team.
        </p>
      </div>

      {/* Wilfred CTA Card */}
      <div className="mb-8 rounded-xl border-2 border-brand-gold/30 bg-gradient-to-r from-brand-gold/5 to-brand-gold/10 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy text-xl text-white">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-brand-navy">Chat with Wilfred</h2>
            <p className="mt-1 text-sm text-[var(--ifw-text-muted)]">
              Our AI assistant can answer your questions about estate planning, explain legal terms,
              and help you fill out forms — instantly.
            </p>
            <p className="mt-2 text-xs text-[var(--ifw-text-muted)]">
              Look for the chat button in the bottom-right corner of any page.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mb-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <HelpCircle className="h-5 w-5 text-[var(--ifw-primary-700)]" />
          Frequently Asked Questions
        </h2>
        <div className="border border-[var(--ifw-border)] rounded-xl divide-y divide-[var(--ifw-border)]">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium hover:bg-[var(--ifw-neutral-50)] transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 text-[var(--ifw-text-muted)] transition-transform ${
                    openFaq === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-[var(--ifw-text-muted)] leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Form */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Still Need Help?</h2>
        <div className="border border-[var(--ifw-border)] rounded-xl p-6">
          {submitStatus.show && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
                submitStatus.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {submitStatus.type === 'success' ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {submitStatus.message}
            </div>
          )}

          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div>
              <label htmlFor="support-email" className="block text-sm font-medium mb-1">
                Your Email
              </label>
              <input
                id="support-email"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                required
                placeholder="you@example.com"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-500)]"
              />
            </div>
            <div>
              <label htmlFor="support-message" className="block text-sm font-medium mb-1">
                How can we help?
              </label>
              <textarea
                id="support-message"
                value={contactForm.message}
                onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                required
                rows={4}
                placeholder="Describe your question or issue..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-500)]"
              />
            </div>
            <button
              type="submit"
              disabled={isSending}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--ifw-primary-700)' }}
            >
              <Send className="h-4 w-4" />
              {isSending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>

      {/* External Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/help-centre"
          className="flex items-center gap-3 border border-[var(--ifw-border)] rounded-xl p-4 hover:border-[var(--ifw-primary-500)] transition-colors"
        >
          <HelpCircle className="h-5 w-5 text-[var(--ifw-primary-700)]" />
          <div>
            <div className="text-sm font-medium">Full Help Centre</div>
            <div className="text-xs text-[var(--ifw-text-muted)]">Browse all categories</div>
          </div>
          <ExternalLink className="h-3.5 w-3.5 ml-auto text-[var(--ifw-text-muted)]" />
        </Link>
        <Link
          to="/contact"
          className="flex items-center gap-3 border border-[var(--ifw-border)] rounded-xl p-4 hover:border-[var(--ifw-primary-500)] transition-colors"
        >
          <MessageCircle className="h-5 w-5 text-[var(--ifw-primary-700)]" />
          <div>
            <div className="text-sm font-medium">Contact Us</div>
            <div className="text-xs text-[var(--ifw-text-muted)]">Send us a detailed message</div>
          </div>
          <ExternalLink className="h-3.5 w-3.5 ml-auto text-[var(--ifw-text-muted)]" />
        </Link>
      </div>
    </div>
  );
}
