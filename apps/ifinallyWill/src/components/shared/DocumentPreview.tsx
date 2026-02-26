/**
 * Reusable document preview component
 * Renders HTML in a scrollable A4-styled container with print support.
 */

import { useRef, useCallback } from 'react';

interface Props {
  html: string;
  title: string;
  onClose: () => void;
}

export function DocumentPreview({ html, title, onClose }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: letter; margin: 1in; }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
            max-width: 6.5in;
            margin: 0 auto;
          }
          h1 { font-size: 16pt; text-align: center; margin-bottom: 24pt; }
          h2 { font-size: 14pt; margin-top: 18pt; margin-bottom: 12pt; }
          h3 { font-size: 12pt; margin-top: 12pt; margin-bottom: 8pt; }
          p { margin-bottom: 8pt; text-align: justify; }
          ol, ul { margin-bottom: 8pt; padding-left: 24pt; }
          li { margin-bottom: 4pt; }
          .signature-line {
            border-bottom: 1px solid #000;
            width: 250px;
            display: inline-block;
            margin-top: 36pt;
          }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }, [html, title]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-[var(--ifw-neutral-100)] flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-[var(--ifw-neutral-100)]"
          >
            Back to Checklist
          </button>
        </div>
      </div>

      {/* A4-styled preview container */}
      <div
        ref={contentRef}
        className="border border-[var(--ifw-border)] rounded-lg bg-white shadow-sm overflow-y-auto"
        style={{
          maxHeight: '65vh',
          padding: '48px 56px',
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: '12px',
          lineHeight: '1.6',
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: html }}
          className="document-preview-content"
        />
      </div>

      <p className="text-[10px] text-[var(--ifw-text-muted)] text-center">
        This is a preview. The final document may differ in formatting.
      </p>
    </div>
  );
}
