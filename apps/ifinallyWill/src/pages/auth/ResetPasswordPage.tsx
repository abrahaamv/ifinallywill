/**
 * Reset Password page — set a new password using a reset token
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { trpc } from '../../utils/trpc';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const resetMutation = trpc.auth.resetPassword.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;
    try {
      await resetMutation.mutateAsync({
        token,
        password: data.password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 3000);
    } catch {
      // Error is shown via mutation state
    }
  };

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-[var(--ifw-error)]">Invalid Reset Link</h1>
          <p className="text-sm text-[var(--ifw-neutral-500)]">
            This password reset link is invalid or has expired.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-1 text-sm font-medium"
            style={{ color: 'var(--ifw-primary-700)' }}
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ifw-primary-700)' }}>
              Password Reset Successfully
            </h1>
            <p className="mt-3 text-sm text-[var(--ifw-neutral-500)]">
              Your password has been updated. Redirecting you to sign in...
            </p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--ifw-primary-700)' }}
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Sign In
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
            Set New Password
          </h1>
          <p className="text-sm text-[var(--ifw-neutral-500)] mt-2">
            Enter your new password below.
          </p>
        </div>

        {resetMutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-[var(--ifw-error)]">
            {resetMutation.error?.message ||
              'This reset link is invalid or has expired. Please request a new one.'}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-500)]"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ifw-neutral-400)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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
              type={showPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-500)]"
              placeholder="Re-enter your password"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-[var(--ifw-error)] mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={resetMutation.isPending}
            className="w-full py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            {resetMutation.isPending ? 'Resetting...' : 'Reset Password'}
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
