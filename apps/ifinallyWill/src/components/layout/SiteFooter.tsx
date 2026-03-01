/**
 * SiteFooter — dark navy footer with nav groups
 * Pixel-perfect clone from source SiteFooter.jsx
 * Background: #0C1F3C (brand-navy)
 */

import { Link } from 'react-router-dom';

const DOCUMENTS = [
  { label: 'All Documents', href: '/documents-showcase' },
  { label: 'Primary Wills', href: '/documents-showcase?expand=primary-will' },
  { label: 'Secondary Wills', href: '/documents-showcase?expand=secondary-will' },
  { label: 'Spousal Wills', href: '/documents-showcase?expand=spousal-will' },
  { label: 'POA for Property', href: '/documents-showcase?expand=poa-property' },
  { label: 'POA for Health', href: '/documents-showcase?expand=poa-health' },
] as const;

const COMPANY = [
  { label: 'Compare', href: '/compare' },
  { label: 'Probate', href: '/probate' },
  { label: 'Pet Guardianship', href: '/pet-information-guardian' },
] as const;

const SUPPORT = [
  { label: 'FAQs', href: '/help-centre' },
  { label: 'AI Guidance', href: '/ai-guidance' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
] as const;

function FooterNavGroup({
  title,
  links,
}: { title: string; links: ReadonlyArray<{ label: string; href: string }> }) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/70">{title}</h4>
      <ul className="space-y-2">
        {links.map(({ label, href }) => (
          <li key={href}>
            <Link to={href} className="text-sm text-white/60 transition-colors hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-brand-navy pb-8 pt-10 text-white">
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 sm:grid-cols-2 sm:gap-8 md:grid-cols-4">
        {/* Brand column */}
        <div className="col-span-2 text-center sm:col-span-2 md:col-span-1 md:text-left">
          <div className="mb-3 text-xl font-bold text-white">iFinallyWill</div>
          <p className="text-sm leading-relaxed text-white/60">
            Making estate planning accessible, affordable, and simple for every Canadian family.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/50">
            We&apos;re proud to support every person and family, regardless of their age, race,
            religion, ethnicity, gender identity, or sexual orientation.
          </p>
        </div>

        <FooterNavGroup title="Documents" links={DOCUMENTS} />
        <FooterNavGroup title="Company" links={COMPANY} />

        <div>
          <FooterNavGroup title="Support" links={SUPPORT} />
        </div>
      </div>

      {/* Divider */}
      <div className="relative z-10 mx-auto mt-8 max-w-7xl px-4">
        <div className="h-px w-full bg-white/10" />
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 mx-auto mt-6 flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-white/40 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} iFinallyWill. All rights reserved.</p>
        <div className="flex gap-4">
          <Link to="/privacy" className="transition-colors hover:text-white/70">
            Privacy Policy
          </Link>
          <Link to="/terms" className="transition-colors hover:text-white/70">
            Terms of Service
          </Link>
        </div>
        <p>PIPEDA Compliant</p>
      </div>
    </footer>
  );
}
