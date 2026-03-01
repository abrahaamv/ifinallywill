/**
 * Partners page — strategic partnership program
 */

import {
  Baby,
  Briefcase,
  Building,
  GraduationCap,
  Heart,
  Home,
  Scale,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PARTNER_CATEGORIES = [
  {
    icon: GraduationCap,
    event: 'Turning 18 — Legal Adulthood Begins',
    partners: [
      'Universities & Colleges',
      'Student Unions',
      'Financial literacy nonprofits',
      'Banks & credit unions',
    ],
    angle: 'Parents lose authority at 18 — planning restores clarity.',
  },
  {
    icon: Heart,
    event: 'Marriage or Long-Term Partnership',
    partners: [
      'Wedding planners & venues',
      'Marriage counsellors',
      'Religious institutions',
      'Mortgage brokers',
    ],
    angle: 'Make the legal side as intentional as the ceremony.',
  },
  {
    icon: Scale,
    event: 'Separation or Divorce',
    partners: [
      'Family law firms',
      'Divorce mediators',
      'Therapists & separation coaches',
      'HR EAP programs',
    ],
    angle: 'Outdated documents cause real damage.',
  },
  {
    icon: Baby,
    event: 'Having a Child',
    partners: [
      'Fertility clinics & OB-GYN practices',
      'Midwives & birthing centres',
      'Parenting platforms',
      'Pediatric organizations',
    ],
    angle: "Guardianship isn't automatic. Planning is protection.",
  },
  {
    icon: Home,
    event: 'Buying a Home or Major Asset',
    partners: [
      'Real estate brokerages',
      'Mortgage brokers',
      'Real estate lawyers',
      'Title insurance companies',
    ],
    angle: 'New assets = new planning risk.',
  },
  {
    icon: Briefcase,
    event: 'Starting or Owning a Business',
    partners: [
      'Accountants & CPA firms',
      'Business lawyers',
      'Chambers of commerce',
      'Startup incubators',
    ],
    angle: "Business continuity doesn't survive bad planning.",
  },
  {
    icon: TrendingUp,
    event: 'Significant Financial Change',
    partners: [
      'Financial advisors',
      'Wealth managers',
      'Banks & private banking',
      'Tax preparation firms',
    ],
    angle: 'Your documents should match your balance sheet.',
  },
  {
    icon: Stethoscope,
    event: 'Health Diagnosis or Injury',
    partners: [
      'Hospitals & health networks',
      'Patient advocacy organizations',
      'Disease-specific charities',
      'Insurance carriers',
    ],
    angle: 'Decisions are easier before a crisis.',
  },
  {
    icon: Users,
    event: 'Caring for Aging Parents',
    partners: [
      "Seniors' organizations",
      'Home care agencies',
      'Retirement communities',
      'Caregiver support nonprofits',
    ],
    angle: 'Support your parents without scrambling.',
  },
  {
    icon: Building,
    event: "It's Been a Few Years",
    partners: [
      'Charities & nonprofits',
      'Employer benefit platforms',
      'Professional associations',
      'Alumni organizations',
    ],
    angle: 'If life has changed, your plan should too.',
  },
] as const;

export function PartnersPublicPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-brand-gold py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-sm font-bold text-white">
              Strategic Partnerships
            </span>
            <h1
              className="mt-6 text-4xl font-extrabold text-brand-blue md:text-5xl"
              style={{ lineHeight: 1.1 }}
            >
              Partner with iFinallyWill
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-brand-ink">
              Strategic partners already possess the two most critical assets: established trust and
              perfect timing. iFinallyWill transforms from a standalone product into an essential
              infrastructure layer that seamlessly integrates into existing partner ecosystems.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="mailto:support@ifinallywill.com?subject=Partnership Inquiry"
                className="rounded-xl bg-brand-blue px-6 py-3 font-bold text-white shadow-lg transition-all hover:bg-brand-navy"
              >
                Become a Partner
              </a>
              <a
                href="#matrix"
                className="rounded-xl border-2 border-brand-blue bg-white px-6 py-3 font-bold text-brand-blue transition-all hover:bg-brand-blue/5"
              >
                View Partner Matrix
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-blue">
              Strategic Approach
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-brand-blue md:text-4xl">
              Scale iFinallyWill Without Paid Ads
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-700">
              Our partnership strategy targets organizations that interact with people during
              critical life events where estate planning intent naturally spikes.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-4xl rounded-2xl border-2 border-brand-gold bg-gradient-to-r from-blue-50 to-yellow-50 p-8">
            <p className="text-lg leading-relaxed text-gray-800">
              Strategic partners already possess the two most critical assets:{' '}
              <strong>established trust</strong> and <strong>perfect timing</strong>. By uniting
              charities, employers, and professional service providers, we create an unbreakable{' '}
              <strong>distribution moat</strong> that scales without traditional advertising.
            </p>
          </div>
        </div>
      </section>

      {/* Partner Matrix */}
      <section id="matrix" className="bg-brand-offwhite py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-blue">
              Target Partners by Life Event
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-brand-blue md:text-4xl">
              Top 10 Partner Categories
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-700">
              Each life event represents a critical moment when estate planning intent naturally
              spikes.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {PARTNER_CATEGORIES.map(({ icon: Icon, event, partners, angle }, idx) => (
              <div
                key={event}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-6 w-6 text-brand-blue" />
                      <h3 className="text-lg font-bold text-brand-blue">{event}</h3>
                    </div>
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="mb-4 space-y-1.5">
                    {partners.map((p) => (
                      <div key={p} className="flex items-start gap-2">
                        <span className="mt-1.5 text-brand-blue">•</span>
                        <span className="text-sm text-gray-700">{p}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border-l-4 border-brand-gold bg-brand-gold/10 p-3">
                    <p className="text-sm font-semibold text-brand-navy">Angle: {angle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-blue py-20 text-center text-white">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-3xl font-extrabold md:text-4xl">
            Ready to Partner with iFinallyWill?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Join forward-thinking organizations already leveraging iFinallyWill to serve their
            audiences at critical life moments.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              href="mailto:support@ifinallywill.com?subject=Partnership Inquiry"
              className="rounded-xl bg-brand-gold px-8 py-4 font-bold text-brand-navy transition-all hover:bg-brand-gold-light"
            >
              Email Partnership Team
            </a>
            <Link
              to="/contact"
              className="rounded-xl border-2 border-white px-8 py-4 font-bold text-white transition-all hover:bg-white/10"
            >
              Contact Form
            </Link>
            <Link
              to="/how-it-works"
              className="rounded-xl border-2 border-white px-8 py-4 font-bold text-white transition-all hover:bg-white/10"
            >
              Learn About iFinallyWill
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
