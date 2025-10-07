/**
 * Settings Page
 * User preferences and configuration
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Label } from '@platform/ui';

export function SettingsPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="your@email.com" />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>Manage your API credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">Generate New Key</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
