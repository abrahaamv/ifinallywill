/**
 * Checkout success page — shown after payment
 * Verifies payment status before enabling document generation.
 * Allows generating and downloading documents.
 */

import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { trpc } from '../../utils/trpc';

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order');

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const generatePdf = trpc.documentGeneration.generatePdf.useMutation();

  const { data: order, isLoading: orderLoading } = trpc.documentOrders.get.useQuery(
    { id: orderId! },
    { enabled: !!orderId, refetchInterval: (query) => {
      // Poll until order is paid (webhook may take a moment)
      const status = query.state.data?.status;
      return status === 'pending' ? 2000 : false;
    }},
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

  const handleDownloadPdf = async (generatedDocId: string, docName: string) => {
    setDownloadingId(generatedDocId);
    try {
      const result = await generatePdf.mutateAsync({ generatedDocId });

      if ('pdfBase64' in result && result.pdfBase64) {
        // Server-side PDF generation succeeded
        const binary = atob(result.pdfBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${docName.replace(/\s+/g, '_')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else if ('htmlFallback' in result && result.htmlFallback) {
        // Puppeteer not available — download as HTML for client-side printing
        const blob = new Blob([result.htmlFallback as string], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${docName.replace(/\s+/g, '_')}.html`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingId(null);
    }
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

  const isPaid = order?.status === 'paid' || order?.status === 'generated' || order?.status === 'downloaded';
  const isPending = order?.status === 'pending';

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        {isPaid ? (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-[var(--ifw-text-muted)]">
              Your documents are ready to be generated.
            </p>
          </>
        ) : isPending ? (
          <>
            <div className="w-8 h-8 border-2 border-[var(--ifw-primary-500)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Processing Payment...</h1>
            <p className="text-[var(--ifw-text-muted)]">
              We're confirming your payment with Stripe. This usually takes a few seconds.
            </p>
          </>
        ) : orderLoading ? (
          <>
            <div className="w-8 h-8 border-2 border-[var(--ifw-primary-500)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Loading Order...</h1>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-2">Payment Issue</h1>
            <p className="text-[var(--ifw-text-muted)]">
              We couldn't verify your payment. Please contact support if you believe this is an error.
            </p>
          </>
        )}
      </div>

      {/* Order items */}
      {isPaid && order?.items && order.items.length > 0 && (
        <div className="border border-[var(--ifw-border)] rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4">Your Documents</h2>
          <div className="space-y-3">
            {order.items.map((item) => {
              const generated = (generatedDocs ?? []).find(
                (g) => (g as Record<string, unknown>).estateDocId === item.estateDocId,
              );
              const genId = generated ? (generated as Record<string, unknown>).id as string : null;

              return (
                <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-b-0 border-[var(--ifw-neutral-100)]">
                  <div>
                    <span className="text-sm font-medium">{item.estateDocId.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {generated ? (
                      <>
                        <span className="text-xs font-medium text-[var(--ifw-success)] flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                          Generated
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(genId!, 'Estate_Document')}
                          disabled={downloadingId === genId}
                          className="text-xs font-medium px-3 py-1 rounded-lg border border-[var(--ifw-primary-300)] text-[var(--ifw-primary-700)] hover:bg-[var(--ifw-primary-50)] disabled:opacity-40"
                        >
                          {downloadingId === genId ? 'Generating PDF...' : 'Download PDF'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleGenerate(item.estateDocId)}
                        disabled={generateDoc.isPending}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
                        style={{ backgroundColor: 'var(--ifw-primary-700)' }}
                      >
                        {generateDoc.isPending ? 'Generating...' : 'Generate'}
                      </button>
                    )}
                  </div>
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
