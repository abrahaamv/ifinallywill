/**
 * TransitionOverlay Component
 *
 * Shown during mode transitions (chat -> video).
 * Provides visual feedback while LiveKit room is being prepared.
 */

import { useWidgetContext } from './WidgetContext';

export function TransitionOverlay() {
  const { widget } = useWidgetContext();
  const primaryColor = widget?.settings?.primaryColor || '#6366f1';

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      {/* Animated rings */}
      <div className="relative w-24 h-24 mb-6">
        <div
          className="absolute inset-0 rounded-full opacity-20 animate-ping"
          style={{ backgroundColor: primaryColor }}
        />
        <div
          className="absolute inset-2 rounded-full opacity-40 animate-ping [animation-delay:150ms]"
          style={{ backgroundColor: primaryColor }}
        />
        <div
          className="absolute inset-4 rounded-full opacity-60 animate-ping [animation-delay:300ms]"
          style={{ backgroundColor: primaryColor }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center"
        >
          <svg className="h-10 w-10" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        Starting Screen Share
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-[250px]">
        Preparing secure connection to the AI assistant...
      </p>

      {/* Progress bar */}
      <div className="w-48 h-1 bg-muted rounded-full mt-6 overflow-hidden">
        <div
          className="h-full rounded-full animate-[progress_2s_ease-in-out_infinite]"
          style={{
            backgroundColor: primaryColor,
            animation: 'progress 2s ease-in-out infinite'
          }}
        />
      </div>

      <style>{`
        @keyframes progress {
          0% { width: 0%; margin-left: 0; }
          50% { width: 100%; margin-left: 0; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
