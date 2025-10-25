/**
 * AI Personalities Page - Complete Redesign
 * Card grid layout with modern styling and better UX
 * Inspired by modern dashboard design patterns
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
  Skeleton,
  Textarea,
} from '@platform/ui';
import { AlertCircle, Bot, Brain, Edit, Plus, Star, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { trpc } from '../utils/trpc';

interface Personality {
  id: string;
  name: string;
  tone: 'professional' | 'friendly' | 'casual' | 'empathetic' | 'technical';
  systemPrompt: string;
  knowledgeBaseIds: string[];
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
  usageCount: number;
  lastUsed: Date | null;
  createdAt: Date;
}

interface PersonalityFormData {
  name: string;
  tone: 'professional' | 'friendly' | 'casual' | 'empathetic' | 'technical';
  systemPrompt: string;
  knowledgeBaseIds: string[];
  temperature: number;
  maxTokens: number;
}

export function PersonalitiesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState<Personality | null>(null);
  const [formData, setFormData] = useState<PersonalityFormData>({
    name: '',
    tone: 'professional',
    systemPrompt: '',
    knowledgeBaseIds: [],
    temperature: 0.7,
    maxTokens: 1000,
  });

  const {
    data: personalitiesData,
    isLoading,
    error,
    refetch: refetchPersonalities,
  } = trpc.aiPersonalities.list.useQuery();

  const createPersonalityMutation = trpc.aiPersonalities.create.useMutation();
  const updatePersonalityMutation = trpc.aiPersonalities.update.useMutation();
  const deletePersonalityMutation = trpc.aiPersonalities.delete.useMutation();
  const setDefaultMutation = trpc.aiPersonalities.setDefault.useMutation();

  const personalities = personalitiesData?.personalities || [];

  const totalPersonalities = personalities.length;
  const activePersonalities = personalities.filter((p) => p.usageCount > 0).length;
  const totalUsage = personalities.reduce((sum, p) => sum + p.usageCount, 0);
  const avgUsage = totalPersonalities > 0 ? Math.round(totalUsage / totalPersonalities) : 0;

  const handleCreatePersonality = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPersonalityMutation.mutateAsync(formData);
      setIsCreateOpen(false);
      setFormData({
        name: '',
        tone: 'professional',
        systemPrompt: '',
        knowledgeBaseIds: [],
        temperature: 0.7,
        maxTokens: 1000,
      });
      await refetchPersonalities();
    } catch (error) {
      console.error('Failed to create personality:', error);
    }
  };

  const handleEditPersonality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonality) return;
    try {
      await updatePersonalityMutation.mutateAsync({
        id: selectedPersonality.id,
        ...formData,
      });
      setIsEditOpen(false);
      setSelectedPersonality(null);
      await refetchPersonalities();
    } catch (error) {
      console.error('Failed to update personality:', error);
    }
  };

  const handleDeletePersonality = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete personality "${name}"?`)) {
      return;
    }
    try {
      await deletePersonalityMutation.mutateAsync({ id });
      await refetchPersonalities();
    } catch (error) {
      console.error('Failed to delete personality:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultMutation.mutateAsync({ id });
      await refetchPersonalities();
    } catch (error) {
      console.error('Failed to set default personality:', error);
    }
  };

  const openEditDialog = (personality: Personality) => {
    setSelectedPersonality(personality);
    setFormData({
      name: personality.name,
      tone: personality.tone,
      systemPrompt: personality.systemPrompt,
      knowledgeBaseIds: personality.knowledgeBaseIds,
      temperature: personality.temperature,
      maxTokens: personality.maxTokens,
    });
    setIsEditOpen(true);
  };

  const getToneBadgeColor = (tone: string) => {
    const colors = {
      professional: 'bg-blue-100 text-blue-700 border-blue-200',
      friendly: 'bg-green-100 text-green-700 border-green-200',
      casual: 'bg-amber-100 text-amber-700 border-amber-200',
      empathetic: 'bg-purple-100 text-purple-700 border-purple-200',
      technical: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[tone as keyof typeof colors] || colors.professional;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Personalities</h1>
          <p className="mt-2 text-gray-600">
            Configure AI assistants with custom tones, knowledge, and behaviors
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Personality
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <Brain className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {isLoading ? '—' : totalPersonalities}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <Bot className="h-5 w-5 text-green-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {isLoading ? '—' : activePersonalities}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Total Usage</p>
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {isLoading ? '—' : totalUsage.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Avg Usage</p>
              <Bot className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">{isLoading ? '—' : avgUsage}</p>
          </CardContent>
        </Card>
      </div>

      {/* Personalities Grid */}
      <Card className="border-gray-200 shadow-card">
        <CardHeader>
          <CardTitle>All Personalities</CardTitle>
          <CardDescription>{personalities.length} configured AI personalities</CardDescription>
        </CardHeader>

        <CardContent>
          {error ? (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load personalities: {error.message}</p>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : personalities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Brain className="mb-4 h-16 w-16 text-gray-400" />
              <p className="text-gray-600">No personalities configured</p>
              <p className="mt-1 text-sm text-gray-500">
                Create your first AI personality to get started
              </p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Personality
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {personalities.map((personality) => (
                <Card
                  key={personality.id}
                  className="group cursor-pointer border-gray-200 shadow-sm transition-all hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50">
                          <Brain className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {personality.name}
                            {personality.isDefault && (
                              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1 text-xs">
                            <Badge
                              variant="outline"
                              className={getToneBadgeColor(personality.tone)}
                            >
                              {personality.tone.charAt(0).toUpperCase() + personality.tone.slice(1)}
                            </Badge>
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Temperature:</span>
                        <span className="font-medium">{personality.temperature.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Usage:</span>
                        <span className="font-medium">
                          {personality.usageCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Max Tokens:</span>
                        <span className="font-medium">{personality.maxTokens}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {!personality.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleSetDefault(personality.id)}
                        >
                          <Star className="mr-1 h-3 w-3" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(personality)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePersonality(personality.id, personality.name)}
                        disabled={personality.isDefault}
                      >
                        <Trash2 className="h-4 w-4 text-gray-400" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create AI Personality</DialogTitle>
            <DialogDescription>
              Configure a new AI personality with custom behavior
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePersonality} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Professional Support Agent"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select
                value={formData.tone}
                onValueChange={(value) =>
                  setFormData({ ...formData, tone: value as PersonalityFormData['tone'] })
                }
              >
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                placeholder="You are a helpful AI assistant that..."
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                rows={6}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature ({formData.temperature})</Label>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({ ...formData, temperature: Number.parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min="100"
                  max="4000"
                  value={formData.maxTokens}
                  onChange={(e) =>
                    setFormData({ ...formData, maxTokens: Number.parseInt(e.target.value) })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPersonalityMutation.isPending}>
                {createPersonalityMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit AI Personality</DialogTitle>
            <DialogDescription>Update personality configuration</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditPersonality} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tone">Tone</Label>
              <Select
                value={formData.tone}
                onValueChange={(value) =>
                  setFormData({ ...formData, tone: value as PersonalityFormData['tone'] })
                }
              >
                <SelectTrigger id="edit-tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-systemPrompt">System Prompt</Label>
              <Textarea
                id="edit-systemPrompt"
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                rows={6}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-temperature">Temperature ({formData.temperature})</Label>
                <input
                  id="edit-temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({ ...formData, temperature: Number.parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-maxTokens">Max Tokens</Label>
                <Input
                  id="edit-maxTokens"
                  type="number"
                  min="100"
                  max="4000"
                  value={formData.maxTokens}
                  onChange={(e) =>
                    setFormData({ ...formData, maxTokens: Number.parseInt(e.target.value) })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updatePersonalityMutation.isPending}>
                {updatePersonalityMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
