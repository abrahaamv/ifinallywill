/**
 * Checkout success page — shown after Stripe payment redirect
 *
 * Stripe redirects here with query params:
 *   ?order={orderId}&payment_intent={pi_xxx}&payment_intent_client_secret={cs_xxx}&redirect_status={succeeded|processing|requires_payment_method}
 *
 * We check `redirect_status` to show the appropriate message and, on
 * success, allow the user to generate and download their documents.
 */

import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trpc } from '../../utils/trpc';

type RedirectStatus = 'succeeded' | 'processing' | 'requires_payment_method';

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order');
  const redirectStatus = (searchParams.get('redirect_status') ?? 'succeeded') as RedirectStatus;
  const paymentIntentId = searchParams.get('payment_intent');

  const { data: order } = trpc.documentOrders.get.useQuery(
    { id: orderId! },
    { enabled: !!orderId }
  );

  const generateDoc = trpc.documentGeneration.generate.useMutation();
  const { data: generatedDocs, refetch } = trpc.documentGeneration.list.useQuery(
    { orderId: orderId! },
    { enabled: !!orderId }
  );

  const handleGenerate = async (estateDocId: string) => {
    if (!orderId) return;
    await generateDoc.mutateAsync({ orderId, estateDocId });
    refetch();
  };

  // Derive the status banner content from Stripe's redirect_status
  const statusContent = useMemo(() => {
    switch (redirectStatus) {
      case 'succeeded':
        return {
          icon: '🎉',
          title: 'Payment Successful!',
          description: 'Your documents are ready to be generated.',
          variant: 'success' as const,
        };
      case 'processing':
        return {
          icon: '⏳',
          title: 'Payment Processing',
          description:
            'Your payment is being processed. We will notify you once it is confirmed and your documents are ready.',
          variant: 'info' as const,
        };
      case 'requires_payment_method':
        return {
          icon: '⚠️',
          title: 'Payment Failed',
          description:
            'Your payment was not successful. Please return to checkout and try again with a different payment method.',
          variant: 'error' as const,
        };
      default:
        return {
          icon: '🎉',
          title: 'Payment Successful!',
          description: 'Your documents are ready to be generated.',
          variant: 'success' as const,
        };
    }
  }, [redirectStatus]);

  if (!orderId) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">No Order Found</h1>
        <button
          type="button"
          onClick={() => navigate('/app/dashboard')}
          className="px-6 py-2.5 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: 'var(--ifw-primary-700)' }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Status Banner */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">{statusContent.icon}</div>
        <h1 className="text-2xl font-bold mb-2">{statusContent.title}</h1>
        <p className="text-[var(--ifw-text-muted)]">{statusContent.description}</p>
        {paymentIntentId && (
          <p className="text-xs text-[var(--ifw-text-muted)] mt-2">
            Payment reference: {paymentIntentId}
          </p>
        )}
      </div>

      {/* Processing state — no document generation until payment clears */}
      {redirectStatus === 'processing' && (
        <div className="border border-[var(--ifw-border)] rounded-xl p-5 mb-6 bg-blue-50">
          <div className="flex items-start gap-3">
            <svg
              className="animate-spin h-5 w-5 text-[var(--ifw-primary-700)] mt-0.5 shrink-0"
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
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium">Payment is being confirmed</p>
              <p className="text-xs text-[var(--ifw-text-muted)] mt-1">
                This usually takes a few moments. You can safely close this page — we will email you
                once your documents are ready.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Failed state — prompt to retry */}
      {redirectStatus === 'requires_payment_method' && (
        <div className="border border-[var(--ifw-error)] rounded-xl p-5 mb-6 bg-red-50">
          <p className="text-sm text-[var(--ifw-error)]">
            Your payment method was declined or could not be charged. Please return to checkout to
            try again.
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-3 px-4 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            Return to Checkout
          </button>
        </div>
      )}

      {/* Order items — only show generate buttons when payment succeeded */}
      {redirectStatus === 'succeeded' && order?.items && order.items.length > 0 && (
        <div className="border border-[var(--ifw-border)] rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4">Your Documents</h2>
          <div className="space-y-3">
            {order.items.map((item) => {
              const generated = (generatedDocs ?? []).find(
                (g) => g.estateDocId === item.estateDocId
              );
              return (
                <div key={item.id} className="flex items-center justify-between py-2">
                  <span className="text-sm">{item.estateDocId}</span>
                  {generated ? (
                    <span className="text-xs font-medium text-[var(--ifw-success)]">Generated</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleGenerate(item.estateDocId)}
                      disabled={generateDoc.isPending}
                      className="text-xs font-medium px-3 py-1 rounded-lg text-white disabled:opacity-40"
                      style={{ backgroundColor: 'var(--ifw-primary-700)' }}
                    >
                      {generateDoc.isPending ? 'Generating...' : 'Generate'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <button
          type="button"
          onClick={() => navigate('/app/dashboard')}
          className="px-6 py-2.5 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: 'var(--ifw-primary-700)' }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
