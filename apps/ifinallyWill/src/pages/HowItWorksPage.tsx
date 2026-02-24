/**
 * How It Works — step-by-step explanation of the process
 */

export function HowItWorksPage() {
  return (
    <div>
      <section className="ifw-landing-hero py-16 px-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h1>
        <p className="text-lg opacity-90 max-w-xl mx-auto">
          Create your estate documents in three simple steps.
        </p>
      </section>

      <section className="py-16 px-6 max-w-3xl mx-auto">
        <div className="space-y-12">
          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: 'var(--ifw-primary-700)' }}>
                {i + 1}
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-[var(--ifw-text-muted)]">{step.description}</p>
                {step.details && (
                  <ul className="mt-3 space-y-1">
                    {step.details.map((d) => (
                      <li key={d} className="text-sm text-[var(--ifw-text-muted)] flex items-start gap-2">
                        <span className="text-[var(--ifw-success)] mt-0.5">✓</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 px-6 bg-[var(--ifw-neutral-50)] text-center">
        <h2 className="text-xl font-bold mb-4">Ready to Get Started?</h2>
        <a href="/register" className="inline-block px-8 py-3 text-sm font-medium text-white rounded-lg" style={{ backgroundColor: 'var(--ifw-primary-700)' }}>
          Create Your Will Now
        </a>
      </section>
    </div>
  );
}

const STEPS = [
  {
    title: 'Tell Us About Yourself',
    description: 'Answer simple questions about your family, assets, and wishes. Our wizard guides you through each section.',
    details: [
      'Personal information and family status',
      'List your key people (spouse, children, executors)',
      'Describe your assets and how to distribute them',
    ],
  },
  {
    title: 'Review with Wilfred AI',
    description: 'Our AI assistant Wilfred is available at every step. Ask questions, get explanations, and feel confident about your choices.',
    details: [
      'Plain-language explanations of legal terms',
      'Province-specific guidance for your jurisdiction',
      'Suggestions based on your family situation',
    ],
  },
  {
    title: 'Download & Sign',
    description: 'Pay once and download your professionally formatted documents. Print, sign with witnesses, and you\'re protected.',
    details: [
      'Instant PDF generation',
      'Province-compliant templates',
      'Signing guide included with every document',
    ],
  },
];
