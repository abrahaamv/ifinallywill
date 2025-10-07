/**
 * Login Page
 * OAuth authentication with Google and Microsoft
 */

import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@platform/ui';

export function LoginPage() {
  const handleGoogleLogin = () => {
    // TODO: Implement OAuth flow with Auth.js
    window.location.href = '/api/auth/signin/google';
  };

  const handleMicrosoftLogin = () => {
    // TODO: Implement OAuth flow with Auth.js
    window.location.href = '/api/auth/signin/microsoft';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your AI Assistant account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" variant="outline" onClick={handleGoogleLogin}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
            Continue with Google
          </Button>

          <Button className="w-full" variant="outline" onClick={handleMicrosoftLogin}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 0H0v11.4h11.4V0z" />
              <path d="M24 0H12.6v11.4H24V0z" />
              <path d="M11.4 12.6H0V24h11.4V12.6z" />
              <path d="M24 12.6H12.6V24H24V12.6z" />
            </svg>
            Continue with Microsoft
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
