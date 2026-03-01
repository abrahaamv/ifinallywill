/**
 * Step 4: Account creation — email, password, Google OAuth
 * Ported from v6 AccountStep.jsx
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useAssistantForm } from '../../hooks/useAssistantForm';
import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { FloatingInput } from './primitives/FloatingInput';
import { NavButtons } from './primitives/NavButtons';
import { SectionTitle } from './primitives/SectionTitle';
import { StepSubtitle } from './primitives/StepSubtitle';

const accountSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Must be at least 8 characters').or(z.literal('')),
    password_confirmation: z.string().or(z.literal('')),
  })
  .refine((data) => !data.password || data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  });

type AccountFormData = z.infer<typeof accountSchema>;

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AccountStep({ data, onUpdate, onNext, onBack }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');

  const form = useAssistantForm<AccountFormData>({
    schema: accountSchema,
    defaultValues: {
      email: data.email,
      password: data.password,
      password_confirmation: data.password_confirmation,
    },
  });

  const { watch, setValue } = form;

  // Sync form values back to wizard state
  useEffect(() => {
    const subscription = watch((values: Partial<AccountFormData>) => {
      onUpdate({
        email: values.email ?? '',
        password: values.password ?? '',
        password_confirmation: values.password_confirmation ?? '',
      });
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Sync incoming wizard data into form
  useEffect(() => {
    if (data.email !== form.getValues('email')) setValue('email', data.email);
    if (data.password !== form.getValues('password')) setValue('password', data.password);
    if (data.password_confirmation !== form.getValues('password_confirmation'))
      setValue('password_confirmation', data.password_confirmation);
  }, [data.email, data.password, data.password_confirmation]);

  const isGoogleUser = data.is_google_user || !!data.google_id;

  const passwordsMatch = data.password === data.password_confirmation;
  const canContinue = isGoogleUser
    ? !!data.email
    : !!data.email &&
      !!data.password &&
      data.password.length >= 8 &&
      !!data.password_confirmation &&
      passwordsMatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canContinue) return;

    // Basic same-as-primary email validation
    if (emailError) return;

    onNext();
  };

  const handleEmailChange = (val: string) => {
    setValue('email', val);
    if (emailError) setEmailError('');
  };

  const toggleIcon = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--color-text-secondary)',
        fontSize: '0.875rem',
        padding: '0.5rem',
      }}
    >
      {showPassword ? 'Hide' : 'Show'}
    </button>
  );

  return (
    <div className="epilogue-step-card animate-slide-in-right">
      <SectionTitle>It&apos;s time to create an account.</SectionTitle>
      <StepSubtitle>You can log back in and finish anytime. Handy.</StepSubtitle>

      <div className="epilogue-form-container">
        {isGoogleUser && (
          <div
            style={{
              textAlign: 'center',
              padding: '1.5rem',
              backgroundColor: '#d4edda',
              color: '#155724',
              borderRadius: '0.5rem',
              margin: '1.5rem 0',
              fontWeight: 600,
            }}
          >
            &#10003; Connected with Google Account: {data.email}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FloatingInput
            id="account_email"
            label="Email Address"
            value={data.email}
            onChange={handleEmailChange}
            type="email"
            autoComplete="email"
            disabled={isGoogleUser}
            error={emailError}
          />

          {!isGoogleUser && (
            <>
              <FloatingInput
                id="account_password"
                label="Password"
                value={data.password}
                onChange={(v) => setValue('password', v)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                rightElement={toggleIcon}
                error={
                  data.password && data.password.length < 8
                    ? 'Must be at least 8 characters'
                    : undefined
                }
              />
              <FloatingInput
                id="account_password_confirmation"
                label="Confirm Password"
                value={data.password_confirmation}
                onChange={(v) => setValue('password_confirmation', v)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                error={
                  data.password_confirmation && !passwordsMatch
                    ? 'Passwords do not match'
                    : undefined
                }
              />
            </>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={!canContinue}
            style={{ width: '100%' }}
          >
            Continue &rarr;
          </button>

          <p
            style={{
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#000',
              marginTop: '1rem',
            }}
          >
            By signing up, you agree to iFinallyWill&apos;s{' '}
            <Link
              to="/terms-of-service"
              style={{ color: '#0A1E86', textDecoration: 'underline', fontWeight: 500 }}
              target="_blank"
              rel="noopener noreferrer"
            >
              terms of service
            </Link>
          </p>
        </form>

        {!isGoogleUser && (
          <>
            <div
              style={{
                textAlign: 'center',
                margin: '1.5rem 0',
                color: 'var(--color-text-secondary)',
                fontWeight: 600,
              }}
            >
              or
            </div>
            <button type="button" className="google-signin-btn">
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" style={{ marginRight: '0.5rem' }} viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </span>
            </button>
          </>
        )}

        {/* Star rating */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '0.5rem',
              color: '#FFBF00',
              fontSize: '1.25rem',
            }}
          >
            &#9733;&#9733;&#9733;&#9733;&#9733;
          </div>
          <p style={{ fontSize: '1rem', color: '#000', fontWeight: 500 }}>
            Rated 4.8 stars on Google
          </p>
        </div>
      </div>

      <NavButtons onBack={onBack} onNext={() => {}} showBack nextLabel="" nextDisabled />
    </div>
  );
}
