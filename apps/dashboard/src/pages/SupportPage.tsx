/**
 * Support Page - Chatwoot Embedded Dashboard with SSO
 *
 * Uses Chatwoot Platform API for seamless Single Sign-On.
 * Dashboard users are automatically logged into Chatwoot.
 *
 * SSO Flow:
 * 1. Page loads, calls backend getSSOUrl mutation
 * 2. Backend ensures user exists in Chatwoot (via Platform API)
 * 3. Backend returns one-time SSO URL
 * 4. Page redirects to SSO URL in iframe
 * 5. SSO URL auto-logs user in and redirects to dashboard
 *
 * Fallback: If SSO not configured, shows Chatwoot login page.
 *
 * Architecture:
 * - Development: http://localhost:3003 (nginx proxy)
 * - Production: https://support.visualkit.live
 */

import { useEffect, useState } from 'react';
import { useSession } from '../hooks/useSession';
import { trpc } from '../utils/trpc';

type SSOState =
  | { status: 'loading' }
  | { status: 'sso_redirect'; url: string }
  | { status: 'ready'; iframeUrl: string }
  | { status: 'error'; message: string; fallbackUrl: string };

export function SupportPage() {
  const { session, loading: sessionLoading } = useSession();
  const [ssoState, setSsoState] = useState<SSOState>({ status: 'loading' });

  // Chatwoot URL from environment (fallback)
  const chatwootBaseUrl = import.meta.env.VITE_CHATWOOT_BASE_URL || 'http://localhost:3003';
  const accountId = import.meta.env.VITE_CHATWOOT_ACCOUNT_ID || '1';
  const fallbackUrl = `${chatwootBaseUrl}/app/accounts/${accountId}/dashboard`;

  // SSO mutation
  const getSSOUrl = trpc.chatwoot.getSSOUrl.useMutation({
    onSuccess: (data) => {
      console.log('[SupportPage] SSO response:', data);
      if (data.success && 'ssoUrl' in data && data.ssoUrl) {
        // SSO available - redirect iframe to SSO URL
        // The SSO URL will auto-login and redirect to dashboard
        console.log('[SupportPage] SSO URL received, redirecting...');
        setSsoState({ status: 'sso_redirect', url: data.ssoUrl });
      } else {
        // SSO not configured - use fallback URL (manual login required)
        const errorMsg = 'error' in data ? data.error : ('message' in data ? data.message : 'Unknown error');
        console.log('[SupportPage] SSO not configured, using fallback:', errorMsg);
        const url = 'fallbackUrl' in data && data.fallbackUrl ? data.fallbackUrl : fallbackUrl;
        setSsoState({ status: 'ready', iframeUrl: url });
      }
    },
    onError: (error) => {
      console.error('[SupportPage] SSO error:', error);
      setSsoState({
        status: 'error',
        message: error.message,
        fallbackUrl: fallbackUrl
      });
    },
  });

  // Trigger SSO when session is ready
  useEffect(() => {
    if (session && !sessionLoading && ssoState.status === 'loading') {
      console.log('[SupportPage] Triggering SSO mutation...');
      getSSOUrl.mutate();
    }
  }, [session, sessionLoading, ssoState.status]); // Removed getSSOUrl from deps

  // Handle SSO redirect - load SSO URL in iframe to authenticate
  useEffect(() => {
    if (ssoState.status === 'sso_redirect') {
      // Load SSO URL in iframe - it will authenticate and redirect to dashboard
      console.log('[SupportPage] Loading SSO URL in iframe:', ssoState.url);
      setSsoState({
        status: 'ready',
        iframeUrl: ssoState.url
      });
    }
  }, [ssoState.status]);

  // Loading state - waiting for session
  if (sessionLoading) {
    return (
      <div className="h-[calc(100vh-64px)] -m-6 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!session) {
    window.location.href = '/login';
    return null;
  }

  // SSO in progress - redirecting
  if (ssoState.status === 'loading' || ssoState.status === 'sso_redirect') {
    return (
      <div className="h-[calc(100vh-64px)] -m-6 flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">
            {ssoState.status === 'sso_redirect'
              ? 'Signing you in to Support...'
              : 'Initializing Support Dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state - show message with fallback option
  if (ssoState.status === 'error') {
    return (
      <div className="h-[calc(100vh-64px)] -m-6 flex flex-col">
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800">
          SSO unavailable: {ssoState.message}. Please log in manually.
        </div>
        <iframe
          src={ssoState.fallbackUrl}
          className="flex-1 w-full border-0"
          title="Chatwoot Support Dashboard"
          allow="microphone; camera; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        />
      </div>
    );
  }

  // Ready state - show Chatwoot iframe
  return (
    <div className="h-[calc(100vh-64px)] -m-6 flex flex-col">
      <iframe
        src={ssoState.iframeUrl}
        className="flex-1 w-full border-0"
        title="Chatwoot Support Dashboard"
        allow="microphone; camera; clipboard-write"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
