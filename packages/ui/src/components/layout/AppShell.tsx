/**
 * AppShell - Main application layout container
 * Provides consistent structure with sidebar and content area
 */

import type { ReactNode } from 'react';

interface AppShellProps {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebar, header, children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex-shrink-0">{sidebar}</aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-gray-200 bg-white">{header}</header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto h-full max-w-[var(--content-max-width)] px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
