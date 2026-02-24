/**
 * Registration page — multi-step wizard
 */

import { useNavigate } from 'react-router-dom';
import { WelcomeStep } from '../../components/registration/WelcomeStep';
import { LocationStep } from '../../components/registration/LocationStep';
import { DocumentSelectionStep } from '../../components/registration/DocumentSelectionStep';
import { AccountStep } from '../../components/registration/AccountStep';
import { SummaryStep } from '../../components/registration/SummaryStep';
import { useRegistrationWizard } from '../../hooks/useRegistrationWizard';

const STEP_LABELS = ['Welcome', 'Location', 'Documents', 'Account', 'Review'];

export function RegisterPage() {
  const navigate = useNavigate();
  const wizard = useRegistrationWizard();

  const handleComplete = () => {
    wizard.clearWizard();
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-120px)] py-12 px-6">
      {/* Progress indicator */}
      <div className="max-w-2xl mx-auto mb-10">
        <div className="flex items-center justify-between">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    i < wizard.step
                      ? 'bg-[var(--ifw-primary-700)] text-white'
                      : i === wizard.step
                        ? 'border-2 border-[var(--ifw-primary-700)] text-[var(--ifw-primary-700)]'
                        : 'border border-[var(--ifw-neutral-300)] text-[var(--ifw-neutral-400)]'
                  }`}
                >
                  {i < wizard.step ? '✓' : i + 1}
                </div>
                <span
                  className={`text-xs mt-1 ${
                    i <= wizard.step
                      ? 'text-[var(--ifw-primary-700)] font-medium'
                      : 'text-[var(--ifw-neutral-400)]'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className={`h-px w-12 md:w-20 mx-2 ${
                    i < wizard.step ? 'bg-[var(--ifw-primary-700)]' : 'bg-[var(--ifw-neutral-200)]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      {wizard.step === 0 && (
        <WelcomeStep data={wizard.data} onUpdate={wizard.updateData} onNext={wizard.nextStep} />
      )}
      {wizard.step === 1 && (
        <LocationStep
          data={wizard.data}
          onUpdate={wizard.updateData}
          onNext={wizard.nextStep}
          onPrev={wizard.prevStep}
        />
      )}
      {wizard.step === 2 && (
        <DocumentSelectionStep
          data={wizard.data}
          onUpdate={wizard.updateData}
          onNext={wizard.nextStep}
          onPrev={wizard.prevStep}
        />
      )}
      {wizard.step === 3 && (
        <AccountStep
          data={wizard.data}
          onUpdate={wizard.updateData}
          onNext={wizard.nextStep}
          onPrev={wizard.prevStep}
        />
      )}
      {wizard.step === 4 && (
        <SummaryStep data={wizard.data} onPrev={wizard.prevStep} onComplete={handleComplete} />
      )}
    </div>
  );
}
