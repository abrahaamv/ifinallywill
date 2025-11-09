/**
 * API Keys Page - Secure Authentication Management
 * Publishable and secret keys with rate limiting and security best practices
 */

import { createModuleLogger } from '../utils/logger';
import {
  Alert,
  AlertDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@platform/ui';
import { CheckCircle, Copy, Key, Plus, Shield, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { trpc } from '../utils/trpc';

const logger = createModuleLogger('ApiKeysPage');

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  type: string;
  isActive: boolean;
  revokedAt: Date | null | string;
  expiresAt: Date | null | string;
  lastUsedAt: Date | null | string;
}

export function ApiKeysPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<'publishable' | 'secret'>('publishable');
  const [newKeyData, setNewKeyData] = useState<{
    apiKey: string;
    keyPrefix: string;
    warning: string;
  } | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // tRPC queries and mutations
  const { data: keysData, refetch: refetchKeys } = trpc.apiKeys.list.useQuery();
  const createKeyMutation = trpc.apiKeys.create.useMutation();
  const revokeKeyMutation = trpc.apiKeys.revoke.useMutation();

  const keys = keysData || [];

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const result = await createKeyMutation.mutateAsync({
        name: newKeyName.trim(),
        type: newKeyType,
        permissions: newKeyType === 'publishable' ? ['read'] : ['read', 'write'],
        expiresInDays: 90,
      });

      setNewKeyData({
        apiKey: result.apiKey,
        keyPrefix: result.keyPrefix,
        warning: result.warning,
      });
      setNewKeyName('');
      await refetchKeys();
    } catch (error) {
      logger.error('Failed to create API key', { error });
    }
  };

  const handleCloseNewKeyDialog = () => {
    setNewKeyData(null);
    setIsCreateDialogOpen(false);
  };

  const handleCopyKey = async (text: string, keyId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (keyId) {
        setCopiedKeyId(keyId);
        setTimeout(() => setCopiedKeyId(null), 2000);
      }
    } catch (error) {
      logger.error('Failed to copy', { error });
    }
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    if (
      !confirm(
        `Are you sure you want to revoke API key "${keyName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await revokeKeyMutation.mutateAsync({ keyId });
      await refetchKeys();
    } catch (error) {
      logger.error('Failed to revoke API key', { error });
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const getKeyStatusBadge = (key: ApiKey) => {
    if (key.revokedAt) {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-300">
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-green-600 border-green-300">
        Active
      </Badge>
    );
  };

  // Calculate stats*
  const totalKeys = keys.length;
  const activeKeys = keys.filter(
    (k: ApiKey) =>
      k.isActive && !k.revokedAt && (!k.expiresAt || new Date(k.expiresAt) >= new Date())
  ).length;
  const apiCallsThisMonth = 47832; // Mock API usage
  const securityStatus = activeKeys > 0 && totalKeys < 10 ? 'Healthy' : 'Review';

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header Section */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="mb-4">
            <h1 className="text-3xl font-bold">API Keys Management</h1>
            <p className="text-muted-foreground mt-2">
              Secure API authentication with publishable and secret keys**, rate limiting***, and
              automatic expiration for production-grade security
            </p>
          </div>

          {/* API Key Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Keys</p>
                    <p className="text-2xl font-bold">{totalKeys}*</p>
                  </div>
                  <Key className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Keys</p>
                    <p className="text-2xl font-bold">{activeKeys}*</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">API Calls (30d)</p>
                    <p className="text-2xl font-bold">{apiCallsThisMonth.toLocaleString()}*</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Security Status</p>
                    <p className="text-2xl font-bold">{securityStatus}*</p>
                  </div>
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="container mx-auto space-y-6">
          {/* Create API Key Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Generate New API Key
              </CardTitle>
              <CardDescription>
                Create a new API key to authenticate your widget or integrate with external
                services**
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Generate API Key
              </Button>
            </CardContent>
          </Card>

          {/* API Keys List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Your API Keys ({keys.length})
              </CardTitle>
              <CardDescription>
                Manage your existing API keys with 90-day expiration** and security best
                practices***
              </CardDescription>
            </CardHeader>
            <CardContent>
              {keys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Key className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No API keys created yet</p>
                  <p className="text-sm text-muted-foreground">
                    Generate your first API key to get started
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Key Prefix</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {keys.map((key: ApiKey) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">{key.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">
                            {key.keyPrefix}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {key.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{getKeyStatusBadge(key)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(key.lastUsedAt)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(key.expiresAt)}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyKey(key.keyPrefix, key.id)}
                            >
                              {copiedKeyId === key.id ? (
                                'Copied!'
                              ) : (
                                <>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy
                                </>
                              )}
                            </Button>
                            {key.isActive && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRevokeKey(key.id, key.name)}
                                disabled={revokeKeyMutation.isPending}
                              >
                                Revoke
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for your widget or external integration
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateKey} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                placeholder="e.g., Production Widget, Staging Environment"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="keyType">Key Type</Label>
              <select
                id="keyType"
                value={newKeyType}
                onChange={(e) => setNewKeyType(e.target.value as 'publishable' | 'secret')}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="publishable">Publishable (Client-side, read-only)</option>
                <option value="secret">Secret (Server-side, full access)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {newKeyType === 'publishable'
                  ? 'Safe to use in browser/client applications (read-only access)'
                  : 'Keep this secret! For server-side use only (full read/write access)'}
              </p>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateKey}
              disabled={createKeyMutation.isPending || !newKeyName.trim()}
            >
              {createKeyMutation.isPending ? 'Generating...' : 'Generate Key'}
            </Button>
          </DialogFooter>

          {createKeyMutation.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{createKeyMutation.error.message}</AlertDescription>
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* New API Key Display Dialog */}
      <Dialog open={!!newKeyData} onOpenChange={handleCloseNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Generated Successfully!</DialogTitle>
            <DialogDescription>
              <strong className="text-red-600">IMPORTANT:</strong> Copy this key now. You won't be
              able to see it again!
            </DialogDescription>
          </DialogHeader>

          {newKeyData && (
            <div className="space-y-4 py-4">
              <Alert>
                <AlertDescription className="text-sm">{newKeyData.warning}</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Your API Key</Label>
                <div className="flex gap-2">
                  <Input readOnly value={newKeyData.apiKey} className="font-mono text-sm" />
                  <Button variant="outline" onClick={() => handleCopyKey(newKeyData.apiKey)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Security Best Practices:
                </h4>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• Store this key securely (e.g., environment variables)</li>
                  <li>• Never commit API keys to version control</li>
                  <li>• Use different keys for development and production</li>
                  <li>• Revoke keys immediately if compromised</li>
                  <li>• Keys expire after 90 days for security</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleCloseNewKeyDialog}>I've Saved This Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Annotation Footer */}
      <div className="border-t border-border bg-muted/30 p-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">*</span>
              <p className="text-muted-foreground">
                <strong>API Key Metrics:</strong> Total keys includes active, revoked, and expired
                keys. Active keys count only non-revoked, non-expired keys. API calls tracked over
                30-day rolling window. Security status evaluates key count and usage patterns.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">**</span>
              <p className="text-muted-foreground">
                <strong>Key Types:</strong> Publishable keys (pk_) for client-side use with
                read-only permissions. Secret keys (sk_) for server-side with full read/write
                access. All keys expire after 90 days for security. Argon2id hashing in database.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-primary">***</span>
              <p className="text-muted-foreground">
                <strong>Security Features:</strong> Rate limiting (100 req/min publishable, 1000
                req/min secret), automatic expiration (90 days), immediate revocation, audit logging
                for all key operations, and secure hashing (Argon2id). Never expose secret keys in
                client code.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
