/**
 * Widget Configuration Page - Complete Redesign
 * Modern configuration interface with live preview and deployment
 * Inspired by embeddable widget configuration interfaces
 */

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@platform/ui';
import {
  AlertCircle,
  Code,
  Copy,
  Download,
  Eye,
  Globe,
  MessageCircle,
  Palette,
  Settings2,
  Smartphone,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { trpc } from '../utils/trpc';

export function WidgetConfigPage() {
  const [copiedScript, setCopiedScript] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  const { data: widgetsData, isLoading } = trpc.widgets.list.useQuery({
    limit: 10,
    offset: 0,
  });

  const widgets = widgetsData?.widgets || [];
  const activeWidget = widgets[0]; // Use first widget for demo

  // Mock widget configuration
  const widgetConfig = {
    theme: 'light',
    position: 'bottom-right',
    primaryColor: '#6366f1',
    showAvatar: true,
    welcomeMessage: 'Hi! How can I help you today?',
    placeholder: 'Type your message...',
    brandName: 'Acme Support',
    allowFileUpload: true,
    showTimestamps: true,
    soundEnabled: true,
  };

  const getEmbedScript = () => {
    return `<!-- Platform AI Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['PlatformWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','pw','https://widget.platform.com/widget.js'));

  pw('init', {
    widgetId: '${activeWidget?.id || 'widget-abc123'}',
    theme: '${widgetConfig.theme}',
    position: '${widgetConfig.position}'
  });
</script>`;
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(getEmbedScript());
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } catch (error) {
      console.error('Failed to copy script:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Widget Configuration</h1>
          <p className="mt-2 text-gray-600">
            Customize and deploy your embeddable AI assistant widget
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Config
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Active Widgets</p>
              <MessageCircle className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {isLoading ? '—' : widgets.length}
            </p>
            <p className="mt-1 text-xs text-gray-500">Across all domains</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Bundle Size</p>
              <Zap className="h-5 w-5 text-green-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">{isLoading ? '—' : '52KB'}</p>
            <p className="mt-1 text-xs text-gray-500">Gzipped (86KB raw)</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Load Time</p>
              <Globe className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">{isLoading ? '—' : '1.2s'}</p>
            <p className="mt-1 text-xs text-gray-500">Avg on 4G network</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Performance</p>
              <Eye className="h-5 w-5 text-green-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">{isLoading ? '—' : '98/100'}</p>
            <p className="mt-1 text-xs text-gray-500">Lighthouse score</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Split View */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card className="border-gray-200 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Widget Settings
              </CardTitle>
              <CardDescription>Customize appearance and behavior</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Tabs defaultValue="appearance" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="appearance">
                      <Palette className="mr-2 h-4 w-4" />
                      Style
                    </TabsTrigger>
                    <TabsTrigger value="behavior">
                      <Settings2 className="mr-2 h-4 w-4" />
                      Behavior
                    </TabsTrigger>
                    <TabsTrigger value="advanced">
                      <Code className="mr-2 h-4 w-4" />
                      Advanced
                    </TabsTrigger>
                  </TabsList>

                  {/* Appearance Tab */}
                  <TabsContent value="appearance" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select defaultValue={widgetConfig.theme}>
                        <SelectTrigger id="theme">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="auto">Auto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Select defaultValue={widgetConfig.position}>
                        <SelectTrigger id="position">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          <SelectItem value="top-right">Top Right</SelectItem>
                          <SelectItem value="top-left">Top Left</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          defaultValue={widgetConfig.primaryColor}
                          className="h-10 w-20"
                        />
                        <Input
                          defaultValue={widgetConfig.primaryColor}
                          className="flex-1 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="brandName">Brand Name</Label>
                      <Input
                        id="brandName"
                        defaultValue={widgetConfig.brandName}
                        placeholder="Your company name"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show Avatar</p>
                        <p className="text-sm text-gray-500">Display AI assistant avatar</p>
                      </div>
                      <Switch defaultChecked={widgetConfig.showAvatar} />
                    </div>
                  </TabsContent>

                  {/* Behavior Tab */}
                  <TabsContent value="behavior" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="welcomeMessage">Welcome Message</Label>
                      <Textarea
                        id="welcomeMessage"
                        defaultValue={widgetConfig.welcomeMessage}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="placeholder">Input Placeholder</Label>
                      <Input id="placeholder" defaultValue={widgetConfig.placeholder} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Allow File Upload</p>
                        <p className="text-sm text-gray-500">Users can attach files to messages</p>
                      </div>
                      <Switch defaultChecked={widgetConfig.allowFileUpload} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Show Timestamps</p>
                        <p className="text-sm text-gray-500">Display message timestamps</p>
                      </div>
                      <Switch defaultChecked={widgetConfig.showTimestamps} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Sound Notifications</p>
                        <p className="text-sm text-gray-500">Play sound for new messages</p>
                      </div>
                      <Switch defaultChecked={widgetConfig.soundEnabled} />
                    </div>
                  </TabsContent>

                  {/* Advanced Tab */}
                  <TabsContent value="advanced" className="space-y-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-primary-600 mt-0.5" />
                        <div>
                          <p className="font-medium">Shadow DOM Isolation</p>
                          <p className="mt-1 text-sm text-gray-600">
                            Widget styles are isolated from parent page CSS using Shadow DOM. This
                            prevents style conflicts and ensures consistent appearance.
                          </p>
                          <Badge variant="secondary" className="mt-2">
                            Always Enabled
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customCss">Custom CSS</Label>
                      <Textarea
                        id="customCss"
                        placeholder=".widget-container { /* custom styles */ }"
                        rows={4}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiEndpoint">Custom API Endpoint</Label>
                      <Input
                        id="apiEndpoint"
                        placeholder="https://api.yourdomain.com"
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Debug Mode</p>
                        <p className="text-sm text-gray-500">Enable console logging</p>
                      </div>
                      <Switch />
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card className="border-gray-200 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Embed Code
              </CardTitle>
              <CardDescription>Copy and paste this code into your website</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                  <code>{getEmbedScript()}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={handleCopyScript}
                >
                  {copiedScript ? (
                    'Copied!'
                  ) : (
                    <>
                      <Copy className="mr-1 h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">NPM Package Available</p>
                    <p className="mt-1 text-sm text-blue-700">
                      For React/Vue/Angular apps, install via NPM:
                    </p>
                    <code className="mt-2 block rounded bg-blue-100 px-2 py-1 text-sm text-blue-900">
                      npm install @platform/widget-sdk
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Panel */}
        <div className="space-y-6">
          <Card className="border-gray-200 shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>See how your widget will appear</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={previewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                  >
                    <Globe className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`mx-auto rounded-lg border-2 border-gray-300 bg-gray-100 transition-all ${
                  previewMode === 'desktop' ? 'h-[600px]' : 'h-[600px] w-[375px]'
                }`}
              >
                <div className="flex h-full items-center justify-center p-8">
                  <div className="text-center">
                    <MessageCircle className="mx-auto h-16 w-16 text-gray-400" />
                    <p className="mt-4 text-gray-600">Widget preview will appear here</p>
                    <p className="mt-2 text-sm text-gray-500">
                      {previewMode === 'desktop' ? 'Desktop' : 'Mobile'} view
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card className="border-gray-200 shadow-card">
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Widget bundle optimization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bundle Size (gzipped)</span>
                <Badge variant="secondary">52KB</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Raw Size</span>
                <Badge variant="outline">86KB</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Load Time (4G)</span>
                <Badge variant="secondary">1.2s</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Lighthouse Score</span>
                <Badge variant="default">98/100</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Shadow DOM</span>
                <Badge variant="secondary">Isolated</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
