/**
 * useWidgetConfig Hook
 *
 * Fetches widget configuration and associated AI personality.
 */

import { trpc } from '../../../utils/trpc';
import type { AIPersonality, Widget } from '../EmbeddableWidgetContext';

export function useWidgetConfig(widgetId: string | null) {
  const { data, isLoading, error, refetch } = trpc.widgets.getWithPersonality.useQuery(
    { widgetId: widgetId! },
    {
      enabled: !!widgetId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  return {
    widget: data?.widget as Widget | null ?? null,
    personality: data?.personality as AIPersonality | null ?? null,
    isLoading,
    error,
    refetch,
  };
}
