/**
 * Contact Page - Dark Theme
 * Matches the professional design system
 */

import { ArrowRight, Building2, Clock, Mail, MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';
import { Button, Input, Label } from '@platform/ui';
import { useComingSoon } from '../context/ComingSoonContext';

const CONTACT_OPTIONS = [
  {
    icon: Mail,
    title: 'Email Support',
    description: 'For general inquiries and support questions',
    contact: 'support@visualkit.live',
    href: 'mailto:support@visualkit.live',
  },
  {
    icon: Building2,
    title: 'Sales Inquiries',
    description: 'For enterprise plans and custom solutions',
    contact: 'sales@visualkit.live',
    href: 'mailto:sales@visualkit.live',
  },
  {
    icon: Clock,
    title: 'Office Hours',
    description: "We're here to help during business hours",
    contact: 'Mon-Fri: 9AM - 6PM PST',
  },
];

export function ContactPage() {
  const { openModal } = useComingSoon();
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission - integrate with email service
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-white pt-24 pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] right-[15%] w-[500px] h-[500px] bg-indigo-600/[0.05] rounded-full blur-[128px]" />
        <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] bg-purple-600/[0.04] rounded-full blur-[128px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[12px] font-medium text-white/60 mb-6">
            <MessageSquare className="w-3.5 h-3.5" />
            Get in Touch
          </div>
          <h1 className="text-[36px] sm:text-[48px] font-bold tracking-[-0.03em] leading-[1.1] mb-4">
            <span className="text-white">Let's Talk About</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              Your Support Needs
            </span>
          </h1>
          <p className="text-[17px] text-white/50 max-w-xl mx-auto">
            Have questions about Visual AI? Want a demo? We'd love to hear from you.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="rounded-[24px] bg-white/[0.02] border border-white/[0.06] p-8">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                    <Send className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-[20px] font-semibold text-white mb-2">Message Sent!</h3>
                  <p className="text-[15px] text-white/50 mb-6">
                    Thanks for reaching out. We'll get back to you within 24 hours.
                  </p>
                  <Button
                    onClick={() => {
                      setSubmitted(false);
                      setFormState({ name: '', email: '', company: '', message: '' });
                    }}
                    className="bg-white/[0.06] text-white hover:bg-white/[0.1] border border-white/[0.08]"
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-[20px] font-semibold text-white mb-2">Send us a message</h2>
                  <p className="text-[14px] text-white/40 mb-8">
                    Fill out the form below and we'll get back to you within 24 hours.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-[13px] text-white/60">Name *</Label>
                        <Input
                          id="name"
                          value={formState.name}
                          onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                          placeholder="John Doe"
                          required
                          className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-[13px] text-white/60">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formState.email}
                          onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                          placeholder="john@example.com"
                          required
                          className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-[13px] text-white/60">Company</Label>
                      <Input
                        id="company"
                        value={formState.company}
                        onChange={(e) => setFormState({ ...formState, company: e.target.value })}
                        placeholder="Acme Inc."
                        className="h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-[13px] text-white/60">Message *</Label>
                      <textarea
                        id="message"
                        value={formState.message}
                        onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                        placeholder="Tell us about your project and how we can help..."
                        required
                        rows={5}
                        className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-[14px] text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none transition-colors"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-white text-[#08080a] hover:bg-white/90 font-semibold rounded-xl text-[15px]"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Send Message
                          <ArrowRight className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Contact Options */}
          <div className="lg:col-span-2 space-y-4">
            {CONTACT_OPTIONS.map((option) => (
              <div
                key={option.title}
                className="rounded-[20px] bg-white/[0.02] border border-white/[0.06] p-6 hover:bg-white/[0.03] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
                  <option.icon className="w-5 h-5 text-white/60" />
                </div>
                <h3 className="text-[16px] font-semibold text-white mb-1">{option.title}</h3>
                <p className="text-[13px] text-white/40 mb-3">{option.description}</p>
                {option.href ? (
                  <a
                    href={option.href}
                    className="text-[14px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {option.contact}
                  </a>
                ) : (
                  <span className="text-[14px] text-white/60">{option.contact}</span>
                )}
              </div>
            ))}

            {/* Quick CTA */}
            <div className="rounded-[20px] bg-gradient-to-br from-indigo-500/[0.1] to-purple-500/[0.05] border border-indigo-500/20 p-6">
              <h3 className="text-[16px] font-semibold text-white mb-2">Try Visual AI Free</h3>
              <p className="text-[13px] text-white/40 mb-4">
                See screen-sharing AI in action. No credit card required.
              </p>
              <Button
                onClick={openModal}
                className="w-full h-10 bg-white text-[#08080a] hover:bg-white/90 font-semibold rounded-xl text-[14px]"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
