/**
 * Step 4: Account creation — email/password or Google OAuth
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { RegistrationData } from '../../hooks/useRegistrationWizard';

const accountSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type AccountFormData = z.infer<typeof accountSchema>;

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function AccountStep({ data, onUpdate, onNext, onPrev }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      confirmPassword: data.password,
    },
  });

  const onSubmit = (formData: AccountFormData) => {
    onUpdate({
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
    });
    onNext();
  };

  const API_URL = import.meta.env.VITE_API_URL || '';

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-3 text-center">Create Your Account</h1>
      <p className="text-[var(--ifw-neutral-500)] mb-8 text-center">
        Your documents are saved to your account so you can come back anytime
      </p>

      {/* Google OAuth */}
      <a
        href={`${API_URL}/api/auth/signin/google`}
        className="flex items-center justify-center gap-3 w-full border rounded-lg px-4 py-3 text-sm font-medium hover:bg-[var(--ifw-neutral-50)] transition-colors mb-6"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </a>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-[var(--ifw-neutral-400)]">or</span>
        </div>
      </div>

      {/* Email/Password form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium mb-1">
            Full Name
          </label>
          <input
            id="fullName"
            {...register('fullName')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-500)]"
            placeholder="John Doe"
          />
          {errors.fullName && (
            <p className="text-sm text-[var(--ifw-error)] mt-1">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-500)]"
            placeholder="john@example.com"
          />
          {errors.email && (
            <p className="text-sm text-[var(--ifw-error)] mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-500)]"
            placeholder="At least 8 characters"
          />
          {errors.password && (
            <p className="text-sm text-[var(--ifw-error)] mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-500)]"
            placeholder="Repeat your password"
          />
          {errors.confirmPassword && (
            <p className="text-sm text-[var(--ifw-error)] mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={onPrev}
            className="px-6 py-2 text-sm border rounded-lg hover:bg-[var(--ifw-neutral-100)]"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
