/**
 * About page — company mission, team, contact
 */

export function AboutPage() {
  return (
    <div>
      <section className="ifw-landing-hero py-16 px-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">About IFinallyWill</h1>
        <p className="text-lg opacity-90 max-w-xl mx-auto">
          Making estate planning accessible to every Canadian.
        </p>
      </section>

      <section className="py-16 px-6 max-w-3xl mx-auto">
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold mb-3">Our Mission</h2>
            <p className="text-[var(--ifw-text-muted)] leading-relaxed">
              Over 50% of Canadian adults don&apos;t have a will. Not because they don&apos;t care about
              their families, but because the process feels overwhelming, expensive, and confusing.
              IFinallyWill was built to change that.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">How We&apos;re Different</h2>
            <p className="text-[var(--ifw-text-muted)] leading-relaxed">
              We combine province-specific legal templates with AI guidance to make estate planning
              as simple as filling out a form. Our AI assistant Wilfred explains every section in
              plain language, so you understand exactly what you&apos;re creating.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Legal Validity</h2>
            <p className="text-[var(--ifw-text-muted)] leading-relaxed">
              Every document created on IFinallyWill is designed to comply with your province&apos;s
              estate laws. Our templates are reviewed by Canadian estate lawyers and updated as
              legislation changes. Once signed and witnessed according to your province&apos;s
              requirements, your documents are legally valid.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-3">Contact Us</h2>
            <p className="text-[var(--ifw-text-muted)]">
              Questions? Feedback? We&apos;d love to hear from you.
            </p>
            <p className="text-sm mt-2">
              <strong>Email:</strong>{' '}
              <a href="mailto:support@ifinallywill.com" className="text-[var(--ifw-primary-700)] hover:underline">
                support@ifinallywill.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
