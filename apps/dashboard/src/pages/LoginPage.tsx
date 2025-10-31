/**
 * Login Page
 * Email/password and OAuth authentication with Auth.js
 *
 * Implements proper Auth.js credentials flow:
 * 1. Fetch CSRF token before form submission
 * 2. Submit credentials with CSRF token
 * 3. Handle Auth.js redirect responses
 * 4. Support MFA (TOTP) when enabled
 */

import { Button } from '@platform/ui';
import { createModuleLogger } from '@platform/shared';
import { useState } from 'react';

const logger = createModuleLogger('LoginPage');

export function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    mfaCode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showMFA, setShowMFA] = useState(false);

  const handleGoogleLogin = () => {
    // Auth.js OAuth flow - direct redirect to provider
    window.location.href = '/api/auth/signin/google';
  };

  const handleMicrosoftLogin = () => {
    // Auth.js OAuth flow - direct redirect to provider
    window.location.href = '/api/auth/signin/microsoft';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!formData.password) {
      setErrors({ password: 'Password is required' });
      return;
    }
    if (showMFA && !formData.mfaCode) {
      setErrors({ mfaCode: 'MFA code is required' });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Fetch CSRF token (required by Auth.js for security)
      const csrfResponse = await fetch('/api/auth/csrf', {
        credentials: 'include', // CRITICAL: Include cookies for session
      });

      if (!csrfResponse.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const { csrfToken } = await csrfResponse.json();

      logger.info('CSRF token fetched', { csrfToken });

      // Step 2: Submit credentials to Auth.js credentials provider
      const loginResponse = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          csrfToken,
          email: formData.email,
          password: formData.password,
          ...(showMFA && formData.mfaCode ? { mfaCode: formData.mfaCode } : {}),
          callbackUrl: '/dashboard', // Where to redirect on success
          json: 'true', // Request JSON response instead of redirect
        }),
        credentials: 'include', // CRITICAL: Include cookies for session
      });

      logger.info('Login response status', { status: loginResponse.status });

      // Auth.js credentials provider returns different status codes:
      // - 200: Success (with JSON response)
      // - 302: Success (with redirect - only if json=false)
      // - 401: Invalid credentials
      // - 500: Server error

      if (loginResponse.status === 401) {
        // Check if MFA is required
        const errorText = await loginResponse.text();
        if (errorText.includes('MFA_REQUIRED')) {
          setShowMFA(true);
          setErrors({ mfaCode: 'MFA code required for this account' });
          setIsLoading(false);
          return;
        }

        setErrors({ submit: 'Invalid email or password' });
        setIsLoading(false);
        return;
      }

      if (!loginResponse.ok) {
        throw new Error('Login failed');
      }

      // Success! Auth.js has set session cookie
      // Check if there's a redirect path stored
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterLogin');
        logger.info('Login successful, redirecting to stored path', { redirectPath });
        window.location.href = redirectPath;
      } else {
        logger.info('Login successful, redirecting to dashboard');
        window.location.href = '/dashboard';
      }
    } catch (error) {
      logger.error('Login error', { error });
      setErrors({
        submit: error instanceof Error ? error.message : 'Login failed. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <a href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
            create a new account
          </a>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {errors.submit && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{errors.submit}</p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
              </div>
              {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                />
              </div>
              {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* MFA Code (conditional) */}
            {showMFA && (
              <div>
                <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-700">
                  MFA Code
                </label>
                <div className="mt-1">
                  <input
                    id="mfaCode"
                    name="mfaCode"
                    type="text"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    value={formData.mfaCode}
                    onChange={handleInputChange}
                    className={`appearance-none block w-full px-3 py-2 border ${
                      errors.mfaCode ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  />
                </div>
                {errors.mfaCode && <p className="mt-2 text-sm text-red-600">{errors.mfaCode}</p>}
                <p className="mt-2 text-xs text-gray-500">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            )}

            {/* Remember me and forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot your password?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span className="sr-only">Sign in with Google</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </Button>

              <Button
                type="button"
                onClick={handleMicrosoftLogin}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                <span className="sr-only">Sign in with Microsoft</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.4 0H0v11.4h11.4V0z" />
                  <path d="M24 0H12.6v11.4H24V0z" />
                  <path d="M11.4 12.6H0V24h11.4V12.6z" />
                  <path d="M24 12.6H12.6V24H24V12.6z" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
