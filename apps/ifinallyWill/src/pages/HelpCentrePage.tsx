/**
 * Help Centre page — FAQ categories, search, resources, video tutorials,
 * sitemap and CTA. Pixel-perfect TypeScript clone of the source HelpCentre.jsx.
 *
 * LandingLayout provides UnifiedNavbar + SiteFooter, so they are NOT imported here.
 */

import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/* ------------------------------------------------------------------ */
/*  Brand colours                                                      */
/* ------------------------------------------------------------------ */
const colors = {
  blue: '#0A1E86',
  gold: '#FFBF00',
  navy: '#0C1F3C',
  deep: '#081428',
  offwhite: '#F5F5F7',
  ink: '#202020',
} as const;

/* ------------------------------------------------------------------ */
/*  Inline SVG icon helpers                                            */
/* ------------------------------------------------------------------ */

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

function ChevronDownIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SearchIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function XIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ArrowRightIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 8l4 4m0 0l-4 4m4-4H3"
      />
    </svg>
  );
}

function CheckIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function RocketIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 003.46-1.25M15.59 14.37a6 6 0 00-5.84-7.38v4.8m5.84 2.58L12 21.5l-3.59-7.13M12 3a9 9 0 00-9 9h4.8m4.2-9a9 9 0 019 9h-4.8"
      />
    </svg>
  );
}

function ChartBarIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function DocumentTextIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function HeartIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

function ClockIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function UsersIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function SparklesIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

function PlayIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function MailIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function ChatAiIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="9" cy="11.5" r="1" fill="currentColor" />
      <circle cx="12.5" cy="11.5" r="1" fill="currentColor" />
      <circle cx="16" cy="11.5" r="1" fill="currentColor" />
    </svg>
  );
}

function ChatIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

/** Lookup for category icon rendering */
const CATEGORY_ICON_MAP: Record<string, React.FC<IconProps>> = {
  rocket: RocketIcon,
  'chart-bar': ChartBarIcon,
  'shield-check': ShieldCheckIcon,
  'document-text': DocumentTextIcon,
  check: CheckIcon,
  heart: HeartIcon,
  clock: ClockIcon,
  users: UsersIcon,
  sparkles: SparklesIcon,
  play: PlayIcon,
};

function CategoryIcon({ name, className, style }: IconProps & { name: string }) {
  const Comp = CATEGORY_ICON_MAP[name];
  if (!Comp) return <SparklesIcon className={className} style={style} />;
  return <Comp className={className} style={style} />;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface FaqCategory {
  id: string;
  label: string;
  icon: string;
  featured?: boolean;
}

const FAQ_CATEGORIES: FaqCategory[] = [
  { id: 'getting-started', label: 'Getting Started', icon: 'rocket' },
  { id: 'plans-pricing', label: 'Plans & Pricing', icon: 'chart-bar' },
  { id: 'privacy-protection', label: 'Privacy & Data Protection', icon: 'shield-check' },
  { id: 'building-will', label: 'Building Your Will', icon: 'document-text' },
  { id: 'signing-witnessing', label: 'Signing & Witnessing', icon: 'check' },
  { id: 'power-of-attorney', label: 'Power of Attorney', icon: 'shield-check' },
  { id: 'pet-planning', label: 'Pet Planning', icon: 'heart' },
  { id: 'updates-changes', label: 'Updates & Life Changes', icon: 'clock' },
  { id: 'storage-sharing', label: 'Storage & Sharing', icon: 'users' },
  { id: 'billing-refunds', label: 'Billing & Refunds', icon: 'sparkles' },
  { id: 'video-tutorials', label: 'Video Tutorials', icon: 'play' },
];

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_DATA: Record<string, FaqItem[]> = {
  'privacy-protection': [
    {
      q: 'Do you share my personal information with third parties?',
      a: 'ABSOLUTELY NOT. We have a strict zero third-party data sharing policy. Your personal information, estate details, beneficiary information, and all data you provide stays exclusively with iFinallyWill. We never sell, rent, lease, or share your data with any external companies, marketers, or data brokers. Period.',
    },
    {
      q: 'How is my data protected under Canadian law?',
      a: "Your data is protected under PIPEDA (Personal Information Protection and Electronic Documents Act) - Canada's federal privacy law. We are fully compliant with all Canadian privacy regulations. Your information is stored on secure Canadian servers and is subject to Canadian jurisdiction and legal protections.",
    },
    {
      q: 'Who owns my data?',
      a: 'YOU own your data. Always. We are simply custodians of your information while you use our service. You can request to download or delete your data at any time. Your estate planning information belongs to you and your family not to us or anyone else.',
    },
    {
      q: 'Is my financial and personal information encrypted?',
      a: 'Yes. We use bank-level 256-bit SSL encryption for all data transmission and storage. Your sensitive information is encrypted both in transit and at rest. We employ the same security standards used by major financial institutions.',
    },
    {
      q: 'Can iFinallyWill employees see my personal information?',
      a: 'We maintain strict internal policies to protect your privacy.',
    },
    {
      q: 'What happens to my data if I cancel my account?',
      a: "Upon account cancellation, you can request complete deletion of all your personal data. We don't keep shadow copies or backups of your information after deletion is requested. Your data is your property, and you control its lifecycle.",
    },
    {
      q: 'Do you use my data for marketing or advertising?',
      a: 'No. We do not use your personal estate information for marketing purposes. We do not create advertising profiles from your data. We do not sell your information to marketers. Our business model is built on trust, not data exploitation.',
    },
    {
      q: 'How does Canadian law protect my estate information specifically?',
      a: "Canadian privacy law provides some of the strongest data protections in the world. Under PIPEDA, we must obtain your consent for data collection, limit collection to what's necessary, protect your data with appropriate safeguards, and give you access to your information upon request. As a Canadian company serving Canadians, we're proud to operate under these robust protections.",
    },
  ],
  'getting-started': [
    {
      q: 'What is iFinallyWill (iFW)?',
      a: "iFW is a guided digital workflow that helps you produce estate documents, execute them correctly, and keep everything organized so your executor isn't left guessing.",
    },
    {
      q: 'Who is iFW built for?',
      a: 'People who want clarity, speed, and structure. Especially families, homeowners, incorporated professionals, and anyone who wants their estate handled cleanly.',
    },
    {
      q: 'Who should not use iFW without professional advice?',
      a: 'If you have complex cross border assets, heavy trust planning, active litigation risk, or highly bespoke family dynamics, you should layer in legal advice.',
    },
    {
      q: 'What do I need before I start?',
      a: 'Names and contact info for executors/beneficiaries, guardian choices (if relevant), and a basic inventory of assets and debts.',
    },
    {
      q: 'How long does it take to complete?',
      a: "Straightforward cases can be fast. Complex families take longer because good decisions take time. iFW doesn't pretend otherwise.",
    },
    {
      q: 'Can I save and come back later?',
      a: "Yes. iFW is built for real life: start now, finish when you're ready.",
    },
  ],
  'plans-pricing': [
    {
      q: 'What plans do you offer?',
      a: 'Essentials, Probate Smart, Couples, Family, and POA options (availability/labels can vary by province).',
    },
    {
      q: "What's included in Essentials?",
      a: 'A solid will workflow, clear outputs, and execution guidance so you can sign properly.',
    },
    {
      q: 'What does Probate Smart add?',
      a: 'It adds an efficiency layer: prompts and organization that reduce estate friction, executor confusion, and common documentation gaps.',
    },
    {
      q: "What's the Couples plan for?",
      a: 'Two coordinated workflows designed to keep spouses/partners aligned and avoid contradictions.',
    },
    {
      q: "What's the Family plan for?",
      a: 'Guardianship planning, dependent focused decisions, and broader family scenarios where mistakes are expensive.',
    },
    {
      q: 'Is POA included in every plan?',
      a: 'Not necessarily. POA can be an add-on or a standalone purchase depending on your package.',
    },
    {
      q: 'Do prices change by province?',
      a: 'They can. Legal naming conventions and requirements vary by jurisdiction, and so do support and document sets.',
    },
    {
      q: 'Are there discounts or bundles?',
      a: 'Where offered, bundles are meant to reduce total cost and keep households aligned.',
    },
  ],
  'building-will': [
    {
      q: 'What documents does iFW generate?',
      a: 'Typically a will, plus optional POA documents depending on what you select and what your province supports.',
    },
    {
      q: 'Does iFW give legal advice?',
      a: "No. iFW gives structured guidance and education, but it's not a substitute for a lawyer in complex situations.",
    },
    {
      q: 'Can I name multiple executors?',
      a: 'Yes. You can name primary and alternate executors and structure roles sensibly.',
    },
    {
      q: 'What if my executor lives in another province/country?',
      a: 'That can be fine, but it may add complexity and delays. If your estate is complex, get professional advice.',
    },
    {
      q: 'Can I set gifts to specific people (specific bequests)?',
      a: 'Yes, where supported in your workflow, you can allocate specific items or amounts.',
    },
    {
      q: 'Can I include charitable gifts?',
      a: "Yes. You'll want accurate charity details to avoid execution errors.",
    },
    {
      q: 'Can I include funeral or burial wishes?',
      a: "You can record wishes, but don't treat a will as an operations manual. Put key instructions where your executor will actually see them quickly.",
    },
    {
      q: 'Can I disinherit someone?',
      a: 'You can structure your intentions, but disinheritance can create legal risk. If this is in play, get legal advice.',
    },
    {
      q: 'Can I name guardians for children?',
      a: 'Yes. And you should, because ambiguity is not a strategy.',
    },
    {
      q: 'What if I have a blended family?',
      a: 'Blended families (where one or both spouses have children from previous relationships) require careful planning. iFinallyWill helps you document your family tree clearly, specify guardians for all minor children, and define how assets should be distributed. Key considerations include: ensuring your children from previous relationships are explicitly included as beneficiaries, coordinating with your spouse on mutual wishes, and considering mutual wills agreements if you want to ensure both spouses honor the plan after one passes away. While iFinallyWill provides structure for blended family planning, complex situations may benefit from professional legal review to address potential conflicts and ensure all family members are properly provided for.',
    },
    {
      q: 'How can I protect my children in a blended family situation?',
      a: "In blended families, it's essential to explicitly name all children (both biological and stepchildren) in your will. Don't assume they'll automatically inherit. Use specific bequests and clearly define your residue distribution. Consider naming guardians specifically for your biological children if you want to ensure they're cared for by people you trust. You can also use testamentary trusts to protect assets for minor children. If you want to ensure your spouse continues your plan after you pass, consider a mutual wills agreement that legally binds both spouses to the agreed distribution. iFinallyWill guides you through these decisions, but complex blended family dynamics often benefit from professional legal counsel.",
    },
    {
      q: 'What if I own a business or holdco?',
      a: "iFW can capture basics, but corporate structures often require coordinated tax/legal planning. Don't wing this.",
    },
    {
      q: 'What if I own rental properties?',
      a: 'We can capture and organize, but execution and tax planning may require a professional overlay.',
    },
  ],
  'signing-witnessing': [
    {
      q: 'When is my will legally valid?',
      a: "When it's executed correctly under your province's rules signature, witnessing, and any required formalities.",
    },
    {
      q: 'Does iFW support remote/virtual witnessing?',
      a: "Rules vary by province and change over time. iFW provides guidance, but you must follow your jurisdiction's current requirements.",
    },
    {
      q: 'Who can be a witness?',
      a: 'Typically an adult who is not a beneficiary and not the spouse of a beneficiary. Exact rules vary follow your province guidance.',
    },
    {
      q: 'Can my spouse be a witness?',
      a: 'Usually not recommended and can invalidate gifts. Use neutral witnesses.',
    },
    {
      q: 'How many witnesses do I need?',
      a: 'Often two for standard wills, but jurisdiction rules apply.',
    },
    {
      q: 'Do I need a notary?',
      a: "Usually not for a typical will, but some people choose notarization for comfort. It's not a substitute for proper witnessing.",
    },
    {
      q: 'What if I make a mistake while signing?',
      a: 'Do not improvise edits. Redo the execution cleanly to avoid challenges.',
    },
  ],
  'power-of-attorney': [
    {
      q: 'What is a Power of Attorney (POA)?',
      a: "A POA authorizes someone to make decisions for you if you can't. Financial/property and personal care/health decisions are typically separate.",
    },
    {
      q: 'Does iFW include both financial and personal care POAs?',
      a: 'Where available in your province and where selected, iFW supports both decision domains (naming varies by province).',
    },
    {
      q: 'When does a POA take effect?',
      a: 'It depends on how it\'s drafted immediate vs "springing" on incapacity (jurisdiction and drafting options apply).',
    },
    {
      q: 'Can I name alternates for POA?',
      a: 'Yes, and you should. Single points of failure are operational risk.',
    },
    {
      q: 'Can I restrict what my POA can do?',
      a: 'Often yes. Constraints must be clear and workable over engineering creates bottlenecks.',
    },
    {
      q: 'Can I revoke a POA?',
      a: 'Yes, generally, while you have capacity and follow proper revocation steps.',
    },
  ],
  'pet-planning': [
    {
      q: 'Can I leave money directly to my pet?',
      a: "In practice, people usually leave money to a person (the caregiver) or a structure intended to support the pet's care. The goal is simple: make sure someone can actually use funds to look after your pet.",
    },
    {
      q: 'What if my caregiver changes their mind later?',
      a: "That's why you name a backup and keep your plan updated. This is a living plan, not a one-time event.",
    },
    {
      q: 'Should I put detailed care instructions in my will?',
      a: 'Your will is for the legal transfer and high-level direction. Your Pet Care Playbook is where the day-to-day details belong.',
    },
    {
      q: 'What if I have multiple pets?',
      a: 'Decide whether they should stay together (often best for stability) or be split based on fit and caregiver capacity.',
    },
    {
      q: 'What about temporary emergencies (hospital stays, travel, injuries)?',
      a: 'That\'s where immediate care planning matters. Make sure at least one trusted person knows they\'re your "first-call" for your pet.',
    },
  ],
  'updates-changes': [
    {
      q: 'Can I update my will later?',
      a: 'Yes. Life changes your plan should keep pace.',
    },
    {
      q: 'What changes should trigger an update?',
      a: 'Marriage/common law changes, divorce/separation, new children, major asset changes, moving provinces, business events, deaths in the family.',
    },
    {
      q: 'If I move to a different province, is my will still valid?',
      a: "Often yes, but it may not be optimized for the new province's rules. Review and update.",
    },
    {
      q: 'What if I get married after creating my will?',
      a: "In some places marriage can impact wills dramatically. Don't assume review immediately.",
    },
    {
      q: 'What if I separate or divorce?',
      a: 'Wills and beneficiary designations can diverge fast. Update both.',
    },
  ],
  'storage-sharing': [
    {
      q: 'Where should I keep my signed will?',
      a: 'Somewhere safe, accessible, and known to your executor. "Hidden" is not "secure."',
    },
    {
      q: 'Can I store documents digitally?',
      a: 'Yes for organization and access but your signed original still matters.',
    },
    {
      q: 'How does executor access work?',
      a: 'iFW is designed to support controlled sharing so the right people can access the right info at the right time.',
    },
    {
      q: 'Can I share my plan with my spouse/family now?',
      a: "Yes. That's the point: fewer surprises, fewer disputes, faster administration.",
    },
  ],
  'billing-refunds': [
    {
      q: 'What is the 60-day, 100% money-back guarantee?',
      a: "If you don't complete your will, you can cancel within 60 days and receive a full refund (if you paid) under the stated terms clear, fair, and consumer friendly.",
    },
    {
      q: 'Is the refund automatic?',
      a: 'No. You request cancellation/refund within the window. We keep it clean and auditable.',
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Video tutorials data                                               */
/* ------------------------------------------------------------------ */

interface VideoData {
  src: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
}

interface SubStep {
  key: string;
  title: string;
}

interface VideoTutorialStep {
  stepNumber: number;
  title: string;
  description: string;
  mainVideo: string | null;
  subSteps: SubStep[];
}

const VIDEO_REGISTRY: Record<string, VideoData> = {
  welcome: {
    src: '/ai_videos/videos/Welcome.mp4',
    title: 'Welcome to IFinallyWill App',
    description: 'Please see our introductory video',
    duration: '2 min',
    thumbnail: '/ai_videos/thumbnails/Welcome.jpg',
  },
  aboutYou: {
    src: '/ai_videos/videos/Personal_Information.mp4',
    title: 'Personal Information',
    description: 'Learn how to properly fill out your personal details',
    duration: '2 min',
    thumbnail: '/ai_videos/thumbnails/Personal_Information.jpg',
  },
  yourFamily: {
    src: '/ai_videos/videos/Your_Family.mp4',
    title: 'Family Tree',
    description: 'Guide to building your family tree',
    duration: '3 min',
    thumbnail: '/ai_videos/thumbnails/FamilyTree.jpg',
  },
  familyTree: {
    src: '/ai_videos/videos/FamilyTree.mp4',
    title: 'Family Tree',
    description: 'Step-by-step guide to building your family tree',
    duration: '3 min',
    thumbnail: '/ai_videos/thumbnails/FamilyTree.jpg',
  },
  guardianMinors: {
    src: '/ai_videos/videos/Guardian_for_minors.mp4',
    title: 'Guardian for Minors',
    description: 'How to assign guardians for minor children',
    duration: '2 min',
    thumbnail: '/ai_videos/thumbnails/Guardian_for_minors.jpg',
  },
  guardianPets: {
    src: '/ai_videos/videos/Guardian_for_pets.mp4',
    title: 'Guardian for Pets',
    description: 'Ensuring your pets are cared for',
    duration: '2 min',
    thumbnail: '/ai_videos/thumbnails/Guardian_for_pets.jpg',
  },
  yourEstate: {
    src: '/ai_videos/videos/Your_Estate.mp4',
    title: 'Assets & Property',
    description: 'How to document your assets effectively',
    duration: '4 min',
    thumbnail: '/ai_videos/thumbnails/Assets.jpg',
  },
  assets: {
    src: '/ai_videos/videos/Assets.mp4',
    title: 'Assets & Property',
    description: 'How to document your assets effectively',
    duration: '4 min',
    thumbnail: '/ai_videos/thumbnails/Assets.jpg',
  },
  bequest: {
    src: '/ai_videos/videos/Bequests.mp4',
    title: 'Bequests',
    description: 'Specifying who receives your assets',
    duration: '3 min',
    thumbnail: '/ai_videos/thumbnails/Bequests.jpg',
  },
  residue: {
    src: '/ai_videos/videos/Residue.mp4',
    title: 'Residue',
    description: 'Planning for remaining assets',
    duration: '2 min',
    thumbnail: '/ai_videos/thumbnails/Residue.jpg',
  },
  trust: {
    src: '/ai_videos/videos/Testamentary_Trusts.mp4',
    title: 'Testamentary Trusts',
    description: 'Setting up trusts in your will',
    duration: '4 min',
    thumbnail: '/ai_videos/thumbnails/Testamentary_Trusts.jpg',
  },
  yourArrangements: {
    src: '/ai_videos/videos/Your_Arrangements.mp4',
    title: 'Your Arrangements',
    description: 'Final review and arrangement setup',
    duration: '2 min',
    thumbnail: '/ai_videos/thumbnails/Executor.jpg',
  },
  executors: {
    src: '/ai_videos/videos/Executor.mp4',
    title: 'Executors',
    description: 'Choosing who will execute your will',
    duration: '2 min',
    thumbnail: '/ai_videos/thumbnails/Executor.jpg',
  },
  wipeout: {
    src: '/ai_videos/videos/Wipeout_Clause.mp4',
    title: 'Wipeout Clause',
    description: 'Planning for worst-case scenarios',
    duration: '2 min',
    thumbnail: '/ai_videos/thumbnails/Wipeout_Clause.jpg',
  },
  default: {
    src: '/ai_videos/videos/Personal_Information.mp4',
    title: 'How-to Guide',
    description: 'Watch this helpful guide',
    duration: '2 min',
    thumbnail: '/ai_videos/thumbnails/Personal_Information.jpg',
  },
};

const VIDEO_TUTORIALS_STEPS: VideoTutorialStep[] = [
  {
    stepNumber: 1,
    title: 'About you',
    description: 'Personal information and identification details',
    mainVideo: 'aboutYou',
    subSteps: [{ key: 'aboutYou', title: 'Personal Information' }],
  },
  {
    stepNumber: 2,
    title: 'Your family',
    description: 'Family tree, guardians for minors and pets',
    mainVideo: 'yourFamily',
    subSteps: [
      { key: 'familyTree', title: 'Family Tree' },
      { key: 'guardianMinors', title: 'Guardian For Minors' },
      { key: 'guardianPets', title: 'Guardian For Pets' },
    ],
  },
  {
    stepNumber: 3,
    title: 'Your estate',
    description: 'Assets, bequests, residue and trusts',
    mainVideo: 'yourEstate',
    subSteps: [
      { key: 'assets', title: 'Assets' },
      { key: 'bequest', title: 'Gifts' },
      { key: 'residue', title: "What's Left" },
      { key: 'trust', title: 'Inheritance for Children' },
    ],
  },
  {
    stepNumber: 4,
    title: 'Your arrangements',
    description: 'Executors, wipeout and additional information',
    mainVideo: 'yourArrangements',
    subSteps: [
      { key: 'executors', title: 'Will Executors' },
      { key: 'wipeout', title: 'Wipeout Information' },
    ],
  },
  {
    stepNumber: 5,
    title: 'Your POAs',
    description: 'Power of Attorney documents for property and health care',
    mainVideo: null,
    subSteps: [
      { key: 'poaProperty', title: 'Power Of Attorney Property' },
      { key: 'poaHealth', title: 'Power Of Attorney Health' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Quick-answers accordion data (inlined from QuickAnswersSection)     */
/* ------------------------------------------------------------------ */

interface QuickAnswersGroup {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  faqs: FaqItem[];
}

const QUICK_ANSWERS_GROUPS: QuickAnswersGroup[] = [
  {
    id: 'legality',
    title: 'Is This Legal?',
    subtitle: 'Legality & Validity',
    icon: 'shield-check',
    faqs: [
      {
        q: 'Are these Wills and Powers of Attorney legally valid?',
        a: "Yes. All documents generated by iFinallyWill are legally valid when properly executed according to your province's requirements. Our documents are drafted to comply with Canadian provincial laws and are reviewed by legal professionals. The key to validity is proper execution - following the signing and witnessing instructions we provide.",
      },
      {
        q: 'Is this the same as hiring a lawyer?',
        a: "iFinallyWill provides legally valid documents through a guided workflow, but it's not the same as hiring a lawyer for personalized legal advice. We're ideal for straightforward estates. If you have complex situations (cross-border assets, trusts, litigation risk, or complex family dynamics), you should consult with a lawyer who can provide tailored legal advice.",
      },
      {
        q: 'Is AI writing my Will for me?',
        a: 'No. AI is not writing your Will. iFinallyWill uses a structured, guided workflow that helps you make informed decisions about your estate. The legal document structure is professionally drafted and province-specific. You answer questions, make choices, and the system organizes your decisions into a legally compliant document format.',
      },
      {
        q: 'Do these documents work if I move?',
        a: "Your documents are generally valid if you move to another province, but they may not be optimized for the new province's specific rules. We recommend reviewing and updating your documents when you move to ensure they align with your new province's requirements and take advantage of any province-specific benefits.",
      },
    ],
  },
  {
    id: 'how-it-works',
    title: 'How Does This Work?',
    subtitle: 'How It Works',
    icon: 'rocket',
    faqs: [
      {
        q: 'Can I start without paying?',
        a: "Yes! You can start building your Will for free. Create an account and begin answering questions. You only pay when you're ready to download your final documents. This lets you explore the process, see what's included, and make sure it's right for you before committing.",
      },
      {
        q: 'How long does it take?',
        a: "The time varies based on your situation. Straightforward cases can be completed quickly - often in one session. More complex families or estates with multiple assets may take longer because good decisions take time. You can save your progress and return anytime, so there's no pressure to finish in one sitting.",
      },
      {
        q: 'What do I get after I pay?',
        a: "After payment, you'll receive your completed, legally structured documents ready for signing. This includes your Will (and POAs if you selected Best for Individuals or BEST FOR 2 ADULTS), plus clear signing and witnessing instructions. You'll also get guidance on proper execution to ensure everything is legally valid.",
      },
      {
        q: 'Can I change things later?',
        a: 'Yes. Life changes, and your estate plan should keep pace. You can update your Will and documents anytime. Major life events like marriage, divorce, new children, major asset changes, moving provinces, or deaths in the family should trigger a review and update.',
      },
    ],
  },
  {
    id: 'plans-pricing',
    title: "Plans, Pricing & What's Included",
    subtitle: 'Which Plan Do I Need?',
    icon: 'chart-bar',
    faqs: [
      {
        q: 'What are the three plans? (Basic Will $89, Best for Individuals $159, Best for 2 Adults $249)',
        a: 'We offer three main plans: Basic Will ($89) - A straightforward Will for simple estates. Best for Individuals ($159) - Includes your Will plus Power of Attorney for Health and Power of Attorney for Property. This is our most popular plan because it covers both incapacity and death. Best for 2 Adults ($249) - Two complete plans (2 Wills + 4 POAs total) designed to keep spouses aligned and avoid contradictions.',
      },
      {
        q: 'Why do most people choose Best for Individuals?',
        a: "Best for Individuals is the minimum responsible setup for most people because it covers both incapacity and death. A Will only helps after you die, but incapacity risk often comes before death. With Best for Individuals, you're protected if you can't make health or financial decisions due to illness or injury. It's especially important for homeowners, parents, and business owners.",
      },
      {
        q: 'Can I upgrade later?',
        a: "Yes, you can upgrade anytime. If you start with the Basic Will and later decide you want Best for Individuals, your answers carry over. You'll just pay the difference and get access to the additional documents (POAs). There's no penalty for starting simple and upgrading when you're ready.",
      },
      {
        q: "Who This Is (and Isn't) For",
        a: 'iFinallyWill is built for people who want clarity, speed, and structure - especially families, homeowners, incorporated professionals, and anyone who wants their estate handled cleanly. If you have complex cross-border assets, heavy trust planning, active litigation risk, or highly bespoke family dynamics, you should layer in professional legal advice.',
      },
      {
        q: "Still Not Sure? Here's the Simple Rule",
        a: "If you own property, have kids or dependents, run a business, or want incapacity coverage, choose Best for Individuals. If you're part of a couple and both want coverage, Best for 2 Adults saves you money and keeps you aligned. If you have a very simple estate and only need a Will, the Basic Will works.",
      },
    ],
  },
  {
    id: 'security-support',
    title: 'Security, Support & Guarantees',
    subtitle: 'Is My Information Safe? What If I Change My Mind?',
    icon: 'shield-check',
    faqs: [
      {
        q: 'Is my information secure?',
        a: 'Yes. We use bank-level 256-bit SSL encryption for all data transmission and storage. Your sensitive information is encrypted both in transit and at rest. We employ the same security standards used by major financial institutions. Your data is stored on secure Canadian servers using Google Cloud infrastructure, which provides enterprise-grade security, redundancy, and compliance.',
      },
      {
        q: 'Can someone else see my documents?',
        a: 'No. We have a strict zero third-party data sharing policy. Your personal information, estate details, beneficiary information, and all data you provide stays exclusively with iFinallyWill. We never sell, rent, lease, or share your data with any external companies, marketers, or data brokers.',
      },
      {
        q: 'What if I need help?',
        a: "We offer multiple ways to get help. Our AI assistant Wilfred is available 24/7 to answer questions about the process. You can also contact our support team through the Contact page. We provide clear guidance throughout the workflow, and if you encounter complex situations, we'll recommend when professional legal advice might be beneficial.",
      },
      {
        q: 'Do you offer a guarantee?',
        a: "Yes. We offer a 60-day, 100% money-back guarantee. If you don't complete your Will, you can cancel within 60 days and receive a full refund (if you paid). This is our commitment to ensuring you're satisfied with the service. The guarantee is clear, fair, and consumer-friendly.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Resources data                                                     */
/* ------------------------------------------------------------------ */

interface Resource {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: string;
}

const RESOURCES: Resource[] = [
  {
    key: 'probate',
    title: 'Probate',
    description:
      'Learn about probate in Canada, what it costs, and how to reduce probate fees through proper estate planning.',
    href: '/probate',
    icon: 'chart-bar',
  },
  {
    key: 'pet_info',
    title: 'Pet Information',
    description:
      "Plan for your pet's future with our pet guardian information and planning resources.",
    href: '/pet-information-guardian',
    icon: 'heart',
  },
  {
    key: 'ai_guidance',
    title: 'AI Guidance',
    description:
      'Get real-time AI assistance to guide you through estate planning, understand legal terms, and build your will with confidence.',
    href: '/ai-guidance',
    icon: 'chat-ai',
  },
  {
    key: 'contact',
    title: 'Contact Us',
    description:
      'Get in touch with our support team for personalized help, questions, or assistance with your estate planning needs.',
    href: '/contact',
    icon: 'mail',
  },
];

/* ------------------------------------------------------------------ */
/*  Sitemap data                                                       */
/* ------------------------------------------------------------------ */

interface SitemapLink {
  label: string;
  href: string;
  description: string;
}

interface SitemapCategory {
  title: string;
  links: SitemapLink[];
}

const SITEMAP_CATEGORIES: SitemapCategory[] = [
  {
    title: 'Main Pages',
    links: [
      {
        label: 'Home',
        href: '/',
        description: 'Landing page with hero sections, features, and pricing',
      },
      {
        label: 'How It Works',
        href: '/how-it-works',
        description: 'Step-by-step guide to creating your will',
      },
      {
        label: 'Compare',
        href: '/compare',
        description: 'Compare iFinallyWill with other will platforms',
      },
      {
        label: 'About Us',
        href: '/about-us',
        description: 'Learn about our company and legal expertise',
      },
    ],
  },
  {
    title: 'Services & Products',
    links: [
      {
        label: 'AI Guidance',
        href: '/ai-guidance',
        description: 'Learn about our AI-powered estate planning assistant',
      },
      {
        label: 'Documents Showcase',
        href: '/documents-showcase',
        description: 'View all available will and POA documents',
      },
      { label: 'Pricing', href: '/#pricing', description: 'View our pricing plans and packages' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'FAQs', href: '/help-centre', description: 'FAQs and support resources' },
      { label: 'Probate', href: '/probate', description: 'Understanding probate in Canada' },
      {
        label: 'Pet Information',
        href: '/pet-information-guardian',
        description: "Plan for your pet's future",
      },
      { label: 'Contact Us', href: '/contact', description: 'Get in touch with our support team' },
    ],
  },
  {
    title: 'Legal & Policies',
    links: [
      {
        label: 'Terms of Service',
        href: '/terms-of-service',
        description: 'Terms and conditions for using iFinallyWill',
      },
      {
        label: 'Privacy Policy',
        href: '/privacy-policy',
        description: 'How we protect and handle your data',
      },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Login', href: '/login', description: 'Sign in to your iFinallyWill account' },
      { label: 'Register', href: '/register', description: 'Create a free account to get started' },
    ],
  },
];

/* ================================================================== */
/*  Section components                                                 */
/* ================================================================== */

/* ---------- Hero Section ------------------------------------------ */

interface HeroSectionProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearchClick: () => void;
}

function HeroSection({ searchQuery, setSearchQuery, onSearchClick }: HeroSectionProps) {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchClick();
  };

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden py-20 md:py-32"
      style={{ backgroundColor: colors.gold }}
    >
      {/* Animated background shapes */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ y: backgroundY }}
        aria-hidden="true"
      >
        <div
          className="absolute top-20 right-[10%] w-64 h-64 rounded-full opacity-20"
          style={{ backgroundColor: colors.blue }}
        />
        <div
          className="absolute bottom-10 left-[5%] w-48 h-48 rounded-full opacity-15"
          style={{ backgroundColor: colors.blue }}
        />
      </motion.div>

      {/* Decorative corner accent */}
      <div className="absolute top-0 left-0 z-10" aria-hidden="true">
        <div className="h-3 w-24 rounded-br-sm" style={{ backgroundColor: colors.blue }} />
        <div className="h-24 w-3 rounded-br-sm" style={{ backgroundColor: colors.blue }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.h2
          className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-[0.15em] uppercase mb-4"
          style={{ color: colors.blue }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          FAQs
        </motion.h2>

        <motion.h1
          className="font-extrabold leading-tight"
          style={{ color: colors.blue, fontSize: 'clamp(36px, 8vw, 64px)' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          How can we help you?
        </motion.h1>

        <motion.p
          className="mt-4 text-lg md:text-xl max-w-2xl mx-auto"
          style={{ color: colors.ink }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Find answers to common questions about creating your will, estate planning, and using
          iFinallyWill.
        </motion.p>

        {/* Search bar with button */}
        <motion.form
          className="mt-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          onSubmit={handleSearchSubmit}
        >
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <SearchIcon className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for answers..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-transparent bg-white shadow-lg text-lg focus:outline-none focus:border-[#0A1E86] transition-all"
                style={{ color: colors.ink }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  aria-label="Clear search"
                >
                  <XIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <motion.button
              type="submit"
              className="px-4 sm:px-6 py-4 rounded-2xl font-semibold shadow-lg transition-all duration-300 hover:shadow-xl flex items-center justify-center gap-2 min-w-[52px]"
              style={{ backgroundColor: colors.blue, color: 'white' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="hidden sm:inline text-white font-bold">Search</span>
              <ArrowRightIcon className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </motion.form>

        {/* Quick stats */}
        <motion.div
          className="mt-12 flex flex-wrap justify-center gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: colors.blue }}>
              60+
            </p>
            <p className="text-sm text-black/70">Helpful articles</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: colors.blue }}>
              10
            </p>
            <p className="text-sm text-black/70">Topic categories</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: colors.blue }}>
              24/7
            </p>
            <p className="text-sm text-black/70">Available support</p>
          </div>
        </motion.div>
      </div>

      {/* Bottom wave divider */}
      <div className="absolute -bottom-1 left-0 right-0" aria-hidden="true">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-[80px]">
          <path d="M0,60 C360,20 1080,80 1440,40 L1440,80 L0,80 Z" fill="#0C1F3C" />
        </svg>
      </div>
    </section>
  );
}

/* ---------- Category Card ----------------------------------------- */

interface CategoryCardProps {
  category: FaqCategory;
  index: number;
  onClick: () => void;
  isActive: boolean;
  faqCount: number;
}

function CategoryCard({ category, index, onClick, isActive, faqCount }: CategoryCardProps) {
  const isFeatured = category.featured;

  return (
    <motion.button
      onClick={onClick}
      className={`relative p-6 rounded-2xl text-left w-full transition-all duration-300 ${
        isActive
          ? 'ring-2 ring-[#FFBF00] shadow-xl'
          : isFeatured
            ? 'ring-2 ring-[#0A1E86] hover:shadow-xl'
            : 'hover:shadow-lg'
      }`}
      style={{
        backgroundColor: isActive ? colors.blue : 'white',
      }}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Featured badge */}
      {isFeatured && !isActive && (
        <div
          className="absolute -top-2 -right-2 px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: colors.gold }}
        >
          IMPORTANT
        </div>
      )}

      {/* Icon */}
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-md"
        style={{
          backgroundColor: isActive ? colors.gold : colors.blue,
        }}
      >
        <CategoryIcon name={category.icon} className="w-7 h-7" style={{ color: 'white' }} />
      </div>

      <h3 className="font-semibold text-lg" style={{ color: isActive ? 'white' : colors.blue }}>
        {category.label}
      </h3>
      <p style={{ color: isActive ? colors.gold : '#6B7280' }} className="text-sm mt-1">
        {faqCount} {faqCount === 1 ? 'question' : 'questions'}
      </p>
    </motion.button>
  );
}

/* ---------- Categories grid section ------------------------------- */

interface CategoriesSectionProps {
  activeCategory: string | null;
  onCategorySelect: (id: string) => void;
}

function CategoriesSection({ activeCategory, onCategorySelect }: CategoriesSectionProps) {
  return (
    <section
      className="relative py-20"
      style={{ background: 'linear-gradient(180deg, #0A1E86 0%, #14417B 50%, #0C1F3C 100%)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p
            className="text-sm font-bold tracking-[0.2em] uppercase"
            style={{ color: colors.gold }}
          >
            BROWSE BY TOPIC
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-white">Choose a category</h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FAQ_CATEGORIES.map((category, index) => {
            const faqCount =
              category.id === 'video-tutorials'
                ? VIDEO_TUTORIALS_STEPS.length
                : FAQ_DATA[category.id]?.length || 0;

            return (
              <CategoryCard
                key={category.id}
                category={category}
                index={index}
                onClick={() => onCategorySelect(category.id)}
                isActive={activeCategory === category.id}
                faqCount={faqCount}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ accordion item ------------------------------------ */

interface FaqAccordionItemProps {
  item: FaqItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}

function FaqAccordionItem({ item, index, isOpen, onToggle }: FaqAccordionItemProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!contentRef.current) return;
    setHeight(isOpen ? contentRef.current.scrollHeight : 0);
  }, [isOpen, item.a]);

  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'white' }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.03 }}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A1E86]"
      >
        <span className="font-semibold text-lg" style={{ color: colors.blue }}>
          {item.q}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0"
        >
          <ChevronDownIcon className="w-5 h-5" style={{ color: colors.blue }} />
        </motion.div>
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: `${height}px` }}
      >
        <div ref={contentRef} className="px-6 pb-5 pt-0">
          <p className="text-gray-700 leading-relaxed">{item.a}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- Collapsible FAQ item inside category ------------------- */

interface CollapsibleFaqItemProps {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}

function CollapsibleFaqItem({ item, isOpen, onToggle }: CollapsibleFaqItemProps) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.offwhite }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-4 text-left"
      >
        <span className="font-semibold" style={{ color: colors.blue }}>
          {item.q}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDownIcon className="w-5 h-5" style={{ color: colors.blue }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- FAQ list for a selected category ---------------------- */

interface FaqListProps {
  categoryId: string | null;
  searchQuery: string;
  onClearSearch: () => void;
  onOpenAI: () => void;
}

interface ExtendedFaqItem extends FaqItem {
  categoryId: string;
  originalIndex: number;
}

function FaqList({ categoryId, searchQuery, onClearSearch, onOpenAI }: FaqListProps) {
  const [openIndex, setOpenIndex] = useState(0);

  const filteredFaqs = useMemo<ExtendedFaqItem[]>(() => {
    if (!categoryId && !searchQuery) return [];

    const query = searchQuery.toLowerCase().trim();
    const faqs: ExtendedFaqItem[] = [];

    if (categoryId) {
      (FAQ_DATA[categoryId] || []).forEach((item, idx) => {
        faqs.push({ ...item, categoryId, originalIndex: idx });
      });
    } else if (query) {
      Object.entries(FAQ_DATA).forEach(([catId, items]) => {
        items.forEach((item, idx) => {
          if (item.q.toLowerCase().includes(query) || item.a.toLowerCase().includes(query)) {
            faqs.push({ ...item, categoryId: catId, originalIndex: idx });
          }
        });
      });
    }

    return faqs;
  }, [categoryId, searchQuery]);

  // Empty search state
  if (searchQuery && filteredFaqs.length === 0) {
    return (
      <section className="py-16" style={{ backgroundColor: colors.offwhite }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Empty state icon */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${colors.blue}15` }}
            >
              <SearchIcon className="w-10 h-10" style={{ color: colors.blue }} />
            </div>

            <h3 className="text-2xl font-bold mb-3" style={{ color: colors.blue }}>
              No results found
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {`We couldn't find any questions matching "${searchQuery}". Try different keywords or browse our complete resource library.`}
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                onClick={onOpenAI}
                className="px-6 py-3 rounded-xl font-semibold shadow-lg transition-all duration-300 hover:shadow-xl flex items-center justify-center gap-2"
                style={{ backgroundColor: colors.gold }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ChatAiIcon className="w-5 h-5" style={{ color: colors.blue }} />
                <span className="font-bold" style={{ color: colors.blue }}>
                  Ask AI Assistant
                </span>
              </motion.button>

              <motion.button
                onClick={onClearSearch}
                className="px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl flex items-center justify-center gap-2"
                style={{ backgroundColor: colors.blue }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <DocumentTextIcon className="w-5 h-5 text-white" />
                <span className="text-white">Browse All Resources</span>
              </motion.button>

              <Link
                to="/contact"
                className="px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 border-2 hover:bg-gray-50"
                style={{ borderColor: colors.blue, color: colors.blue }}
              >
                <ChatIcon className="w-5 h-5" />
                <span>Contact Support</span>
              </Link>
            </div>

            {/* Helpful suggestions */}
            <div className="mt-10 p-6 rounded-2xl text-left" style={{ backgroundColor: 'white' }}>
              <h4 className="font-semibold mb-3" style={{ color: colors.blue }}>
                Search tips:
              </h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li className="flex items-start gap-2">
                  <CheckIcon
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    style={{ color: colors.gold }}
                  />
                  <span>Try using simpler or fewer keywords</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    style={{ color: colors.gold }}
                  />
                  <span>Check for spelling errors</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    style={{ color: colors.gold }}
                  />
                  <span>Browse categories to explore related topics</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  if (filteredFaqs.length === 0) return null;

  const categoryLabel = categoryId
    ? FAQ_CATEGORIES.find((c) => c.id === categoryId)?.label
    : `Search results for "${searchQuery}"`;

  return (
    <section className="py-16" style={{ backgroundColor: colors.offwhite }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold" style={{ color: colors.blue }}>
            {categoryLabel}
          </h2>
          <p className="mt-2 text-gray-600">
            {filteredFaqs.length} {filteredFaqs.length === 1 ? 'question' : 'questions'} found
          </p>
        </motion.div>

        <div className="space-y-3">
          {filteredFaqs.map((item, idx) => (
            <FaqAccordionItem
              key={`${item.categoryId}-${item.originalIndex}`}
              item={item}
              index={idx}
              isOpen={openIndex === idx}
              onToggle={() => setOpenIndex(openIndex === idx ? -1 : idx)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- All FAQs section (when no category selected) ---------- */

interface AllFaqsSectionProps {
  searchQuery: string;
}

function AllFaqsSection({ searchQuery }: AllFaqsSectionProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const toggleFaq = (categoryId: string, faqIdx: number) => {
    const key = `${categoryId}-${faqIdx}`;
    setOpenFaqs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (searchQuery) return null;

  return (
    <section className="py-20" style={{ backgroundColor: colors.offwhite }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p
            className="text-sm font-bold tracking-[0.2em] uppercase"
            style={{ color: colors.blue }}
          >
            ALL QUESTIONS
          </p>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold" style={{ color: colors.blue }}>
            Complete FAQ Library
          </h2>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
            Click on any category to expand, then click on individual questions for detailed answers
          </p>
        </motion.div>

        <div className="space-y-6">
          {FAQ_CATEGORIES.filter((category) => category.id !== 'video-tutorials').map(
            (category, catIdx) => {
              const isOpen = openCategories[category.id];
              const faqs = FAQ_DATA[category.id] || [];

              return (
                <motion.div
                  key={category.id}
                  className="rounded-2xl overflow-hidden shadow-md"
                  style={{ backgroundColor: 'white' }}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: catIdx * 0.05 }}
                >
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between gap-4 p-6 text-left"
                  >
                    <div className="flex items-center gap-4">
                      {/* Blue background with White icon */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                        style={{ backgroundColor: colors.blue }}
                      >
                        <CategoryIcon
                          name={category.icon}
                          className="w-6 h-6"
                          style={{ color: 'white' }}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg" style={{ color: colors.blue }}>
                            {category.label}
                          </h3>
                          {category.featured && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: colors.gold }}
                            >
                              IMPORTANT
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{faqs.length} questions</p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDownIcon className="w-6 h-6" style={{ color: colors.blue }} />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 space-y-3">
                          {faqs.map((item, idx) => (
                            <CollapsibleFaqItem
                              key={idx}
                              item={item}
                              isOpen={!!openFaqs[`${category.id}-${idx}`]}
                              onToggle={() => toggleFaq(category.id, idx)}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            }
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Quick Answers Section (inlined) ----------------------- */

function QuickAnswersSection() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const toggleFaq = (groupId: string, faqIdx: number) => {
    const key = `${groupId}-${faqIdx}`;
    setOpenFaqs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <section className="py-20" style={{ backgroundColor: colors.offwhite }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: colors.blue }}>
            Quick Answers to Common Questions
          </h2>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
            Get answers to the most important questions that help you make confident decisions
          </p>
        </motion.div>

        <div className="space-y-4">
          {QUICK_ANSWERS_GROUPS.map((group, groupIdx) => {
            const isGroupOpen = openGroups[group.id];
            const faqs = group.faqs || [];

            return (
              <motion.div
                key={group.id}
                className="rounded-2xl overflow-hidden shadow-md"
                style={{ backgroundColor: 'white' }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: groupIdx * 0.05 }}
              >
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between gap-4 p-6 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0"
                      style={{ backgroundColor: colors.blue }}
                    >
                      <CategoryIcon
                        name={group.icon}
                        className="w-6 h-6"
                        style={{ color: 'white' }}
                      />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-lg" style={{ color: colors.blue }}>
                        {group.title}
                      </h3>
                      <p className="text-sm text-gray-500">{group.subtitle}</p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isGroupOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDownIcon className="w-6 h-6" style={{ color: colors.blue }} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isGroupOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 space-y-3">
                        {faqs.map((item, idx) => (
                          <FaqAccordionItem
                            key={idx}
                            item={item}
                            index={idx}
                            isOpen={!!openFaqs[`${group.id}-${idx}`]}
                            onToggle={() => toggleFaq(group.id, idx)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Resources section ------------------------------------- */

function ResourcesSection() {
  return (
    <section className="py-20" style={{ backgroundColor: colors.offwhite }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p
            className="text-sm font-bold tracking-[0.2em] uppercase mb-4"
            style={{ color: colors.blue }}
          >
            RESOURCES
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: colors.blue }}>
            Explore Our Resources
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find detailed information and guides to help you with your estate planning journey.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {RESOURCES.map((resource, index) => (
            <motion.div
              key={resource.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Link
                to={resource.href}
                className="flex flex-col h-full p-10 rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#0A1E86]/20"
              >
                <div className="h-32 flex items-center justify-center mb-4">
                  <div
                    className={`rounded-xl flex items-center justify-center overflow-hidden ${
                      resource.key === 'ai_guidance'
                        ? 'w-36 h-36 md:w-40 md:h-40'
                        : resource.key === 'pet_info'
                          ? 'w-24 h-24 md:w-28 md:h-28'
                          : 'w-14 h-14'
                    }`}
                    style={{
                      backgroundColor:
                        resource.key === 'ai_guidance' || resource.key === 'pet_info'
                          ? 'transparent'
                          : colors.blue,
                    }}
                  >
                    {resource.key === 'ai_guidance' ? (
                      <motion.img
                        src="/images/wilfred.png"
                        alt="Wilfred - AI Assistant"
                        className="w-full h-full object-contain scale-[1.75]"
                        animate={{
                          rotate: [0, 5, -5, 0],
                          y: [0, -3, 0],
                        }}
                        transition={{
                          rotate: {
                            duration: 3,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatType: 'reverse',
                            ease: 'easeInOut',
                          },
                          y: {
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatType: 'reverse',
                            ease: 'easeInOut',
                          },
                        }}
                      />
                    ) : resource.key === 'pet_info' ? (
                      <motion.img
                        src="/images/ifw_dog.png"
                        alt="IFW Dog - Pet Information"
                        className="w-full h-full object-contain scale-150"
                        animate={{
                          rotate: [0, 5, -5, 0],
                          y: [0, -3, 0],
                        }}
                        transition={{
                          rotate: {
                            duration: 3,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatType: 'reverse',
                            ease: 'easeInOut',
                          },
                          y: {
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatType: 'reverse',
                            ease: 'easeInOut',
                          },
                        }}
                      />
                    ) : resource.icon === 'mail' ? (
                      <MailIcon className="w-7 h-7 text-white" />
                    ) : (
                      <CategoryIcon
                        name={resource.icon}
                        className="w-7 h-7"
                        style={{ color: 'white' }}
                      />
                    )}
                  </div>
                </div>
                <h3
                  className="text-xl md:text-2xl font-bold mb-3 min-h-[3.5rem] whitespace-nowrap"
                  style={{ color: colors.blue }}
                >
                  {resource.title}
                </h3>
                <p className="text-gray-600 text-base leading-relaxed flex-1 mb-4">
                  {resource.description}
                </p>
                <div
                  className="mt-auto flex items-center gap-2 text-sm font-semibold"
                  style={{ color: colors.blue }}
                >
                  <span>Learn more</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Sitemap section --------------------------------------- */

function SitemapSection() {
  return (
    <section className="py-20" style={{ backgroundColor: 'white' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p
            className="text-sm font-bold tracking-[0.2em] uppercase mb-4"
            style={{ color: colors.blue }}
          >
            SITEMAP
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: colors.blue }}>
            Site Navigation
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A complete guide to all pages and resources available on iFinallyWill.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 justify-items-center ml-8 md:ml-16 lg:ml-24">
          {SITEMAP_CATEGORIES.map((category, catIndex) => (
            <motion.div
              key={category.title}
              className="w-full max-w-xs"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: catIndex * 0.1 }}
            >
              <h3 className="text-xl font-bold mb-4 text-left" style={{ color: colors.blue }}>
                {category.title}
              </h3>
              <ul className="space-y-3">
                {category.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link to={link.href} className="block group">
                      <div
                        className="font-semibold text-base mb-1 text-left group-hover:opacity-70 transition-opacity"
                        style={{ color: colors.blue }}
                      >
                        {link.label}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed text-left">
                        {link.description}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA section ------------------------------------------- */

function CtaSection() {
  return (
    <section className="relative py-20 overflow-hidden" style={{ backgroundColor: colors.gold }}>
      {/* Decorative shapes */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20"
          style={{ backgroundColor: colors.blue }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full opacity-15"
          style={{ backgroundColor: colors.blue }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2
            className="font-extrabold"
            style={{ color: colors.blue, fontSize: 'clamp(28px, 5vw, 48px)' }}
          >
            Still have questions?
          </h2>
          <p className="mt-4 text-lg text-black/80 max-w-xl mx-auto">
            {
              "Can't find what you're looking for? Start your will for free and our AI assistant can help guide you through the process."
            }
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-4 rounded-full text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              style={{ backgroundColor: colors.blue }}
            >
              Start For Free
            </Link>
            <Link
              to="/#pricing"
              className="px-8 py-4 rounded-full font-bold text-lg border-2 transition-all duration-300 border-[#0A1E86] text-[#0A1E86] hover:bg-[#0A1E86] hover:text-white"
            >
              View Pricing
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Top wave divider */}
      <div className="absolute -top-1 left-0 right-0" aria-hidden="true">
        <svg
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="w-full h-[80px] rotate-180"
        >
          <path d="M0,60 C360,20 1080,80 1440,40 L1440,80 L0,80 Z" fill={colors.offwhite} />
        </svg>
      </div>
    </section>
  );
}

/* ---------- Video Tutorials Section ------------------------------- */

function VideoTutorialsSection() {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  const getVideoData = (videoKey: string): VideoData => {
    return VIDEO_REGISTRY[videoKey] ?? VIDEO_REGISTRY.default!;
  };

  return (
    <section className="py-20" style={{ backgroundColor: colors.offwhite }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p
            className="text-sm font-bold tracking-[0.2em] uppercase mb-4"
            style={{ color: colors.blue }}
          >
            VIDEO TUTORIALS
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: colors.blue }}>
            Step-by-Step Video Guides
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Watch comprehensive tutorials for each step of creating your will. Click on any step to
            view video tutorials.
          </p>
        </motion.div>

        <div className="space-y-4">
          {VIDEO_TUTORIALS_STEPS.map((step, index) => {
            const isExpanded = expandedSteps[step.stepNumber];
            const mainVideoData = step.mainVideo ? getVideoData(step.mainVideo) : null;

            return (
              <motion.div
                key={step.stepNumber}
                className="bg-white rounded-xl sm:rounded-2xl overflow-hidden border-l-4"
                style={{
                  boxShadow: '0 4px 20px rgba(10, 30, 134, 0.08)',
                  borderColor: '#E5E7EB',
                }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {/* Step Header */}
                <button
                  onClick={() => toggleStep(step.stepNumber)}
                  className="w-full px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    {/* Step Number Box */}
                    <div
                      className="flex items-center justify-center rounded-xl flex-shrink-0"
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#F3F4F6',
                        color: '#6B7280',
                        fontWeight: 700,
                        fontSize: '1rem',
                        fontFamily:
                          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                      }}
                    >
                      <span>{step.stepNumber}</span>
                    </div>
                    <div className="text-left min-w-0">
                      <div className="flex items-center space-x-2">
                        <p
                          className="text-[10px] sm:text-xs font-bold uppercase tracking-wider"
                          style={{
                            color: '#9CA3AF',
                            fontFamily:
                              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            letterSpacing: '0.05em',
                          }}
                        >
                          STEP {step.stepNumber}
                        </p>
                      </div>
                      <h3
                        className="text-lg sm:text-xl font-bold truncate mt-0.5"
                        style={{
                          color: '#0C1F3C',
                          fontFamily:
                            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                          fontWeight: 700,
                        }}
                      >
                        {step.title}
                      </h3>
                      <p
                        className="text-sm sm:text-base truncate mt-0.5"
                        style={{
                          color: '#6B7280',
                          fontFamily:
                            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                          fontWeight: 400,
                        }}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                    <ChevronDownIcon
                      className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                      style={{ color: '#9CA3AF' }}
                    />
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="w-full border-t-2 border-gray-100 shadow-inner">
                        <div className="p-4 md:p-6 lg:p-8 mt-2">
                          <div className="space-y-6">
                            {/* Main Step Video */}
                            {mainVideoData && (
                              <div>
                                <h4
                                  className="text-2xl font-semibold mb-3"
                                  style={{ color: colors.blue }}
                                >
                                  Complete Step Overview
                                </h4>
                                <div className="bg-gray-100 rounded-lg p-4">
                                  <div className="aspect-video bg-black rounded-lg overflow-hidden mb-3">
                                    <video
                                      src={mainVideoData.src}
                                      controls
                                      className="w-full h-full object-contain"
                                      poster={mainVideoData.thumbnail}
                                      preload="metadata"
                                    >
                                      Your browser does not support the video tag.
                                    </video>
                                  </div>
                                  <h5
                                    className="text-2xl font-semibold mb-2"
                                    style={{ color: colors.blue }}
                                  >
                                    {mainVideoData.title}
                                  </h5>
                                  <p className="text-2xl text-gray-700 leading-snug">
                                    {mainVideoData.description}
                                  </p>
                                  <p className="text-lg text-gray-500 mt-1">
                                    {mainVideoData.duration}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Sub-Steps Videos */}
                            {step.subSteps.length > 0 && (
                              <div>
                                <h4
                                  className="text-2xl font-semibold mb-3"
                                  style={{ color: colors.blue }}
                                >
                                  Steps Tutorials
                                </h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                  {step.subSteps.map((subStep) => {
                                    const subVideoData = getVideoData(subStep.key);
                                    return (
                                      <div
                                        key={subStep.key}
                                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                                      >
                                        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-3">
                                          <video
                                            src={subVideoData.src}
                                            controls
                                            className="w-full h-full object-contain"
                                            poster={subVideoData.thumbnail}
                                            preload="metadata"
                                          >
                                            Your browser does not support the video tag.
                                          </video>
                                        </div>
                                        <h5
                                          className="text-2xl font-semibold mb-2"
                                          style={{ color: colors.blue }}
                                        >
                                          {subStep.title}
                                        </h5>
                                        <p className="text-2xl text-gray-600 mb-1 leading-snug">
                                          {subVideoData.description}
                                        </p>
                                        <p className="text-lg text-gray-500">
                                          {subVideoData.duration}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Wilfred Chat Section ---------------------------------- */

function WilfredChatSection() {
  // Stable positions for animated particles
  const particlePositions = useMemo(
    () =>
      Array.from({ length: 8 }, () => ({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        yOffset: Math.random() * 30 - 15,
        duration: 3 + Math.random() * 2,
      })),
    []
  );

  return (
    <section className="py-8 md:py-12" style={{ backgroundColor: '#0A1E86' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          <motion.div
            className="bg-gradient-to-br from-[#FFBF00] to-[#FFD54F] rounded-2xl shadow-xl text-[#0A1E86] relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
              {particlePositions.map((pos, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-[#0A1E86]/10 rounded-full"
                  style={{ top: pos.top, left: pos.left }}
                  animate={{
                    y: [0, pos.yOffset],
                    opacity: [0.1, 0.3, 0.1],
                  }}
                  transition={{
                    duration: pos.duration,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: 'reverse',
                  }}
                />
              ))}
            </div>

            {/* Wilfred Mascot - Top Right */}
            <motion.div
              className="absolute top-0 right-0 sm:-top-2 sm:-right-2 md:-top-4 md:-right-4 lg:-top-6 lg:-right-6 z-20 pointer-events-none"
              initial={{ opacity: 0, scale: 0.8, x: 20, y: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <motion.img
                src="/images/wilfred.png"
                alt="Wilfred - Your AI Assistant Mascot"
                className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-44 lg:h-44 xl:w-52 xl:h-52 object-contain"
                animate={{
                  y: [0, -6, 0],
                  rotate: [0, 1.5, -1.5, 0],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: 'easeInOut',
                }}
                style={{
                  filter: 'drop-shadow(0 6px 12px rgba(10, 30, 134, 0.25))',
                }}
              />
            </motion.div>

            <div className="p-8 relative z-10 pr-20 sm:pr-24 md:pr-28 lg:pr-32">
              <div className="flex items-center mb-4">
                <motion.div
                  className="w-12 h-12 rounded-full bg-[#0A1E86]/20 flex items-center justify-center mr-4"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <ChatAiIcon className="w-6 h-6 text-[#0A1E86]" />
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold text-[#0A1E86]">Need Instant Help?</h3>
                  <p className="text-[#0A1E86] text-sm font-medium">
                    Meet our AI assistance Wilfred
                  </p>
                </div>
              </div>

              <p className="text-[#0A1E86]/90 mb-6 leading-relaxed">
                Get instant answers about Wills, Power of Attorney, estate planning, and more. Our
                AI assistant is here to guide you through the process.
              </p>

              {/* Button wrapper with glow */}
              <div className="relative">
                {/* Pulsing glow ring */}
                <motion.div
                  className="absolute -inset-1 rounded-2xl -z-10"
                  style={{
                    background: 'linear-gradient(135deg, #FFBF00 0%, #FFD54F 50%, #FFBF00 100%)',
                    filter: 'blur(8px)',
                  }}
                  animate={{
                    opacity: [0.4, 0.7, 0.4],
                    scale: [1, 1.02, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  }}
                />
                <motion.button
                  onClick={() => window.dispatchEvent(new CustomEvent('openAIModal'))}
                  className="group relative w-full px-6 py-4 rounded-xl text-white font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #0A1E86 0%, #1a3a9e 50%, #0A1E86 100%)',
                    boxShadow: '0 0 25px rgba(255, 191, 0, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3)',
                  }}
                  whileHover={{
                    scale: 1.03,
                    boxShadow:
                      '0 0 50px rgba(255, 191, 0, 0.8), 0 0 100px rgba(255, 191, 0, 0.5), 0 8px 30px rgba(0, 0, 0, 0.4)',
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Golden gradient overlay */}
                  <div
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,191,0,0.25) 0%, transparent 40%, rgba(255,191,0,0.2) 100%)',
                    }}
                  />
                  {/* Shimmer effect on hover */}
                  <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <svg
                    className="w-6 h-6 flex-shrink-0 relative z-10"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <circle cx="9" cy="11.5" r="1.5" fill="#FFFFFF" />
                    <circle cx="12.5" cy="11.5" r="1.5" fill="#FFFFFF" />
                    <circle cx="16" cy="11.5" r="1.5" fill="#FFFFFF" />
                  </svg>
                  <span className="text-white relative z-10 font-bold">Chat with Wilfred</span>
                  <svg
                    className="w-5 h-5 flex-shrink-0 relative z-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ color: '#FFFFFF' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </motion.button>
              </div>

              <div className="mt-6 flex items-center gap-4 text-[#0A1E86]/70 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Quick Answers</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>No Wait Time</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  Main page component                                                */
/* ================================================================== */

export function HelpCentrePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const faqListRef = useRef<HTMLDivElement>(null);
  const allFaqsRef = useRef<HTMLDivElement>(null);
  const videoTutorialsRef = useRef<HTMLDivElement>(null);

  // Scroll to FAQ section when search button is clicked
  const scrollToFaqs = () => {
    const targetRef = searchQuery ? faqListRef : allFaqsRef;
    if (targetRef.current) {
      targetRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  // Clear category when searching
  useEffect(() => {
    if (searchQuery) {
      setActiveCategory(null);
    }
  }, [searchQuery]);

  // Scroll to FAQ list when category is selected
  const handleCategorySelect = (categoryId: string) => {
    const newCategory = activeCategory === categoryId ? null : categoryId;
    setActiveCategory(newCategory);

    if (newCategory) {
      setTimeout(() => {
        if (newCategory === 'video-tutorials') {
          videoTutorialsRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        } else {
          faqListRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 100);
    }
  };

  return (
    <>
      {/* Spacer for fixed navbar (provided by LandingLayout) */}
      <div className="h-20" />

      <HeroSection
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearchClick={scrollToFaqs}
      />

      {/* Wilfred Chat Section */}
      <WilfredChatSection />

      {/* Quick Answers Section */}
      <QuickAnswersSection />

      <CategoriesSection activeCategory={activeCategory} onCategorySelect={handleCategorySelect} />

      {/* Show Video Tutorials when video-tutorials category is selected */}
      {activeCategory === 'video-tutorials' && (
        <div ref={videoTutorialsRef}>
          <VideoTutorialsSection />
        </div>
      )}

      {/* Show FAQ list when category is selected or searching (but not video-tutorials) */}
      {(activeCategory || searchQuery) && activeCategory !== 'video-tutorials' && (
        <div ref={faqListRef}>
          <FaqList
            categoryId={activeCategory}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
            onOpenAI={() => window.dispatchEvent(new CustomEvent('openAIModal'))}
          />
        </div>
      )}

      {/* Show all FAQs when no category is selected and not searching */}
      {!activeCategory && !searchQuery && (
        <div ref={allFaqsRef}>
          <AllFaqsSection searchQuery={searchQuery} />
        </div>
      )}

      <ResourcesSection />
      <SitemapSection />
      <CtaSection />
    </>
  );
}
