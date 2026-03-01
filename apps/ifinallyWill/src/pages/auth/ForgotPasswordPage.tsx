/**
 * Forgot Password page — request password reset email
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { trpc } from '../../utils/trpc';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const resetRequestMutation = trpc.auth.resetPasswordRequest.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await resetRequestMutation.mutateAsync({ email: data.email });
    } catch {
      // Always show success to prevent email enumeration
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <Mail className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ifw-primary-700)' }}>
              Check Your Email
            </h1>
            <p className="mt-3 text-sm text-[var(--ifw-neutral-500)] leading-relaxed">
              If an account exists with that email address, we&apos;ve sent a password reset link.
              Please check your inbox and spam folder.
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--ifw-primary-700)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ifw-primary-700)' }}>
            Forgot Your Password?
          </h1>
          <p className="text-sm text-[var(--ifw-neutral-500)] mt-2">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {resetRequestMutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-[var(--ifw-error)]">
            Something went wrong. Please try again.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-500)]"
              placeholder="john@example.com"
              autoFocus
            />
            {errors.email && (
              <p className="text-sm text-[var(--ifw-error)] mt-1">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={resetRequestMutation.isPending}
            className="w-full py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            {resetRequestMutation.isPending ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: 'var(--ifw-primary-700)' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
