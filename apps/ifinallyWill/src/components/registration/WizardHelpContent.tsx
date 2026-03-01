/**
 * Step-specific FAQ content for the registration help panel
 */

interface Props {
  stepName: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_BY_STEP: Record<string, FaqItem[]> = {
  welcome: [
    {
      question: 'How long does this take?',
      answer:
        'Most people complete the registration in under 5 minutes. You can fill out your will at your own pace afterward.',
    },
    {
      question: 'Is it legally valid?',
      answer:
        'Yes. Our documents are drafted by Canadian lawyers and comply with provincial estate law requirements.',
    },
  ],
  location: [
    {
      question: 'Why does location matter?',
      answer:
        'Estate law varies by province. Your location determines which legal templates and requirements apply to your will.',
    },
    {
      question: 'What if I live outside Canada?',
      answer:
        'Our service currently covers all Canadian provinces and territories. If you live abroad, select the province where you have the strongest legal connection.',
    },
  ],
  name: [
    {
      question: 'Why do you need my legal name?',
      answer:
        'Your will must use your full legal name to be valid. This is the name on your government-issued ID.',
    },
    {
      question: 'Can I use a nickname?',
      answer:
        'You can add a common name (nickname) in the will-building process. The registration needs your legal name.',
    },
  ],
  account: [
    {
      question: 'Why do I need an account?',
      answer:
        'Your account lets you save progress, access documents anytime, and make updates as your life changes.',
    },
    {
      question: 'Is my data secure?',
      answer:
        'Yes. We use bank-level encryption and never share your personal information with third parties.',
    },
  ],
  secondaryWill: [
    {
      question: 'What is a secondary will?',
      answer:
        'A secondary will covers assets like private company shares that don\u2019t require probate. It can save your family thousands in probate fees.',
    },
    {
      question: 'Who needs one?',
      answer:
        'Business owners with incorporated or limited companies in Ontario or British Columbia benefit most from a secondary will.',
    },
  ],
  poa: [
    {
      question: 'What is a Power of Attorney?',
      answer:
        'A POA lets someone you trust make decisions for you if you become unable to do so. There are two types: Property (financial) and Health (medical).',
    },
    {
      question: 'Do I need both types?',
      answer:
        'We recommend both for complete protection. A Property POA covers finances; a Health POA covers medical decisions.',
    },
  ],
  partner: [
    {
      question: 'Why do you ask about my partner?',
      answer:
        'Your spouse or common-law partner plays an important role in estate planning. They may be a beneficiary, executor, or both.',
    },
    {
      question: 'What is common-law?',
      answer:
        'Common-law status varies by province, but generally applies to couples who have lived together in a conjugal relationship for a certain period.',
    },
  ],
  partnerName: [
    {
      question: 'Why do you need my partner\u2019s info?',
      answer:
        'If your partner is named in your will (as beneficiary, executor, etc.), we need their legal name for the documents.',
    },
    {
      question: 'Is their email required?',
      answer:
        'No, email is optional. It\u2019s useful if you want them to receive a copy or create their own will.',
    },
  ],
  packageSelection: [
    {
      question: 'What\u2019s included in each package?',
      answer:
        'Each package includes different document types. The Complete Estate Package includes your will plus both POAs for comprehensive protection.',
    },
    {
      question: 'Can I upgrade later?',
      answer: 'Yes! You can upgrade your package at any time from your dashboard.',
    },
  ],
  checkout: [
    {
      question: 'When do I pay?',
      answer:
        'Payment is only required when you\u2019re ready to generate your final documents. You can fill everything out for free.',
    },
    {
      question: 'Can I cancel?',
      answer: 'Yes. You can cancel at any time before generating your documents for a full refund.',
    },
  ],
};

const DEFAULT_FAQ: FaqItem[] = [
  {
    question: 'How does this work?',
    answer:
      'Answer a few questions, and we\u2019ll create legally valid estate documents tailored to your province and situation.',
  },
  { question: 'Need help?', answer: 'Contact our team via chat or call us at (289) 678-1689.' },
];

export function WizardHelpContent({ stepName }: Props) {
  const items = FAQ_BY_STEP[stepName] || DEFAULT_FAQ;

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="faq-item">
          <div className="faq-question">
            <span>{item.question}</span>
          </div>
          <div className="faq-answer">{item.answer}</div>
        </div>
      ))}

      <div
        style={{
          marginTop: '3rem',
          padding: '1.5rem',
          background: 'rgba(10, 30, 134, 0.04)',
          borderRadius: '0.75rem',
          border: '1px solid rgba(10, 30, 134, 0.08)',
        }}
      >
        <h3 style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#0C1F3C' }}>
          We&apos;re here to help
        </h3>
        <p style={{ color: '#1E3A5F', fontSize: '1rem', marginBottom: 0, fontWeight: 500 }}>
          Contact our team via chat or call us at{' '}
          <span style={{ color: '#0A1E86', fontWeight: 600 }}>(289) 678-1689</span>
        </p>
      </div>
    </div>
  );
}
