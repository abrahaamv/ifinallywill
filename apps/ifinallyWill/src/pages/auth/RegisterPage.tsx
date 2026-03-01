/**
 * Registration page — dynamic multi-step wizard
 * Orchestrates 12 steps with conditional branching based on user data.
 * Ported from v6 Register.jsx.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardHelpContent } from '../../components/registration/WizardHelpContent';
import { useRegistrationWizard } from '../../hooks/useRegistrationWizard';
import { RegistrationLayout } from '../../layouts/RegistrationLayout';
import { useAuth } from '../../providers/AuthProvider';
import '../../styles/register.css';

import { AccountStep } from '../../components/registration/AccountStep';
import { CheckoutStep } from '../../components/registration/CheckoutStep';
import { LocationStep } from '../../components/registration/LocationStep';
import { NameStep } from '../../components/registration/NameStep';
import { POAStep } from '../../components/registration/POAStep';
import { PackageSelectionStep } from '../../components/registration/PackageSelectionStep';
import { PartnerLocationStep } from '../../components/registration/PartnerLocationStep';
import { PartnerNameStep } from '../../components/registration/PartnerNameStep';
import { PartnerStep } from '../../components/registration/PartnerStep';
import { PlanningTogetherStep } from '../../components/registration/PlanningTogetherStep';
import { SecondaryWillStep } from '../../components/registration/SecondaryWillStep';
// Step components
import { WelcomeStep } from '../../components/registration/WelcomeStep';

// Map step IDs to components
const STEP_COMPONENTS: Record<
  string,
  React.ComponentType<{
    data: ReturnType<typeof useRegistrationWizard>['data'];
    onUpdate: ReturnType<typeof useRegistrationWizard>['updateData'];
    onNext: () => void;
    onBack: () => void;
  }>
> = {
  welcome: WelcomeStep,
  location: LocationStep,
  name: NameStep,
  account: AccountStep,
  secondaryWill: SecondaryWillStep,
  poa: POAStep,
  partner: PartnerStep,
  partnerName: PartnerNameStep,
  partnerLocation: PartnerLocationStep,
  planningTogether: PlanningTogetherStep,
  packageSelection: PackageSelectionStep,
  checkout: CheckoutStep,
};

export function RegisterPage() {
  const navigate = useNavigate();
  const wizard = useRegistrationWizard();
  const { signIn } = useAuth();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStepDef = wizard.steps[wizard.step];
  const StepComponent = currentStepDef ? STEP_COMPONENTS[currentStepDef.id] : null;

  // Calculate progress (exclude non-progress steps like welcome)
  const progressSteps = wizard.steps.filter((s) => s.showProgress);
  const currentProgressIndex = progressSteps.findIndex((s) => s === currentStepDef);

  const handleNext = () => {
    // If this is the last step (checkout), complete registration
    if (wizard.isLast) {
      handleComplete();
      return;
    }

    let nextIndex = wizard.step + 1;

    // Skip package selection if flagged
    if (wizard.data.skip_package_selection && wizard.steps[nextIndex]?.id === 'packageSelection') {
      const checkoutIdx = wizard.steps.findIndex((s) => s.id === 'checkout');
      if (checkoutIdx !== -1) nextIndex = checkoutIdx;
      wizard.updateData({ skip_package_selection: false });
    }

    // Skip planning together if coming from couples plan
    if (
      wizard.steps[nextIndex]?.id === 'planningTogether' &&
      wizard.data.from_couples_plan_selection
    ) {
      const pkgIdx = wizard.steps.findIndex((s) => s.id === 'packageSelection');
      if (pkgIdx !== -1) nextIndex = pkgIdx;
      wizard.updateData({ from_couples_plan_selection: false });
    }

    wizard.goToStep(nextIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    wizard.prevStep();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleComplete = () => {
    setLoading(true);
    setError(null);

    const fullName = [wizard.data.first_name, wizard.data.last_name].filter(Boolean).join(' ') || 'Demo User';

    // Demo mode: create a local session and go straight to the dashboard
    signIn({
      id: `demo_${Date.now()}`,
      email: wizard.data.email || 'demo@ifinalllywill.com',
      name: fullName,
      tenantId: 'demo',
      role: 'member',
    });

    wizard.clearWizard();
    navigate('/app/dashboard');
  };

  if (!currentStepDef || !StepComponent) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Error: Step not found</h2>
        <p>
          Step: {wizard.step}, Total: {wizard.steps.length}
        </p>
        <button type="button" onClick={() => wizard.goToStep(0)}>
          Reset
        </button>
      </div>
    );
  }

  return (
    <div className="register-scope">
      <RegistrationLayout
        showProgress={currentStepDef.showProgress}
        currentStep={currentProgressIndex >= 0 ? currentProgressIndex : 0}
        totalSteps={progressSteps.length}
        isHelpOpen={isHelpOpen}
        onToggleHelp={() => setIsHelpOpen(!isHelpOpen)}
        helpContent={<WizardHelpContent stepName={currentStepDef.id} />}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={wizard.step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <StepComponent
              data={wizard.data}
              onUpdate={wizard.updateData}
              onNext={handleNext}
              onBack={handleBack}
            />
          </motion.div>
        </AnimatePresence>

        {/* Registration error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-[var(--ifw-error)] mt-4">
            {error}
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 60,
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '2rem 3rem',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: '3px solid #E5E7EB',
                  borderTopColor: '#0A1E86',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 1rem',
                }}
              />
              <p style={{ color: '#374151', fontWeight: 500 }}>Creating your account...</p>
            </div>
          </div>
        )}
      </RegistrationLayout>
    </div>
  );
}
