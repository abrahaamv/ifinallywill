/**
 * Support Page
 *
 * Placeholder — Chatwoot integration has been removed.
 * Human agent escalation will be handled via a future integration.
 */

export function SupportPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center px-6">
      <div className="text-5xl mb-4">🎧</div>
      <h1 className="text-2xl font-bold mb-2">Support Dashboard</h1>
      <p className="text-muted-foreground max-w-md">
        Human agent escalation support is not currently configured.
        This feature will be available in a future update.
      </p>
    </div>
  );
}
