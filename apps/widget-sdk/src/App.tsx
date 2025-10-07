/**
 * Widget SDK App
 * Demo page showing widget in different configurations
 */

import { Widget } from './Widget';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@platform/ui';

export function App() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">AI Assistant Widget SDK</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Embeddable chat widget for your website
          </p>
        </div>

        {/* Installation */}
        <Card>
          <CardHeader>
            <CardTitle>Installation</CardTitle>
            <CardDescription>Add the widget to your website</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2 font-semibold">Via NPM</h3>
              <pre className="rounded-lg bg-muted p-4 text-sm">
                {`npm install @platform/widget-sdk

import { AIWidget } from '@platform/widget-sdk';

function App() {
  return (
    <AIWidget
      apiKey="your-api-key"
      tenantId="your-tenant-id"
      position="bottom-right"
      theme="auto"
    />
  );
}`}
              </pre>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Via CDN</h3>
              <pre className="rounded-lg bg-muted p-4 text-sm">
                {`<script src="https://cdn.platform.com/widget.js"></script>
<script>
  window.AIWidget.init({
    apiKey: 'your-api-key',
    tenantId: 'your-tenant-id',
    position: 'bottom-right',
    theme: 'auto'
  });
</script>`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Options</CardTitle>
            <CardDescription>Customize the widget appearance and behavior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-3 gap-4 border-b pb-2 font-semibold">
                <div>Property</div>
                <div>Type</div>
                <div>Default</div>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2">
                <code>apiKey</code>
                <code>string</code>
                <span className="text-muted-foreground">required</span>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2">
                <code>tenantId</code>
                <code>string</code>
                <span className="text-muted-foreground">required</span>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2">
                <code>position</code>
                <code>string</code>
                <code>'bottom-right'</code>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2">
                <code>theme</code>
                <code>string</code>
                <code>'auto'</code>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2">
                <code>primaryColor</code>
                <code>string</code>
                <code>'#6366f1'</code>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2">
                <code>title</code>
                <code>string</code>
                <code>'AI Assistant'</code>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b pb-2">
                <code>placeholder</code>
                <code>string</code>
                <code>'Type your message...'</code>
              </div>
              <div className="grid grid-cols-3 gap-4 pb-2">
                <code>greeting</code>
                <code>string</code>
                <code>'Hello! How can I help you today?'</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>What makes this widget powerful</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <svg className="mr-2 h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Shadow DOM isolation prevents CSS conflicts
              </li>
              <li className="flex items-center">
                <svg className="mr-2 h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Customizable theming with brand colors
              </li>
              <li className="flex items-center">
                <svg className="mr-2 h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Responsive design works on mobile and desktop
              </li>
              <li className="flex items-center">
                <svg className="mr-2 h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Minimal bundle size (&lt;50KB gzipped)
              </li>
              <li className="flex items-center">
                <svg className="mr-2 h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                TypeScript support with full type definitions
              </li>
              <li className="flex items-center">
                <svg className="mr-2 h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Real-time AI responses (Phase 5 integration)
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Demo widget shown in bottom-right corner •{' '}
            <a href="http://localhost:5174" className="text-primary hover:underline">
              Dashboard
            </a>
            {' • '}
            <a href="http://localhost:5173" className="text-primary hover:underline">
              Home
            </a>
          </p>
        </div>
      </div>

      {/* Demo Widget */}
      <Widget
        position="bottom-right"
        theme="auto"
        primaryColor="#6366f1"
        title="AI Assistant Demo"
        placeholder="Ask me anything..."
        greeting="Hi! This is a demo of the AI Assistant Widget. Try sending a message!"
      />
    </div>
  );
}
