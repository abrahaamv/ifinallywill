/**
 * API Keys Page
 * Generate and manage API keys for widget authentication
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
      console.error('Failed to create API key:', error);
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
      console.error('Failed to copy:', error);
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
      console.error('Failed to revoke API key:', error);
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const getKeyStatusBadge = (key: ApiKey) => {
    if (key.revokedAt) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Revoked
        </span>
      );
    }
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    );
  };

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <p className="text-muted-foreground mt-2">
          Manage API keys for widget authentication and external integrations
        </p>
      </div>

      {/* Create API Key Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Generate New API Key</CardTitle>
          <CardDescription>
            Create a new API key to authenticate your widget or integrate with external services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsCreateDialogOpen(true)}>Generate API Key</Button>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Your API Keys ({keys.length})</CardTitle>
          <CardDescription>Manage your existing API keys</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No API keys created yet</p>
              <p className="text-sm mt-2">Generate your first API key to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Name</th>
                    <th className="text-left py-3 px-4 font-medium">Key Prefix</th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Last Used</th>
                    <th className="text-left py-3 px-4 font-medium">Expires</th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key: ApiKey) => (
                    <tr
                      key={key.id}
                      className="border-b border-border hover:bg-secondary/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium">{key.name}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground font-mono">
                        {key.keyPrefix}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground capitalize">
                          {key.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">{getKeyStatusBadge(key)}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(key.lastUsedAt)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(key.expiresAt)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyKey(key.keyPrefix, key.id)}
                        >
                          {copiedKeyId === key.id ? 'Copied!' : 'Copy Prefix'}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
                className="w-full px-3 py-2 border border-border rounded-md"
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
                    Copy
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                  Security Best Practices:
                </h4>
                <ul className="text-xs text-yellow-700 space-y-1">
                  <li>• Store this key securely (e.g., environment variables)</li>
                  <li>• Never commit API keys to version control</li>
                  <li>• Use different keys for development and production</li>
                  <li>• Revoke keys immediately if compromised</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleCloseNewKeyDialog}>I've Saved This Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
