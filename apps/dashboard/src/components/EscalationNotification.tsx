/**
 * Escalation Notification Component
 * Real-time notification UI for human agent escalations
 * Phase 11 Week 4
 */

import { useState } from 'react';
import { trpc } from '../utils/trpc';
import { Button } from '@platform/ui/components/button';
import { Card } from '@platform/ui/components/card';
import { Badge } from '@platform/ui/components/badge';
import type { Escalation } from '@platform/db';

interface EscalationNotificationProps {
  escalation: Escalation & {
    session?: {
      endUser?: {
        name?: string;
        phoneNumber?: string;
        email?: string;
      };
    };
  };
  onDismiss?: () => void;
}

export function EscalationNotification({ escalation, onDismiss }: EscalationNotificationProps) {
  const [isJoining, setIsJoining] = useState(false);

  const joinCall = trpc.escalations.agentJoined.useMutation({
    onSuccess: () => {
      // Open meeting in new tab
      if (escalation.meetingUrl) {
        window.open(escalation.meetingUrl, '_blank');
      }
      onDismiss?.();
    },
    onError: (error: unknown) => {
      console.error('Failed to join escalation:', error);
      alert('Failed to join meeting. Please try again.');
      setIsJoining(false);
    },
  });

  const handleJoin = async () => {
    setIsJoining(true);
    await joinCall.mutateAsync({
      escalationId: escalation.id,
    });
  };

  const priorityColors = {
    low: 'bg-blue-50 border-blue-400 text-blue-800',
    medium: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    high: 'bg-red-50 border-red-400 text-red-800',
  };

  const priorityBadgeColors = {
    low: 'default',
    medium: 'secondary',
    high: 'destructive',
  } as const;

  const priority = (escalation as any).priority || 'medium';

  return (
    <Card
      className={`border-l-4 p-4 ${priorityColors[priority as keyof typeof priorityColors]}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-lg">
              🚨 New Escalation
            </h4>
            <Badge variant={priorityBadgeColors[priority as keyof typeof priorityBadgeColors]}>
              {priority.toUpperCase()}
            </Badge>
            <Badge variant="outline">
              {escalation.escalationType?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
            </Badge>
          </div>

          <p className="text-sm mb-2">
            <strong>Reason:</strong> {escalation.reason}
          </p>

          {escalation.session?.endUser && (
            <div className="text-sm space-y-1">
              {escalation.session.endUser.name && (
                <p>
                  <strong>User:</strong> {escalation.session.endUser.name}
                </p>
              )}
              {escalation.session.endUser.phoneNumber && (
                <p>
                  <strong>Phone:</strong> {escalation.session.endUser.phoneNumber}
                </p>
              )}
              {escalation.session.endUser.email && (
                <p>
                  <strong>Email:</strong> {escalation.session.endUser.email}
                </p>
              )}
            </div>
          )}

          {!escalation.withinServiceHours && escalation.scheduledFollowupAt && (
            <p className="text-sm mt-2 italic">
              ⏰ Scheduled for follow-up: {new Date(escalation.scheduledFollowupAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleJoin}
            disabled={isJoining || !escalation.withinServiceHours}
            className="whitespace-nowrap"
          >
            {isJoining ? 'Joining...' : '📞 Join Meeting'}
          </Button>
          {onDismiss && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </div>
      </div>

      {!escalation.withinServiceHours && (
        <div className="mt-3 pt-3 border-t border-yellow-300">
          <p className="text-xs text-yellow-700">
            ℹ️ This escalation occurred outside service hours. It has been scheduled for follow-up during business hours.
          </p>
        </div>
      )}
    </Card>
  );
}

/**
 * Escalation List Component
 * Shows all pending escalations for the tenant
 */
interface EscalationListProps {
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export function EscalationList({ autoRefresh = true, refreshIntervalMs = 30000 }: EscalationListProps) {
  const { data, isLoading, refetch } = trpc.escalations.list.useQuery(
    { limit: 20 },
    {
      refetchInterval: autoRefresh ? refreshIntervalMs : false,
    }
  );

  if (isLoading) {
    return <div>Loading escalations...</div>;
  }

  const escalations = data || [];

  if (escalations.length === 0) {
    return (
      <Card className="p-6 text-center text-gray-500">
        <p>No pending escalations</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {escalations.map((escalation: any) => (
        <EscalationNotification
          key={escalation.id}
          escalation={escalation as Escalation}
          onDismiss={() => refetch()}
        />
      ))}
    </div>
  );
}
