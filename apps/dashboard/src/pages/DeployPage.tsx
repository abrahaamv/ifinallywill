/**
 * Deploy Page
 * Widget deployment, customization, and channel management
 * Based on product strategy: Multi-channel widget deployment, customization options*
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
  Switch,
  Textarea,
} from '@platform/ui';
import {
  Check,
  Code,
  Copy,
  Globe,
  MessageCircle,
  Palette,
  Rocket,
  Settings,
  Smartphone,
} from 'lucide-react';
import { useState } from 'react';

export function DeployPage() {
  const [selectedChannel, setSelectedChannel] = useState('website');
  const [widgetPosition, setWidgetPosition] = useState('bottom-right');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');

  // Mock deployment data**
  const deployments = [
    {
      channel: 'Website',
      status: 'active',
      url: 'https://acme.com',
      widget: 'Chat Widget v2.1',
      impressions: 45823,
      conversations: 2847,
    },
    {
      channel: 'Mobile App',
      status: 'active',
      url: 'com.acme.support',
      widget: 'In-App Chat SDK',
      impressions: 23456,
      conversations: 1234,
    },
    {
      channel: 'Slack',
      status: 'pending',
      url: 'acme-team.slack.com',
      widget: 'Slack Bot',
      impressions: 0,
      conversations: 0,
    },
  ];

  // Generate widget code snippet***
  const widgetCode = `<!-- AI Assistant Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['AiAssistantWidget']=o;w[o] = w[o] || function () { (w[o].q = w[o].q || []).push(arguments) };
    js = d.createElement(s), fjs = d.getElementsByTagName(s)[0];
    js.id = o; js.src = f; js.async = 1; fjs.parentNode.insertBefore(js, fjs);
  }(window, document, 'script', 'aiassistant', 'https://cdn.platform.ai/widget.js'));

  aiassistant('init', {
    apiKey: 'pk_live_xxxxxxxxxxxxx',
    position: '${widgetPosition}',
    primaryColor: '${primaryColor}',
    welcomeMessage: 'Hi! How can I help you today?'
  });
</script>`;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Rocket className="h-8 w-8 text-primary" />
            Widget Deployment
          </h1>
          <p className="text-muted-foreground mt-1">
            Deploy AI assistant across your websites, apps, and communication channels
          </p>
        </div>
      </div>

      {/* Active Deployments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {deployments.map((deployment, index) => (
          <Card key={index} className={deployment.status === 'pending' ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{deployment.channel}</CardTitle>
                <Badge variant={deployment.status === 'active' ? 'default' : 'secondary'}>
                  {deployment.status}
                </Badge>
              </div>
              <CardDescription className="text-xs">{deployment.url}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-muted-foreground">{deployment.widget}</div>
              {deployment.status === 'active' && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground">Impressions</div>
                    <div className="text-lg font-bold">
                      {deployment.impressions.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Conversations</div>
                    <div className="text-lg font-bold">
                      {deployment.conversations.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deployment Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget Customization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Widget Customization*
            </CardTitle>
            <CardDescription>Customize appearance and behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={widgetPosition} onValueChange={setWidgetPosition}>
                <SelectTrigger>
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
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10"
                />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Welcome Message</Label>
              <Textarea placeholder="Hi! How can I help you today?" rows={3} />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-avatar" className="cursor-pointer">
                  Show AI Avatar
                </Label>
                <Switch id="show-avatar" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-typing" className="cursor-pointer">
                  Typing Indicators
                </Label>
                <Switch id="enable-typing" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-sound" className="cursor-pointer">
                  Sound Notifications
                </Label>
                <Switch id="enable-sound" />
              </div>
            </div>

            <Button className="w-full">
              <Check className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Installation Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Installation Code**
            </CardTitle>
            <CardDescription>Add this code to your website</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Channel Type</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </div>
                  </SelectItem>
                  <SelectItem value="mobile">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Mobile App
                    </div>
                  </SelectItem>
                  <SelectItem value="slack">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Slack
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Code Snippet</Label>
                <Button variant="ghost" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="relative">
                <pre className="p-4 rounded-lg bg-secondary text-xs overflow-x-auto">
                  <code>{widgetCode}</code>
                </pre>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950">
              <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">
                Installation Steps
              </h4>
              <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                <li>Copy the code snippet above</li>
                <li>Paste it before the closing &lt;/body&gt; tag</li>
                <li>Replace the API key with your actual key</li>
                <li>Save and deploy your website</li>
                <li>Widget will appear automatically</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Advanced Settings***
          </CardTitle>
          <CardDescription>Configure behavior and integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Behavior</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-open" className="cursor-pointer">
                    Auto-open on page load
                  </Label>
                  <Switch id="auto-open" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="proactive" className="cursor-pointer">
                    Proactive messages
                  </Label>
                  <Switch id="proactive" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="offline-msg" className="cursor-pointer">
                    Allow offline messages
                  </Label>
                  <Switch id="offline-msg" defaultChecked />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Features</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    File upload
                  </Label>
                  <Switch id="file-upload" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="screen-share" className="cursor-pointer">
                    Screen sharing
                  </Label>
                  <Switch id="screen-share" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="voice-input" className="cursor-pointer">
                    Voice input
                  </Label>
                  <Switch id="voice-input" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Widget CDN</h4>
                <p className="text-sm text-muted-foreground">
                  Served from global edge locations for optimal performance
                </p>
              </div>
              <Badge variant="secondary">52-86KB gzipped</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Annotations */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3 text-sm">Data Annotations:</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              * Widget customization - Real system supports full theme customization, custom CSS,
              and internationalization
            </p>
            <p>
              ** Installation code - Production widget includes Shadow DOM isolation, TypeScript
              definitions, and React hooks
            </p>
            <p>
              *** Advanced settings - Additional options include rate limiting, session persistence,
              GDPR compliance, and analytics integration
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
