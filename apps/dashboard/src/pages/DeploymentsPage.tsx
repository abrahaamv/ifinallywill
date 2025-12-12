/**
 * DeploymentsPage - Manage agent deployments across channels
 * Widget, Meeting Room, and SDK deployments
 *
 * Flow: Create Agent (Personalities) → Deploy to Channel (here)
 *
 * Deployment Types:
 * 1. Widget - Embed on websites via <script> tag
 * 2. Meeting Room - Deploy to meet.visualkit.live rooms
 * 3. SDK - Custom integrations via API key + WSS URL
 */

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@platform/ui';
import {
  Bot,
  Code2,
  Copy,
  ExternalLink,
  Globe,
  MessageSquare,
  Plus,
  Settings,
  Video,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc';

interface Deployment {
  id: string;
  name: string;
  type: 'widget' | 'meeting' | 'sdk';
  agentId: string;
  agentName: string;
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  lastActivity?: string;
  config?: {
    domain?: string;
    roomId?: string;
  };
}

const mockDeployments: Deployment[] = [
  {
    id: 'dep-1',
    name: 'Main Website Widget',
    type: 'widget',
    agentId: 'agent-1',
    agentName: 'Support Agent',
    status: 'active',
    createdAt: '2024-01-15',
    lastActivity: '2 hours ago',
    config: { domain: 'example.com' },
  },
  {
    id: 'dep-2',
    name: 'Sales Demo Room',
    type: 'meeting',
    agentId: 'agent-2',
    agentName: 'Sales Assistant',
    status: 'active',
    createdAt: '2024-01-20',
    lastActivity: '1 day ago',
    config: { roomId: 'sales-demo-001' },
  },
  {
    id: 'dep-3',
    name: 'Mobile App Integration',
    type: 'sdk',
    agentId: 'agent-1',
    agentName: 'Support Agent',
    status: 'draft',
    createdAt: '2024-02-01',
  },
];

const deploymentTypeIcons = {
  widget: MessageSquare,
  meeting: Video,
  sdk: Code2,
};

const deploymentTypeLabels = {
  widget: 'Widget',
  meeting: 'Meeting Room',
  sdk: 'SDK Integration',
};

const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  draft: 'bg-yellow-100 text-yellow-800',
};

export function DeploymentsPage() {
  const navigate = useNavigate();
  const [deployments] = useState<Deployment[]>(mockDeployments);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDeploymentType, setNewDeploymentType] = useState<'widget' | 'meeting' | 'sdk'>('widget');
  const [newDeploymentName, setNewDeploymentName] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // Fetch AI Personalities for agent selection
  const { data: personalitiesData } = trpc.aiPersonalities.list.useQuery();
  const personalities = personalitiesData?.personalities || [];

  const handleCopyEmbed = (deploymentId: string) => {
    const embedCode = `<script src="https://widget.visualkit.live/embed.js" data-deployment="${deploymentId}"></script>`;
    navigator.clipboard.writeText(embedCode);
    setCopiedId(deploymentId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateDeployment = () => {
    // TODO: Implement actual deployment creation via tRPC
    console.log('Creating deployment:', { newDeploymentName, newDeploymentType, selectedAgentId });
    setIsCreateDialogOpen(false);
    setNewDeploymentName('');
    setSelectedAgentId('');
  };

  const widgetDeployments = deployments.filter((d) => d.type === 'widget');
  const meetingDeployments = deployments.filter((d) => d.type === 'meeting');
  const sdkDeployments = deployments.filter((d) => d.type === 'sdk');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployments</h1>
          <p className="text-gray-600">
            Deploy your AI agents to widgets, meeting rooms, and custom integrations
          </p>
        </div>
        <div className="flex gap-2">
          {personalities.length === 0 && (
            <Button variant="outline" onClick={() => navigate('/personalities')}>
              <Bot className="mr-2 h-4 w-4" />
              Create Agent First
            </Button>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={personalities.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            New Deployment
          </Button>
        </div>
      </div>

      {/* No Agents Alert */}
      {personalities.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 py-4">
            <Bot className="h-8 w-8 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">No AI Agents Created Yet</p>
              <p className="text-sm text-amber-700">
                Create an AI Personality first, then deploy it to a widget, meeting room, or SDK
                integration.
              </p>
            </div>
            <Button onClick={() => navigate('/personalities')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Widget Deployments */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Widget Deployments
          </h2>
          <Badge variant="secondary">{widgetDeployments.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {widgetDeployments.map((deployment) => (
            <DeploymentCard
              key={deployment.id}
              deployment={deployment}
              onCopyEmbed={handleCopyEmbed}
              copiedId={copiedId}
            />
          ))}
          <NewDeploymentCard type="widget" />
        </div>
      </section>

      {/* Meeting Room Deployments */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Video className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Meeting Room Deployments
          </h2>
          <Badge variant="secondary">{meetingDeployments.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meetingDeployments.map((deployment) => (
            <DeploymentCard
              key={deployment.id}
              deployment={deployment}
              onCopyEmbed={handleCopyEmbed}
              copiedId={copiedId}
            />
          ))}
          <NewDeploymentCard type="meeting" />
        </div>
      </section>

      {/* SDK Integrations */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Code2 className="h-5 w-5 text-orange-600" />
          <h2 className="text-lg font-semibold text-gray-900">SDK Integrations</h2>
          <Badge variant="secondary">{sdkDeployments.length}</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sdkDeployments.map((deployment) => (
            <DeploymentCard
              key={deployment.id}
              deployment={deployment}
              onCopyEmbed={handleCopyEmbed}
              copiedId={copiedId}
            />
          ))}
          <NewDeploymentCard type="sdk" />
        </div>
      </section>

      {/* Create Deployment Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Deployment</DialogTitle>
            <DialogDescription>
              Deploy an AI agent to a widget, meeting room, or SDK integration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Deployment Type */}
            <div className="space-y-2">
              <Label>Deployment Type</Label>
              <Select
                value={newDeploymentType}
                onValueChange={(v) => setNewDeploymentType(v as typeof newDeploymentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="widget">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Widget - Embed on websites</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="meeting">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      <span>Meeting Room - meet.visualkit.live</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sdk">
                    <div className="flex items-center gap-2">
                      <Code2 className="h-4 w-4" />
                      <span>SDK - Custom integration</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Deployment Name */}
            <div className="space-y-2">
              <Label htmlFor="deploymentName">Deployment Name</Label>
              <Input
                id="deploymentName"
                placeholder="e.g., Main Website Widget, Sales Demo Room"
                value={newDeploymentName}
                onChange={(e) => setNewDeploymentName(e.target.value)}
              />
            </div>

            {/* Agent Selection */}
            <div className="space-y-2">
              <Label>AI Agent</Label>
              <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an AI agent to deploy" />
                </SelectTrigger>
                <SelectContent>
                  {personalities.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        <span>{agent.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {agent.tone}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {personalities.length === 0 && (
                <p className="text-xs text-amber-600">
                  No agents available.{' '}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      navigate('/personalities');
                    }}
                  >
                    Create one first
                  </button>
                </p>
              )}
            </div>

            {/* Type-specific configuration hints */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              {newDeploymentType === 'widget' && (
                <p className="text-xs text-gray-600">
                  <strong>Widget:</strong> Embed a chat widget on any website using a simple script
                  tag. Supports voice, text, and screen sharing.
                </p>
              )}
              {newDeploymentType === 'meeting' && (
                <p className="text-xs text-gray-600">
                  <strong>Meeting Room:</strong> Deploy to a dedicated room at
                  meet.visualkit.live. Perfect for sales demos, onboarding, and support sessions.
                </p>
              )}
              {newDeploymentType === 'sdk' && (
                <p className="text-xs text-gray-600">
                  <strong>SDK:</strong> Build custom integrations using our TypeScript/Python SDK.
                  Use your own UI with our AI infrastructure.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateDeployment}
              disabled={!newDeploymentName || !selectedAgentId}
            >
              <Zap className="mr-2 h-4 w-4" />
              Create Deployment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeploymentCard({
  deployment,
  onCopyEmbed,
  copiedId,
}: {
  deployment: Deployment;
  onCopyEmbed: (id: string) => void;
  copiedId: string | null;
}) {
  const Icon = deploymentTypeIcons[deployment.type];

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gray-100 p-2">
              <Icon className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <CardTitle className="text-base">{deployment.name}</CardTitle>
              <CardDescription className="text-xs">
                {deployment.agentName}
              </CardDescription>
            </div>
          </div>
          <Badge className={statusColors[deployment.status]}>
            {deployment.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deployment.config?.domain && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Globe className="h-3 w-3" />
              <span>{deployment.config.domain}</span>
            </div>
          )}
          {deployment.config?.roomId && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Video className="h-3 w-3" />
              <span>{deployment.config.roomId}</span>
            </div>
          )}
          {deployment.lastActivity && (
            <p className="text-xs text-gray-500">
              Last activity: {deployment.lastActivity}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            {deployment.type === 'widget' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCopyEmbed(deployment.id)}
              >
                <Copy className="mr-1 h-3 w-3" />
                {copiedId === deployment.id ? 'Copied!' : 'Embed Code'}
              </Button>
            )}
            {deployment.type === 'meeting' && (
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-1 h-3 w-3" />
                Open Room
              </Button>
            )}
            <Button variant="ghost" size="sm">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewDeploymentCard({ type }: { type: 'widget' | 'meeting' | 'sdk' }) {
  const Icon = deploymentTypeIcons[type];
  const label = deploymentTypeLabels[type];

  return (
    <Card className="flex cursor-pointer items-center justify-center border-2 border-dashed border-gray-200 transition-colors hover:border-gray-400 hover:bg-gray-50">
      <CardContent className="py-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <Icon className="h-6 w-6 text-gray-400" />
        </div>
        <p className="font-medium text-gray-600">Add {label}</p>
        <p className="mt-1 text-xs text-gray-400">Deploy agent to new channel</p>
      </CardContent>
    </Card>
  );
}
