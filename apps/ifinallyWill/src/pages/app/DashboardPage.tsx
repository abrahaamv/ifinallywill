/**
 * Document portfolio dashboard
 * Shows all estate documents with progress, status, and create action
 */

import { useState } from 'react';
import { CreateDocumentDialog } from '../../components/dashboard/CreateDocumentDialog';
import { DocumentCard } from '../../components/dashboard/DocumentCard';
import { useAuth } from '../../providers/AuthProvider';
import { trpc } from '../../utils/trpc';

export function DashboardPage() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);

  const { data: documents, isLoading, refetch } = trpc.estateDocuments.list.useQuery();

  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <div>
      {/* Gold gradient hero section */}
      <div
        className="py-6 sm:py-10 px-4 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-6 sm:mb-8"
        style={{ background: 'linear-gradient(135deg, #FFBF00 0%, #FFD54F 100%)' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p
              className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-1 sm:mb-2"
              style={{ color: '#0A1E86', opacity: 0.7 }}
            >
              My Dashboard
            </p>
            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3"
              style={{ color: '#0A1E86' }}
            >
              Welcome back, {firstName}
            </h1>
            <p className="text-base sm:text-lg" style={{ color: '#061254' }}>
              Manage your estate planning documents from here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 self-start sm:self-center"
            style={{ backgroundColor: '#0A1E86' }}
          >
            + New Document
          </button>
        </div>
      </div>

      {/* Documents grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-xl p-5 animate-pulse">
              <div className="h-6 w-6 bg-[var(--ifw-neutral-200)] rounded mb-3" />
              <div className="h-4 w-32 bg-[var(--ifw-neutral-200)] rounded mb-2" />
              <div className="h-3 w-20 bg-[var(--ifw-neutral-100)] rounded mb-4" />
              <div className="h-2 bg-[var(--ifw-neutral-100)] rounded-full" />
            </div>
          ))}
        </div>
      ) : documents && documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              id={doc.id}
              documentType={doc.documentType}
              status={doc.status}
              completionPct={doc.completionPct}
              province={doc.province}
              updatedAt={doc.updatedAt.toString()}
              coupleDocId={(doc as { coupleDocId?: string | null }).coupleDocId ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">📄</div>
          <h2 className="text-lg font-semibold mb-2">No documents yet</h2>
          <p className="text-sm text-[var(--ifw-neutral-500)] mb-6">
            Start by creating your first estate document — a will or power of attorney.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-6 py-2.5 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            Create Your First Document
          </button>
        </div>
      )}

      {/* Create dialog */}
      <CreateDocumentDialog
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => refetch()}
      />
    </div>
  );
}
