/**
 * Integrations Page - Complete Redesign
 * Third-party integrations, webhooks, and API configuration
 * Modern card-based layout with category filtering
 *
 * Includes Chatwoot integration for human agent escalation.
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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@platform/ui';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Code,
  ExternalLink,
  Headphones,
  Plug,
  Plus,
  Settings,
  Webhook,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { trpc } from '../utils/trpc';

export function IntegrationsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [chatwootDialogOpen, setChatwootDialogOpen] = useState(false);
  const [chatwootConfig, setChatwootConfig] = useState({
    baseUrl: '',
    accountId: '',
    apiAccessToken: '',
    inboxId: '',
  });

  // Check Chatwoot configuration status
  const { data: chatwootStatus } = trpc.escalations.getChatwootStatus.useQuery();

  // Mock integrations data - Chatwoot is special (first-party)
  const availableIntegrations = [
    {
      id: 'chatwoot',
      name: 'Chatwoot',
      category: 'escalation',
      description: 'Human agent escalation inbox for conversations AI cannot resolve',
      status: chatwootStatus?.configured ? 'connected' : 'available',
      icon: '🎧',
      features: ['Human agent handoff', 'AI context sharing', 'Meeting URLs', 'Full transcript'],
      isCore: true, // First-party integration
    },
    {
      id: 'slack',
      name: 'Slack',
      category: 'communication',
      description: 'Send AI conversation summaries and escalation alerts to Slack channels',
      status: 'connected',
      icon: '💬',
      features: ['Real-time notifications', 'Channel routing', 'Thread conversations'],
    },
    {
      id: 'zendesk',
      name: 'Zendesk',
      category: 'helpdesk',
      description: 'Create support tickets from escalated conversations automatically',
      status: 'available',
      icon: '🎫',
      features: ['Ticket creation', 'Status sync', 'Custom fields'],
    },
    {
      id: 'intercom',
      name: 'Intercom',
      category: 'helpdesk',
      description: 'Integrate with Intercom for unified customer communication',
      status: 'available',
      icon: '💼',
      features: ['User sync', 'Conversation history', 'Events tracking'],
    },
    {
      id: 'salesforce',
      name: 'Salesforce',
      category: 'crm',
      description: 'Sync customer data and conversation insights to Salesforce CRM',
      status: 'coming-soon',
      icon: '☁️',
      features: ['Contact sync', 'Opportunity tracking', 'Activity logging'],
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      category: 'crm',
      description: 'Integrate with HubSpot for marketing and sales automation',
      status: 'available',
      icon: '🎯',
      features: ['Contact enrichment', 'Deal tracking', 'Email campaigns'],
    },
    {
      id: 'jira',
      name: 'Jira',
      category: 'project-management',
      description: 'Create Jira issues from bug reports and feature requests',
      status: 'available',
      icon: '📋',
      features: ['Issue creation', 'Custom workflows', 'Priority mapping'],
    },
  ];

  // Mock webhooks data
  const webhooks = [
    {
      id: 'wh-001',
      name: 'Conversation Completed',
      url: 'https://api.acme.com/webhooks/conversation-completed',
      events: ['conversation.completed', 'conversation.escalated'],
      status: 'active',
      lastTriggered: '2024-10-11 14:52',
      successRate: 99.8,
    },
    {
      id: 'wh-002',
      name: 'Cost Threshold Alert',
      url: 'https://api.acme.com/webhooks/cost-alert',
      events: ['budget.threshold_reached'],
      status: 'active',
      lastTriggered: '2024-10-10 09:15',
      successRate: 100,
    },
    {
      id: 'wh-003',
      name: 'Knowledge Gap Detected',
      url: 'https://api.acme.com/webhooks/knowledge-gap',
      events: ['knowledge.gap_identified'],
      status: 'inactive',
      lastTriggered: '2024-10-09 16:30',
      successRate: 98.5,
    },
  ];

  const filteredIntegrations =
    selectedCategory === 'all'
      ? availableIntegrations
      : availableIntegrations.filter((int) => int.category === selectedCategory);

  const connectedCount = availableIntegrations.filter((i) => i.status === 'connected').length;
  const availableCount = availableIntegrations.filter((i) => i.status === 'available').length;
  const activeWebhooks = webhooks.filter((w) => w.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
          <p className="mt-2 text-muted-foreground">Connect with your favorite tools and platforms</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Custom Webhook
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Connected</p>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{connectedCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Active integrations</p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Available</p>
              <Plug className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{availableCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Ready to connect</p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Webhooks</p>
              <Webhook className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{activeWebhooks}</p>
            <p className="mt-1 text-xs text-muted-foreground">Active endpoints</p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Health</p>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">99.9%</p>
            <p className="mt-1 text-xs text-muted-foreground">Webhook success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Available Integrations */}
      <Card className="border shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Available Integrations</CardTitle>
              <CardDescription>Connect with popular platforms and tools</CardDescription>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="escalation">Escalation</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="helpdesk">Help Desk</SelectItem>
                <SelectItem value="crm">CRM</SelectItem>
                <SelectItem value="project-management">Project Management</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredIntegrations.map((integration) => (
              <Card
                key={integration.id}
                className="group cursor-pointer border shadow-sm transition-all hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{integration.icon}</div>
                      <div>
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {integration.category.replace('-', ' ')}
                        </Badge>
                      </div>
                    </div>
                    {integration.status === 'connected' && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{integration.description}</p>

                  <div className="space-y-1">
                    {integration.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-green-600" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Special handling for Chatwoot */}
                  {integration.id === 'chatwoot' ? (
                    <Button
                      size="sm"
                      className="w-full"
                      variant={integration.status === 'connected' ? 'outline' : 'default'}
                      onClick={() => setChatwootDialogOpen(true)}
                    >
                      {integration.status === 'connected' ? (
                        <>
                          <Settings className="mr-2 h-4 w-4" />
                          Configure
                        </>
                      ) : (
                        <>
                          <Headphones className="mr-2 h-4 w-4" />
                          Setup Chatwoot
                        </>
                      )}
                    </Button>
                  ) : integration.status === 'connected' ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="mr-2 h-4 w-4" />
                        Configure
                      </Button>
                      <Button variant="ghost" size="sm">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : integration.status === 'available' ? (
                    <Button size="sm" className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Connect
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" disabled className="w-full">
                      Coming Soon
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card className="border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhooks
          </CardTitle>
          <CardDescription>Configure custom webhook endpoints for real-time events</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Success Rate</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook) => (
                <TableRow key={webhook.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{webhook.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-gray-400" />
                      <span className="font-mono text-sm">{webhook.url}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={webhook.status === 'active' ? 'default' : 'secondary'}>
                      {webhook.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-medium text-green-600">
                      {webhook.successRate}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        Test
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card className="border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            API Configuration
          </CardTitle>
          <CardDescription>Configure API keys and authentication settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label htmlFor="api-endpoint">API Endpoint</Label>
                <div className="mt-2 flex gap-2">
                  <Input id="api-endpoint" value="https://api.platform.ai/v1" readOnly />
                  <Button variant="outline" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="api-key">Production API Key</Label>
                <div className="mt-2 flex gap-2">
                  <Input id="api-key" type="password" value="pk_live_xxxxxxxxxxxxx" readOnly />
                  <Button variant="outline">Regenerate</Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Last used: 2024-10-11 14:52</p>
              </div>

              <div>
                <Label htmlFor="test-api-key">Test API Key</Label>
                <div className="mt-2 flex gap-2">
                  <Input id="test-api-key" type="password" value="pk_test_xxxxxxxxxxxxx" readOnly />
                  <Button variant="outline">Regenerate</Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
                  <AlertCircle className="h-4 w-4" />
                  Security Best Practices
                </h4>
                <ul className="list-inside list-disc space-y-1 text-xs text-blue-800">
                  <li>Never expose API keys in client-side code</li>
                  <li>Use environment variables for key storage</li>
                  <li>Regenerate keys if compromised</li>
                  <li>Use test keys for development only</li>
                  <li>Monitor API usage for anomalies</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">API Features</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rate-limiting" className="cursor-pointer text-sm">
                      Rate Limiting
                    </Label>
                    <Switch id="rate-limiting" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ip-whitelist" className="cursor-pointer text-sm">
                      IP Whitelist
                    </Label>
                    <Switch id="ip-whitelist" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="webhook-signing" className="cursor-pointer text-sm">
                      Webhook Signing
                    </Label>
                    <Switch id="webhook-signing" defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chatwoot Configuration Dialog */}
      <Dialog open={chatwootDialogOpen} onOpenChange={setChatwootDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headphones className="h-5 w-5" />
              Configure Chatwoot
            </DialogTitle>
            <DialogDescription>
              Connect your self-hosted Chatwoot instance for human agent escalation. Agents will
              receive AI conversation context when handling escalated conversations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chatwoot-url">Chatwoot URL</Label>
              <Input
                id="chatwoot-url"
                placeholder="https://chatwoot.yourcompany.com"
                value={chatwootConfig.baseUrl}
                onChange={(e) =>
                  setChatwootConfig((prev) => ({ ...prev, baseUrl: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Your self-hosted Chatwoot instance URL
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chatwoot-account">Account ID</Label>
              <Input
                id="chatwoot-account"
                placeholder="1"
                value={chatwootConfig.accountId}
                onChange={(e) =>
                  setChatwootConfig((prev) => ({ ...prev, accountId: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Found in Chatwoot URL: /app/accounts/{'{'}id{'}'}/...
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chatwoot-token">API Access Token</Label>
              <Input
                id="chatwoot-token"
                type="password"
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={chatwootConfig.apiAccessToken}
                onChange={(e) =>
                  setChatwootConfig((prev) => ({ ...prev, apiAccessToken: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Profile Settings → Access Token in Chatwoot
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chatwoot-inbox">Inbox ID</Label>
              <Input
                id="chatwoot-inbox"
                placeholder="1"
                value={chatwootConfig.inboxId}
                onChange={(e) =>
                  setChatwootConfig((prev) => ({ ...prev, inboxId: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                The API inbox ID for VisualKit escalations
              </p>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <h4 className="mb-1 text-xs font-semibold text-blue-900">Setup Requirements</h4>
              <ul className="list-inside list-disc space-y-1 text-xs text-blue-800">
                <li>Create an API-type inbox in Chatwoot</li>
                <li>
                  Configure webhook URL:{' '}
                  <code className="rounded bg-blue-100 px-1">
                    {window.location.origin}/api/webhooks/chatwoot
                  </code>
                </li>
                <li>Enable events: message_created, conversation_resolved</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setChatwootDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // TODO: Save configuration via tRPC
                console.log('Saving Chatwoot config:', chatwootConfig);
                setChatwootDialogOpen(false);
              }}
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
