/**
 * TransitionOverlay Component
 *
 * Loading overlay displayed during mode transitions.
 */

import { Loader2, Monitor } from 'lucide-react';

export function TransitionOverlay() {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4 p-6 rounded-lg bg-card shadow-lg">
        <div className="relative">
          <Monitor className="h-12 w-12 text-primary" />
          <Loader2 className="h-6 w-6 text-primary animate-spin absolute -bottom-1 -right-1" />
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">Preparing Screen Share</p>
          <p className="text-sm text-muted-foreground">
            Setting up your video session...
          </p>
        </div>
      </div>
    </div>
  );
}
