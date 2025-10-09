import { Button } from '@platform/ui';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { trpc } from '../utils/trpc';

export function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');

  // Get email from navigation state or show input
  const emailFromState = location.state?.email as string | undefined;
  const tokenFromState = location.state?.verificationToken as string | undefined;
  const tokenFromUrl = searchParams.get('token');

  // tRPC mutations
  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation();
  const resendVerificationMutation = trpc.auth.resendVerification.useMutation();

  // Auto-verify if token in URL or state
  useEffect(() => {
    const token = tokenFromUrl || tokenFromState;
    if (token && !isVerified && !error) {
      handleVerify(token);
    }
  }, [tokenFromUrl, tokenFromState]);

  const handleVerify = async (token: string) => {
    setIsVerifying(true);
    setError('');

    try {
      const result = await verifyEmailMutation.mutateAsync({ token });

      setIsVerified(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: result.message || 'Email verified successfully. You can now log in.',
          },
        });
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!emailFromState) {
      setError('Email address is required to resend verification');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await resendVerificationMutation.mutateAsync({
        email: emailFromState,
      });

      setError(''); // Clear any previous errors
      alert(result.message || 'Verification email sent. Please check your inbox.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Email Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isVerifying && !isVerified && (
            <div className="text-center">
              <svg
                className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-gray-600">Verifying your email...</p>
            </div>
          )}

          {isVerified && (
            <div className="text-center">
              <svg
                className="h-12 w-12 mx-auto mb-4 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Email Verified Successfully!
              </h3>
              <p className="text-gray-600 mb-4">
                Your email has been verified. Redirecting to login...
              </p>
            </div>
          )}

          {error && !isVerified && (
            <div>
              <div className="mb-6 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-red-400 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {emailFromState && (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Didn't receive the email? Check your spam folder or resend the verification
                      link.
                    </p>
                    <Button
                      onClick={handleResend}
                      disabled={isVerifying}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isVerifying ? 'Sending...' : 'Resend Verification Email'}
                    </Button>
                  </div>
                )}

                <div className="text-center">
                  <a
                    href="/signup"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Back to Sign Up
                  </a>
                </div>
              </div>
            </div>
          )}

          {!isVerifying && !isVerified && !error && emailFromState && (
            <div>
              <div className="mb-6 rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 text-blue-400 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">
                      We've sent a verification link to <strong>{emailFromState}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Please check your email and click the verification link to activate your account.
              </p>

              <Button
                onClick={handleResend}
                disabled={isVerifying}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? 'Sending...' : 'Resend Verification Email'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
