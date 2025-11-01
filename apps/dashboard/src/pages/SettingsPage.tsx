/**
 * Settings Page - Complete Redesign
 * Modern tabbed interface for account, security, and preferences
 * Inspired by modern settings interfaces
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
} from '@platform/ui';
import { AlertCircle, Bell, Globe, Key, Lock, Mail, Shield, User, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { trpc } from '../utils/trpc';

export function SettingsPage() {
  const [isUpdating] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);

  const { data: userData, isLoading } = trpc.users.me.useQuery();

  // Mock settings data
  const securitySettings = {
    mfaEnabled: false,
    lastPasswordChange: '2024-09-15',
    sessionTimeout: 30,
    loginAttempts: 3,
    ipWhitelist: false,
  };

  const notificationSettings = {
    emailNotifications: true,
    slackNotifications: false,
    desktopNotifications: true,
    weeklyDigest: true,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="mt-2 text-muted-foreground">Manage your account, security, and preferences</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Security Score</p>
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{isLoading ? '—' : '85/100'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Enable MFA for 95/100</p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
              <Key className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{isLoading ? '—' : '3'}</p>
            <p className="mt-1 text-xs text-muted-foreground">2 devices, 1 browser</p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Last Login</p>
              <UserCircle className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-xl font-bold text-foreground">{isLoading ? '—' : 'Today'}</p>
            <p className="mt-1 text-xs text-muted-foreground">10:45 AM from Chrome</p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Password Age</p>
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{isLoading ? '—' : '89d'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Consider updating</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Tabs */}
      <Card className="border shadow-card">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="account" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="account">
                  <User className="mr-2 h-4 w-4" />
                  Account
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Shield className="mr-2 h-4 w-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="preferences">
                  <Globe className="mr-2 h-4 w-4" />
                  Preferences
                </TabsTrigger>
              </TabsList>

              {/* Account Settings */}
              <TabsContent value="account" className="space-y-6">
                <Card className="border">
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your account details and email address</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" defaultValue="John" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" defaultValue="Doe" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        defaultValue={userData?.email || 'user@example.com'}
                      />
                      <p className="text-xs text-muted-foreground">Used for login and notifications</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" defaultValue="Acme Inc." />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button disabled={isUpdating}>
                        {isUpdating ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button variant="outline">Cancel</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader>
                    <CardTitle>OAuth Connections</CardTitle>
                    <CardDescription>Manage connected accounts for single sign-on</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                          <Mail className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Google</p>
                          <p className="text-xs text-muted-foreground">john.doe@gmail.com</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Connected</Badge>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                          <UserCircle className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">Microsoft</p>
                          <p className="text-xs text-muted-foreground">Not connected</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Settings */}
              <TabsContent value="security" className="space-y-6">
                <Card className="border">
                  <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>Change your password (Argon2id hashing)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" />
                      <p className="text-xs text-muted-foreground">
                        Minimum 8 characters, 1 uppercase, 1 number, 1 special character
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input id="confirmPassword" type="password" />
                    </div>

                    <Button>Update Password</Button>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader>
                    <CardTitle>Two-Factor Authentication (TOTP MFA)</CardTitle>
                    <CardDescription>
                      Add an extra layer of security with authenticator app
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                          <Shield className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Authenticator App</p>
                          <p className="text-xs text-muted-foreground">
                            {securitySettings.mfaEnabled ? 'Enabled' : 'Not enabled'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={securitySettings.mfaEnabled ? 'outline' : 'default'}
                        onClick={() => setShowMfaSetup(!showMfaSetup)}
                      >
                        {securitySettings.mfaEnabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>

                    {showMfaSetup && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-amber-900">Setting up MFA</p>
                            <p className="mt-1 text-sm text-amber-700">
                              Scan the QR code with your authenticator app, then enter the 6-digit
                              code to verify
                            </p>
                            <div className="mt-4 space-y-3">
                              <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-white">
                                <p className="text-xs text-gray-400">QR Code</p>
                              </div>
                              <Input
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                className="w-48"
                              />
                              <div className="flex gap-2">
                                <Button size="sm">Verify & Enable</Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowMfaSetup(false)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader>
                    <CardTitle>Session Management</CardTitle>
                    <CardDescription>Control session timeout and active devices</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                      <Select defaultValue="30">
                        <SelectTrigger id="sessionTimeout">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="240">4 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4">
                      <Button variant="outline">Revoke All Sessions</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notification Settings */}
              <TabsContent value="notifications" className="space-y-6">
                <Card className="border">
                  <CardHeader>
                    <CardTitle>Email Notifications</CardTitle>
                    <CardDescription>Configure what emails you receive</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">
                          Receive email updates about your account
                        </p>
                      </div>
                      <Switch defaultChecked={notificationSettings.emailNotifications} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Weekly Digest</p>
                        <p className="text-sm text-muted-foreground">Summary of activity and insights</p>
                      </div>
                      <Switch defaultChecked={notificationSettings.weeklyDigest} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader>
                    <CardTitle>Integration Notifications</CardTitle>
                    <CardDescription>Configure external notification channels</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Slack Notifications</p>
                        <p className="text-sm text-muted-foreground">Send alerts to Slack channels</p>
                      </div>
                      <Switch defaultChecked={notificationSettings.slackNotifications} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Desktop Notifications</p>
                        <p className="text-sm text-muted-foreground">Browser push notifications</p>
                      </div>
                      <Switch defaultChecked={notificationSettings.desktopNotifications} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Preferences */}
              <TabsContent value="preferences" className="space-y-6">
                <Card className="border">
                  <CardHeader>
                    <CardTitle>Regional Settings</CardTitle>
                    <CardDescription>
                      Configure language, timezone, and date formats
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select defaultValue="en">
                        <SelectTrigger id="language">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="fr">Français</SelectItem>
                          <SelectItem value="de">Deutsch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select defaultValue="utc-5">
                        <SelectTrigger id="timezone">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utc-8">Pacific Time (UTC-8)</SelectItem>
                          <SelectItem value="utc-5">Eastern Time (UTC-5)</SelectItem>
                          <SelectItem value="utc+0">UTC</SelectItem>
                          <SelectItem value="utc+1">Central European (UTC+1)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Date Format</Label>
                      <Select defaultValue="mdy">
                        <SelectTrigger id="dateFormat">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                          <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                          <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader>
                    <CardTitle>Interface Preferences</CardTitle>
                    <CardDescription>Customize your dashboard experience</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select defaultValue="light">
                        <SelectTrigger id="theme">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="auto">Auto (System)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Compact Mode</p>
                        <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
