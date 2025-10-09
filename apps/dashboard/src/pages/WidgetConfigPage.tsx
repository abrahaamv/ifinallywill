/**
 * Widget Configuration Page
 * Create and configure embeddable widgets with live preview
 */

import {
  Alert,
  AlertDescription,
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
} from '@platform/ui';
import { useState } from 'react';
import { trpc } from '../utils/trpc';

interface WidgetSettings {
  theme: 'light' | 'dark' | 'auto';
  position: 'bottom-right' | 'bottom-left';
  greeting?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface Widget {
  id: string;
  name: string;
  domainWhitelist: string[];
  settings: WidgetSettings | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

export function WidgetConfigPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [isEmbedDialogOpen, setIsEmbedDialogOpen] = useState(false);

  // Form state
  const [widgetName, setWidgetName] = useState('');
  const [domainWhitelist, setDomainWhitelist] = useState<string[]>(['']);
  const [settings, setSettings] = useState<WidgetSettings>({
    theme: 'light',
    position: 'bottom-right',
    greeting: 'Hi! How can I help you today?',
    primaryColor: '#3b82f6',
    secondaryColor: '#1e40af',
  });

  // tRPC queries and mutations
  const { data: widgetsData, refetch: refetchWidgets } = trpc.widgets.list.useQuery({
    limit: 50,
    offset: 0,
  });
  const createWidgetMutation = trpc.widgets.create.useMutation();
  const deleteWidgetMutation = trpc.widgets.delete.useMutation();

  const widgets = widgetsData?.widgets || [];

  const handleAddDomain = () => {
    setDomainWhitelist([...domainWhitelist, '']);
  };

  const handleRemoveDomain = (index: number) => {
    setDomainWhitelist(domainWhitelist.filter((_, i) => i !== index));
  };

  const handleDomainChange = (index: number, value: string) => {
    const newDomains = [...domainWhitelist];
    newDomains[index] = value;
    setDomainWhitelist(newDomains);
  };

  const handleCreateWidget = async (e: React.FormEvent) => {
    e.preventDefault();

    const validDomains = domainWhitelist.filter((d) => d.trim() !== '');
    if (validDomains.length === 0 || !widgetName.trim()) return;

    try {
      await createWidgetMutation.mutateAsync({
        name: widgetName.trim(),
        domainWhitelist: validDomains,
        settings,
      });

      setWidgetName('');
      setDomainWhitelist(['']);
      setSettings({
        theme: 'light',
        position: 'bottom-right',
        greeting: 'Hi! How can I help you today?',
        primaryColor: '#3b82f6',
        secondaryColor: '#1e40af',
      });
      setIsCreateDialogOpen(false);
      await refetchWidgets();
    } catch (error) {
      console.error('Failed to create widget:', error);
    }
  };

  const handleShowEmbed = (widget: Widget) => {
    setSelectedWidget(widget);
    setIsEmbedDialogOpen(true);
  };

  const handleDeleteWidget = async (widgetId: string, widgetName: string) => {
    if (!confirm(`Are you sure you want to delete widget "${widgetName}"?`)) {
      return;
    }

    try {
      await deleteWidgetMutation.mutateAsync({ id: widgetId });
      await refetchWidgets();
    } catch (error) {
      console.error('Failed to delete widget:', error);
    }
  };

  const getEmbedCode = (widget: Widget) => {
    const widgetSettings = widget.settings || {
      theme: 'light' as const,
      position: 'bottom-right' as const,
    };

    return `<!-- AI Assistant Widget -->
<script>
  (function() {
    window.AI_WIDGET_CONFIG = {
      widgetId: "${widget.id}",
      apiUrl: "${window.location.origin}",
      theme: "${widgetSettings.theme || 'light'}",
      position: "${widgetSettings.position || 'bottom-right'}",
      greeting: "${widgetSettings.greeting || 'Hi! How can I help you today?'}",
      primaryColor: "${widgetSettings.primaryColor || '#3b82f6'}",
      secondaryColor: "${widgetSettings.secondaryColor || '#1e40af'}"
    };
    var script = document.createElement('script');
    script.src = '${window.location.origin}/widget/embed.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
  };

  const handleCopyEmbed = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      alert('Embed code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Widget Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Create and manage embeddable AI assistant widgets for your websites
        </p>
      </div>

      {/* Create Widget Button */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New Widget</CardTitle>
          <CardDescription>
            Configure a new embeddable AI assistant widget for your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsCreateDialogOpen(true)}>Create Widget</Button>
        </CardContent>
      </Card>

      {/* Widgets List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Widgets ({widgets.length})</CardTitle>
          <CardDescription>Manage your embeddable widgets</CardDescription>
        </CardHeader>
        <CardContent>
          {widgets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No widgets created yet</p>
              <p className="text-sm mt-2">Create your first widget to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Domains</th>
                    <th className="text-left py-3 px-4 font-medium">Theme</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Created</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {widgets.map((widget: Widget) => (
                    <tr
                      key={widget.id}
                      className="border-b border-border hover:bg-secondary/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium">{widget.name}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {widget.domainWhitelist.length} domain(s)
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground capitalize">
                          {widget.settings ? widget.settings.theme : 'light'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {widget.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {typeof widget.createdAt === 'string'
                          ? new Date(widget.createdAt).toLocaleDateString()
                          : widget.createdAt.toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleShowEmbed(widget)}>
                          Get Embed Code
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteWidget(widget.id, widget.name)}
                          disabled={deleteWidgetMutation.isPending}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Widget Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Widget</DialogTitle>
            <DialogDescription>
              Configure your AI assistant widget with custom branding and behavior
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateWidget} className="space-y-6 py-4">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Settings</h3>

              <div className="space-y-2">
                <Label htmlFor="widgetName">Widget Name</Label>
                <Input
                  id="widgetName"
                  placeholder="e.g., Main Website Widget"
                  value={widgetName}
                  onChange={(e) => setWidgetName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Allowed Domains</Label>
                {domainWhitelist.map((domain, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="https://example.com"
                      value={domain}
                      onChange={(e) => handleDomainChange(index, e.target.value)}
                      required
                    />
                    {domainWhitelist.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleRemoveDomain(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddDomain}
                  className="w-full"
                >
                  Add Domain
                </Button>
              </div>
            </div>

            {/* Appearance Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Appearance</h3>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <select
                  id="theme"
                  value={settings.theme}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      theme: e.target.value as 'light' | 'dark' | 'auto',
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto (System Preference)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <select
                  id="position"
                  value={settings.position}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      position: e.target.value as 'bottom-right' | 'bottom-left',
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="greeting">Greeting Message</Label>
                <Input
                  id="greeting"
                  placeholder="Hi! How can I help you today?"
                  value={settings.greeting}
                  onChange={(e) => setSettings({ ...settings, greeting: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                      placeholder="#1e40af"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Live Preview</h3>
              <div className="border border-border rounded-lg p-6 bg-gray-50 min-h-[200px] relative">
                <div
                  className={`absolute ${settings.position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'}`}
                >
                  <div
                    className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center cursor-pointer"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Widget will appear here on your website
                </p>
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWidget}
              disabled={
                createWidgetMutation.isPending ||
                !widgetName.trim() ||
                domainWhitelist.every((d) => !d.trim())
              }
            >
              {createWidgetMutation.isPending ? 'Creating...' : 'Create Widget'}
            </Button>
          </DialogFooter>

          {createWidgetMutation.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{createWidgetMutation.error.message}</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={isEmbedDialogOpen} onOpenChange={setIsEmbedDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Widget Embed Code</DialogTitle>
            <DialogDescription>
              Copy this code and paste it into your website's HTML, just before the closing
              &lt;/body&gt; tag
            </DialogDescription>
          </DialogHeader>

          {selectedWidget && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Embed Code</Label>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-xs">
                  {getEmbedCode(selectedWidget)}
                </pre>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Note:</strong> This widget will only work on domains in your whitelist:
                  <ul className="list-disc ml-6 mt-2">
                    {selectedWidget.domainWhitelist.map((domain: string, index: number) => (
                      <li key={index}>{domain}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmbedDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => selectedWidget && handleCopyEmbed(getEmbedCode(selectedWidget))}>
              Copy Embed Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
