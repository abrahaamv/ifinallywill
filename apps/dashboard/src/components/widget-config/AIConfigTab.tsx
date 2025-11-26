/**
 * AIConfigTab Component
 *
 * Widget configuration tab for AI personality and screen share settings.
 * Allows selecting AI personality and enabling screen share features.
 */

import { useState, useEffect } from 'react';
import { Bot, Monitor, RefreshCw } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Switch,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@platform/ui';
import { trpc } from '../../utils/trpc';

interface AIConfigTabProps {
  widgetId: string;
  currentPersonalityId: string | null;
  currentSettings?: {
    enableScreenShare?: boolean;
    screenSharePrompt?: string;
  };
  onPersonalityChange?: (personalityId: string | null) => void;
  onSettingsChange?: (settings: { enableScreenShare?: boolean; screenSharePrompt?: string }) => void;
}

export function AIConfigTab({
  widgetId,
  currentPersonalityId,
  currentSettings,
  onPersonalityChange,
  onSettingsChange,
}: AIConfigTabProps) {
  const [selectedPersonalityId, setSelectedPersonalityId] = useState<string | null>(
    currentPersonalityId
  );
  const [enableScreenShare, setEnableScreenShare] = useState(
    currentSettings?.enableScreenShare ?? false
  );
  const [screenSharePrompt, setScreenSharePrompt] = useState(
    currentSettings?.screenSharePrompt ?? 'Would you like to share your screen for better assistance?'
  );

  // Fetch available personalities
  const { data: personalities, isLoading: isLoadingPersonalities } =
    trpc.aiPersonalities.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 });

  // Set personality mutation
  const setPersonalityMutation = trpc.widgets.setPersonality.useMutation({
    onSuccess: () => {
      onPersonalityChange?.(selectedPersonalityId);
    },
  });

  // Selected personality details
  const selectedPersonality = personalities?.personalities?.find(
    (p) => p.id === selectedPersonalityId
  );

  // Handle personality change
  const handlePersonalityChange = (personalityId: string) => {
    const newPersonalityId = personalityId === 'none' ? null : personalityId;
    setSelectedPersonalityId(newPersonalityId);
    setPersonalityMutation.mutate({
      widgetId,
      // Schema accepts nullable, but tRPC infers as optional - cast to satisfy both
      personalityId: newPersonalityId as string | undefined,
    });
  };

  // Handle screen share settings change
  useEffect(() => {
    onSettingsChange?.({
      enableScreenShare,
      screenSharePrompt,
    });
  }, [enableScreenShare, screenSharePrompt, onSettingsChange]);

  return (
    <div className="space-y-6">
      {/* AI Personality Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Personality
          </CardTitle>
          <CardDescription>
            Choose the AI personality for this widget. The personality defines
            how the AI assistant responds to users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Personality Selector */}
          <div className="space-y-2">
            <Label htmlFor="personality">Select Personality</Label>
            <Select
              value={selectedPersonalityId ?? 'none'}
              onValueChange={handlePersonalityChange}
              disabled={isLoadingPersonalities || setPersonalityMutation.isPending}
            >
              <SelectTrigger id="personality">
                <SelectValue placeholder="Select a personality..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Use tenant default</span>
                </SelectItem>
                {personalities?.personalities?.map((personality) => (
                  <SelectItem key={personality.id} value={personality.id}>
                    <div className="flex items-center gap-2">
                      <span>{personality.name}</span>
                      {personality.isDefault && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Personality Preview */}
          {selectedPersonality && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{selectedPersonality.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{selectedPersonality.tone}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Temp: {selectedPersonality.temperature} | Max: {selectedPersonality.maxTokens || 1000}
                    </span>
                  </div>
                </div>
              </div>

              {/* System Prompt Preview */}
              <div>
                <Label className="text-xs text-muted-foreground">System Prompt</Label>
                <div className="mt-1 p-3 bg-background rounded border text-sm max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {selectedPersonality.systemPrompt.slice(0, 500)}
                    {selectedPersonality.systemPrompt.length > 500 && '...'}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* No personality selected */}
          {!selectedPersonalityId && (
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                No personality selected. The tenant's default personality will be used.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screen Share Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Screen Sharing
          </CardTitle>
          <CardDescription>
            Enable screen sharing to allow users to share their screen with the AI assistant
            for visual assistance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Screen Share Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enableScreenShare">Enable Screen Sharing</Label>
              <p className="text-sm text-muted-foreground">
                Show a "Share Screen" button in the chat widget
              </p>
            </div>
            <Switch
              id="enableScreenShare"
              checked={enableScreenShare}
              onCheckedChange={setEnableScreenShare}
            />
          </div>

          {/* Screen Share Prompt */}
          {enableScreenShare && (
            <div className="space-y-2">
              <Label htmlFor="screenSharePrompt">Screen Share Prompt</Label>
              <Textarea
                id="screenSharePrompt"
                value={screenSharePrompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScreenSharePrompt(e.target.value)}
                placeholder="Enter a prompt to suggest screen sharing..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                This message may be shown to users to suggest screen sharing for better assistance.
              </p>
            </div>
          )}

          {/* LiveKit Status */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm">LiveKit integration enabled</span>
          </div>
        </CardContent>
      </Card>

      {/* Save Status */}
      {setPersonalityMutation.isPending && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Saving changes...
        </div>
      )}
    </div>
  );
}
