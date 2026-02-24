/**
 * Checkout success page — shown after payment
 * Allows generating and downloading documents.
 */

import { useSearchParams, useNavigate } from 'react-router-dom';
import { trpc } from '../../utils/trpc';

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order');

  const { data: order } = trpc.documentOrders.get.useQuery(
    { id: orderId! },
    { enabled: !!orderId },
  );

  const generateDoc = trpc.documentGeneration.generate.useMutation();
  const { data: generatedDocs, refetch } = trpc.documentGeneration.list.useQuery(
    { orderId: orderId! },
    { enabled: !!orderId },
  );

  const handleGenerate = async (estateDocId: string) => {
    if (!orderId) return;
    await generateDoc.mutateAsync({ orderId, estateDocId });
    refetch();
  };

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
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-[var(--ifw-text-muted)]">
          Your documents are ready to be generated.
        </p>
      </div>

      {/* Order items */}
      {order?.items && order.items.length > 0 && (
        <div className="border border-[var(--ifw-border)] rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4">Your Documents</h2>
          <div className="space-y-3">
            {order.items.map((item) => {
              const generated = (generatedDocs ?? []).find(
                (g) => (g as Record<string, unknown>).estateDocId === item.estateDocId,
              );
              return (
                <div key={item.id} className="flex items-center justify-between py-2">
                  <span className="text-sm">{item.estateDocId}</span>
                  {generated ? (
                    <span className="text-xs font-medium text-[var(--ifw-success)]">
                      Generated
                    </span>
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
