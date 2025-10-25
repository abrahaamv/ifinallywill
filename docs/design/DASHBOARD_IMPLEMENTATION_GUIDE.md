# Complete Dashboard Implementation Guide
## Phase 10 & Phase 11 - Ready for Development

**Last Updated**: 2025-10-11
**Status**: Implementation Ready
**Tech Stack**: React 18 + Vite 6 + Tailwind CSS v4 + shadcn/ui + tRPC v11
**Timeline**: Phase 10 (Days 1-30) + Phase 11 (ongoing)

---

## Table of Contents

### Phase 10 Dashboards (13 views)
1. [Knowledge Management](#1-knowledge-management-dashboard)
2. [Agent Configuration](#2-agent-configuration-page)
3. [Conversations List & Detail](#3-conversations-list--detail)
4. [Cost Intelligence Dashboard](#4-cost-intelligence-dashboard)
5. [Budget Configuration](#5-budget-configuration)
6. [Knowledge Gaps](#6-knowledge-gaps-dashboard)
7. [Topic Performance Matrix](#7-topic-performance-matrix)
8. [Performance Dashboard (5 KPIs)](#8-performance-dashboard-5-kpis)
9. [Real-time Health Dashboard](#9-real-time-health-dashboard)
10. [Widget Configuration](#10-widget-configuration)
11. [Batch Testing Interface](#11-batch-testing-interface)
12. [Team Management](#12-team-management)
13. [API Keys & Webhooks](#13-api-keys--webhooks)

### Phase 11 Components (5 views)
14. [Escalation Notifications](#14-escalation-notifications)
15. [Service Hours Settings](#15-service-hours-settings)
16. [Chat-First Widget (Enhanced)](#16-chat-first-widget-enhanced)
17. [In-Widget Feedback Modal](#17-in-widget-feedback-modal)
18. [Survey Page](#18-survey-page)

---

# Phase 10 Dashboards

## 1. Knowledge Management Dashboard

**Route**: `/dashboard/knowledge`
**Timeline**: Phase 10, Day 3-4
**Priority**: P0 (Critical - Week 1)

### Layout Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Knowledge Base                                   + Upload  │
├─────────────────────────────────────────────────────────────┤
│  📊 Stats Cards (4 columns)                                 │
│  ┌──────────┬──────────┬──────────┬──────────┐             │
│  │ 127 docs │ 2.4K     │ 94%      │ 23 docs  │             │
│  │ Total    │ Chunks   │ Indexed  │ Pending  │             │
│  └──────────┴──────────┴──────────┴──────────┘             │
├─────────────────────────────────────────────────────────────┤
│  🔍 Search: [________________________] 🎛️ Filters           │
├─────────────────────────────────────────────────────────────┤
│  📄 Documents Table                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Name          │ Type   │ Size  │ Chunks │ Status    │  │
│  ├───────────────┼────────┼───────┼────────┼───────────┤  │
│  │ 📘 API Guide  │ PDF    │ 2.3MB │ 145    │ ✅ Active │  │
│  │ 📗 FAQ        │ MD     │ 45KB  │ 23     │ ✅ Active │  │
│  │ 📙 Setup      │ DOCX   │ 890KB │ 67     │ 🔄 Process│  │
│  └──────────────────────────────────────────────────────┘  │
│  Showing 1-10 of 127               [1][2][3][4][5] →      │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```tsx
// apps/dashboard/src/pages/knowledge/index.tsx

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Search, Filter, FileText, FileCheck, Loader2, Trash2, Download } from 'lucide-react';

export default function KnowledgeManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // tRPC queries
  const { data: stats } = trpc.platform.knowledge.stats.useQuery();
  const { data: documents, isLoading } = trpc.platform.knowledge.list.useQuery({
    search: searchQuery,
    type: selectedType,
    limit: 10,
    offset: 0,
  });

  // Mutations
  const uploadMutation = trpc.platform.knowledge.upload.useMutation();
  const deleteMutation = trpc.platform.knowledge.delete.useMutation();

  const handleUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);

      await uploadMutation.mutateAsync({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        content: await file.text(), // or arrayBuffer for binary files
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">Manage your AI assistant's knowledge sources</p>
        </div>
        <Button onClick={() => document.getElementById('file-upload')?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Documents
        </Button>
        <input
          id="file-upload"
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDocuments ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.recentUploads ?? 0} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chunks</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalChunks ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg {stats?.avgChunksPerDoc ?? 0} per doc
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Indexing Status</CardTitle>
            <Loader2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.indexedPercentage ?? 0}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingDocs ?? 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Queue</CardTitle>
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.processingDocs ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              ~{stats?.estimatedMinutes ?? 0}min remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search documents..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            {documents?.total ?? 0} documents in your knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : documents?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No documents found. Upload your first document to get started.
                  </TableCell>
                </TableRow>
              ) : (
                documents?.items.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      {getFileIcon(doc.type)} {doc.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.type.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(doc.size)}</TableCell>
                    <TableCell>{doc.chunkCount}</TableCell>
                    <TableCell>
                      {doc.status === 'active' && (
                        <Badge className="bg-green-500">Active</Badge>
                      )}
                      {doc.status === 'processing' && (
                        <Badge className="bg-yellow-500">Processing</Badge>
                      )}
                      {doc.status === 'failed' && (
                        <Badge className="bg-red-500">Failed</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(doc.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate({ id: doc.id })}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions
function getFileIcon(type: string) {
  switch (type) {
    case 'pdf': return '📘';
    case 'docx': return '📗';
    case 'txt': return '📄';
    case 'md': return '📝';
    default: return '📄';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}
```

### Data Requirements

**tRPC Endpoints**:
```typescript
// packages/api-contract/src/routers/knowledge.ts

export const knowledgeRouter = router({
  // Get knowledge base stats
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.session.tenantId;

      return {
        totalDocuments: await db.query.knowledgeDocuments.findMany({
          where: eq(knowledgeDocuments.tenantId, tenantId),
        }).then(docs => docs.length),
        totalChunks: await db.query.knowledgeChunks.findMany({
          where: eq(knowledgeChunks.tenantId, tenantId),
        }).then(chunks => chunks.length),
        indexedPercentage: 94,
        pendingDocs: 23,
        processingDocs: 5,
        estimatedMinutes: 12,
        recentUploads: 7,
        avgChunksPerDoc: 18.5,
      };
    }),

  // List documents with pagination and search
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      type: z.string().optional(),
      limit: z.number().default(10),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const documents = await db.query.knowledgeDocuments.findMany({
        where: and(
          eq(knowledgeDocuments.tenantId, ctx.session.tenantId),
          input.search
            ? like(knowledgeDocuments.name, `%${input.search}%`)
            : undefined,
          input.type
            ? eq(knowledgeDocuments.type, input.type)
            : undefined,
        ),
        limit: input.limit,
        offset: input.offset,
      });

      return {
        items: documents,
        total: documents.length,
      };
    }),

  // Upload new document
  upload: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileType: z.string(),
      fileSize: z.number(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Upload to storage (S3, Supabase, etc.)
      const fileUrl = await uploadToStorage({
        bucket: 'knowledge-base',
        path: `${ctx.session.tenantId}/${input.fileName}`,
        content: input.content,
        contentType: input.fileType,
      });

      // 2. Create document record
      const doc = await db.insert(knowledgeDocuments).values({
        tenantId: ctx.session.tenantId,
        name: input.fileName,
        type: input.fileType.split('/')[1],
        size: input.fileSize,
        url: fileUrl,
        status: 'processing',
      }).returning();

      // 3. Trigger chunking job
      await triggerChunkingJob(doc[0].id);

      return doc[0];
    }),

  // Delete document
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(knowledgeDocuments)
        .where(and(
          eq(knowledgeDocuments.id, input.id),
          eq(knowledgeDocuments.tenantId, ctx.session.tenantId),
        ));
    }),
});
```

### Implementation Checklist

- [ ] Create `/dashboard/knowledge` route
- [ ] Implement stats cards with tRPC query
- [ ] Build documents table with pagination
- [ ] Add file upload functionality
- [ ] Implement search and filters
- [ ] Add delete confirmation dialog
- [ ] Show upload progress indicator
- [ ] Handle error states gracefully
- [ ] Add skeleton loaders for loading states
- [ ] Test with different file types (PDF, DOCX, TXT, MD)

---

## 2. Agent Configuration Page

**Route**: `/dashboard/agent/configuration`
**Timeline**: Phase 10, Day 5-7
**Priority**: P0 (Critical - Week 1)

### Layout Overview

```
┌─────────────────────────────────────────────────────────────┐
│  AI Agent Configuration                    [Save Changes]   │
├─────────────────────────────────────────────────────────────┤
│  🎭 Choose Your Agent Personality                           │
│  ┌────────────┬────────────┬────────────┬────────────┐     │
│  │  👔        │  😊        │  💻        │  ⚙️        │     │
│  │Professional│ Friendly   │ Technical  │ Custom     │     │
│  │ Formal,    │ Casual,    │ Code-first,│ Configure  │     │
│  │ concise    │ detailed   │ expert     │ manually   │     │
│  └────────────┴────────────┴────────────┴────────────┘     │
├─────────────────────────────────────────────────────────────┤
│  🤖 Model Selection                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [v] GPT-4o-mini (70%) - Fast, cost-effective         │  │
│  │ [v] GPT-4o (30%) - Complex reasoning                 │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  🎨 Behavior Settings                                       │
│  Reply Length:    [=========|-    ] Detailed                │
│  Formality:       [-    |=========] Very Formal             │
│  Technical Detail:[====|----------] Moderate                │
├─────────────────────────────────────────────────────────────┤
│  📺 Screen Sharing Settings                                 │
│  [✓] Enable screen sharing                                  │
│  Frame Rate: [1 FPS ▼]                                      │
│  Auto-detect content type: [✓]                             │
├─────────────────────────────────────────────────────────────┤
│  📝 Custom Instructions (Advanced)                          │
│  [▼] Show Advanced Settings                                 │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```tsx
// apps/dashboard/src/pages/agent/configuration.tsx

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Settings } from 'lucide-react';
import { toast } from 'sonner';

type PersonalityPreset = 'professional' | 'friendly' | 'technical' | 'custom';

export default function AgentConfigurationPage() {
  const [selectedPreset, setSelectedPreset] = useState<PersonalityPreset>('professional');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // tRPC queries
  const { data: config, isLoading } = trpc.platform.agent.getConfig.useQuery();

  // Mutations
  const updateMutation = trpc.platform.agent.updateConfig.useMutation({
    onSuccess: () => {
      toast.success('Agent configuration saved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const [formData, setFormData] = useState({
    replyLength: config?.replyLength ?? 5,
    formality: config?.formality ?? 8,
    technicalDetail: config?.technicalDetail ?? 5,
    enableScreenSharing: config?.enableScreenSharing ?? true,
    frameRate: config?.frameRate ?? '1',
    autoDetectContentType: config?.autoDetectContentType ?? true,
    customInstructions: config?.customInstructions ?? '',
    temperature: config?.temperature ?? 0.7,
    maxTokens: config?.maxTokens ?? 1000,
  });

  const handlePresetSelect = (preset: PersonalityPreset) => {
    setSelectedPreset(preset);

    switch (preset) {
      case 'professional':
        setFormData({
          ...formData,
          replyLength: 4,
          formality: 8,
          technicalDetail: 5,
          temperature: 0.5,
        });
        break;
      case 'friendly':
        setFormData({
          ...formData,
          replyLength: 7,
          formality: 3,
          technicalDetail: 4,
          temperature: 0.8,
        });
        break;
      case 'technical':
        setFormData({
          ...formData,
          replyLength: 6,
          formality: 6,
          technicalDetail: 9,
          temperature: 0.4,
        });
        break;
      case 'custom':
        // Keep current settings
        break;
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      ...formData,
      preset: selectedPreset === 'custom' ? null : selectedPreset,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Agent Configuration</h1>
          <p className="text-muted-foreground">Customize your AI assistant's personality and behavior</p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Personality Presets */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Your Agent Personality</CardTitle>
          <CardDescription>
            Start with a preset or create a custom configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <PresetCard
              title="Professional"
              icon="👔"
              description="Formal tone, concise replies"
              selected={selectedPreset === 'professional'}
              onClick={() => handlePresetSelect('professional')}
            />
            <PresetCard
              title="Friendly"
              icon="😊"
              description="Conversational, detailed explanations"
              selected={selectedPreset === 'friendly'}
              onClick={() => handlePresetSelect('friendly')}
            />
            <PresetCard
              title="Technical"
              icon="💻"
              description="Code-focused, expert terminology"
              selected={selectedPreset === 'technical'}
              onClick={() => handlePresetSelect('technical')}
            />
            <PresetCard
              title="Custom"
              icon="⚙️"
              description="Configure all settings manually"
              selected={selectedPreset === 'custom'}
              onClick={() => handlePresetSelect('custom')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Model Selection</CardTitle>
          <CardDescription>
            Smart routing: 70% GPT-4o-mini for speed, 30% GPT-4o for complex reasoning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>GPT-4o-mini (70%)</Label>
              <p className="text-sm text-muted-foreground">Fast, cost-effective responses</p>
            </div>
            <Badge className="bg-green-500">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>GPT-4o (30%)</Label>
              <p className="text-sm text-muted-foreground">Complex reasoning and analysis</p>
            </div>
            <Badge className="bg-green-500">Active</Badge>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm">
              <strong>Cost-Optimized Routing:</strong> Our AI automatically selects the best model
              for each query, saving you 75% on AI costs compared to using GPT-4o exclusively.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Behavior Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Behavior Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Reply Length</Label>
            <Slider
              value={[formData.replyLength]}
              onValueChange={([value]) => setFormData({ ...formData, replyLength: value })}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Concise</span>
              <span>Detailed</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Formality</Label>
            <Slider
              value={[formData.formality]}
              onValueChange={([value]) => setFormData({ ...formData, formality: value })}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Casual</span>
              <span>Very Formal</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Technical Detail</Label>
            <Slider
              value={[formData.technicalDetail]}
              onValueChange={([value]) => setFormData({ ...formData, technicalDetail: value })}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Simple</span>
              <span>Expert</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screen Sharing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Screen Sharing Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Screen Sharing</Label>
              <p className="text-sm text-muted-foreground">
                Allow AI to view user screens for better support
              </p>
            </div>
            <Switch
              checked={formData.enableScreenSharing}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, enableScreenSharing: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-detect Content Type</Label>
              <p className="text-sm text-muted-foreground">
                Optimize frame processing based on content (code, video, docs)
              </p>
            </div>
            <Switch
              checked={formData.autoDetectContentType}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, autoDetectContentType: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings (Collapsible) */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Advanced Settings
                </div>
                <span>{showAdvanced ? '▲' : '▼'}</span>
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Temperature (0-2)</Label>
                <Slider
                  value={[formData.temperature * 10]}
                  onValueChange={([value]) =>
                    setFormData({ ...formData, temperature: value / 10 })
                  }
                  max={20}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Current: {formData.temperature.toFixed(1)} - Lower = more focused, Higher = more creative
                </p>
              </div>

              <div className="space-y-2">
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  value={formData.maxTokens}
                  onChange={(e) =>
                    setFormData({ ...formData, maxTokens: parseInt(e.target.value) })
                  }
                  min={100}
                  max={4000}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum length of AI responses (100-4000)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Custom Instructions</Label>
                <Textarea
                  value={formData.customInstructions}
                  onChange={(e) =>
                    setFormData({ ...formData, customInstructions: e.target.value })
                  }
                  placeholder="Add specific instructions for your AI agent..."
                  rows={6}
                />
                <p className="text-sm text-muted-foreground">
                  Additional context or rules for the AI to follow
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

// Preset Card Component
function PresetCard({
  title,
  icon,
  description,
  selected,
  onClick,
}: {
  title: string;
  icon: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-lg ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6 text-center space-y-2">
        <div className="text-4xl">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
```

### Data Requirements

**tRPC Endpoints**:
```typescript
// packages/api-contract/src/routers/agent.ts

export const agentRouter = router({
  // Get current agent configuration
  getConfig: protectedProcedure
    .query(async ({ ctx }) => {
      const config = await db.query.aiPersonalities.findFirst({
        where: eq(aiPersonalities.tenantId, ctx.session.tenantId),
      });

      return config ?? getDefaultConfig();
    }),

  // Update agent configuration
  updateConfig: protectedProcedure
    .input(z.object({
      preset: z.enum(['professional', 'friendly', 'technical']).nullable(),
      replyLength: z.number().min(1).max(10),
      formality: z.number().min(1).max(10),
      technicalDetail: z.number().min(1).max(10),
      enableScreenSharing: z.boolean(),
      frameRate: z.string(),
      autoDetectContentType: z.boolean(),
      customInstructions: z.string(),
      temperature: z.number().min(0).max(2),
      maxTokens: z.number().min(100).max(4000),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.insert(aiPersonalities)
        .values({
          tenantId: ctx.session.tenantId,
          ...input,
        })
        .onConflictDoUpdate({
          target: aiPersonalities.tenantId,
          set: input,
        });

      return { success: true };
    }),
});
```

### Implementation Checklist

- [ ] Create `/dashboard/agent/configuration` route
- [ ] Implement personality preset cards
- [ ] Build behavior sliders with real-time preview
- [ ] Add screen sharing toggle
- [ ] Implement collapsible advanced settings
- [ ] Add form validation
- [ ] Show toast notifications on save
- [ ] Add cost estimate based on settings
- [ ] Test preset transitions
- [ ] Ensure settings persist across sessions

---

## 3. Conversations List & Detail

**Route**: `/dashboard/conversations` + `/dashboard/conversations/:id`
**Timeline**: Phase 10, Day 8-9
**Priority**: P1 (High - Week 2)

### Layout Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Conversations                            🔍 Search          │
├─────────────────────────────────────────────────────────────┤
│  📊 Quick Stats                                             │
│  ┌──────────┬──────────┬──────────┬──────────┐             │
│  │ 1,247    │ 94.2%    │ 2.3 min  │ 4.7/5.0  │             │
│  │ Total    │ Resolved │ Avg Time │ Rating   │             │
│  └──────────┴──────────┴──────────┴──────────┘             │
├─────────────────────────────────────────────────────────────┤
│  Filters: [All] [Resolved] [Escalated] [Last 7 days ▼]     │
├─────────────────────────────────────────────────────────────┤
│  📝 Conversations List                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 👤 John Doe          │ 2m ago  │ ✅ Resolved         │  │
│  │ "How do I reset my password?"                        │  │
│  │ 12 messages | 2.1 min | Rating: 5/5                  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 👤 Jane Smith        │ 15m ago │ 🔄 Active          │  │
│  │ "API integration help needed"                        │  │
│  │ 8 messages | 5.2 min | No rating yet                │  │
│  └──────────────────────────────────────────────────────┘  │
│  Showing 1-20 of 1,247             [1][2][3][4][5] →      │
└─────────────────────────────────────────────────────────────┘

DETAIL VIEW:
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Conversations    John Doe - #CONV-1247          │
├─────────────────────────────────────────────────────────────┤
│  📊 Conversation Metadata                                   │
│  Status: ✅ Resolved | Duration: 2.1 min | Rating: 5/5     │
│  Started: Jan 10, 2025 10:23 AM | Widget: Dashboard v1.0   │
├─────────────────────────────────────────────────────────────┤
│  💬 Message Thread                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 👤 User (10:23 AM)                                   │  │
│  │ How do I reset my password?                          │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 🤖 AI Agent (10:23 AM) [GPT-4o-mini]                │  │
│  │ I can help you reset your password. Here's how:     │  │
│  │ 1. Go to Settings > Account                          │  │
│  │ 2. Click "Change Password"                           │  │
│  │ 3. Enter your current password...                    │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 👤 User (10:24 AM)                                   │  │
│  │ Thanks! That worked perfectly.                       │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  💰 Cost Breakdown                                          │
│  Total: $0.023 | Text: $0.018 | Vision: $0.005             │
│  Models: GPT-4o-mini (11 msgs) + Gemini Flash-Lite (2 fr)  │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```tsx
// apps/dashboard/src/pages/conversations/index.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MessageSquare, CheckCircle, Clock, Star } from 'lucide-react';

export default function ConversationsListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');

  // tRPC queries
  const { data: stats } = trpc.platform.conversations.stats.useQuery();
  const { data: conversations, isLoading } = trpc.platform.conversations.list.useQuery({
    search: searchQuery,
    status: statusFilter === 'all' ? null : statusFilter,
    dateRange,
    limit: 20,
    offset: 0,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Conversations</h1>
          <p className="text-muted-foreground">Monitor and analyze customer interactions</p>
        </div>
        <div className="flex gap-2">
          <Input
            type="search"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Button variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.newToday ?? 0} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.resolutionRate ?? 0}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.resolved ?? 0} of {stats?.total ?? 0} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgResponseTime ?? '0.0'} min</div>
            <p className="text-xs text-muted-foreground">
              Target: &lt;3 min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgRating ?? 0}/5.0</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalRatings ?? 0} ratings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>
            {conversations?.total ?? 0} conversations found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {conversations?.items.map((conv) => (
            <div
              key={conv.id}
              className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
              onClick={() => navigate(`/dashboard/conversations/${conv.id}`)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{conv.userName ?? 'Anonymous'}</span>
                  <Badge variant={conv.status === 'resolved' ? 'default' : 'secondary'}>
                    {conv.status}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatTimeAgo(conv.startedAt)}
                </span>
              </div>

              <p className="text-sm mb-2 line-clamp-2">{conv.firstMessage}</p>

              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{conv.messageCount} messages</span>
                <span>{conv.duration} min</span>
                {conv.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400" />
                    {conv.rating}/5
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// apps/dashboard/src/pages/conversations/[id].tsx

import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Bot } from 'lucide-react';

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: conversation, isLoading } = trpc.platform.conversations.getById.useQuery({
    id: id!,
  });

  if (isLoading) return <div>Loading...</div>;
  if (!conversation) return <div>Conversation not found</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/conversations')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {conversation.userName ?? 'Anonymous'} - #{conversation.id.slice(0, 8)}
          </h1>
          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
            <span>Started: {formatDateTime(conversation.startedAt)}</span>
            <span>Duration: {conversation.duration} min</span>
            <Badge>{conversation.status}</Badge>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-semibold">{conversation.status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Messages</p>
            <p className="font-semibold">{conversation.messageCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rating</p>
            <p className="font-semibold">
              {conversation.rating ? `${conversation.rating}/5` : 'Not rated'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Message Thread */}
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {conversation.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? '' : 'bg-muted p-3 rounded-lg'}`}
            >
              <div className="flex-shrink-0">
                {msg.role === 'user' ? (
                  <User className="h-8 w-8 p-2 bg-primary rounded-full text-white" />
                ) : (
                  <Bot className="h-8 w-8 p-2 bg-blue-500 rounded-full text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold">
                    {msg.role === 'user' ? 'User' : 'AI Agent'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.model && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {msg.model}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold">${conversation.totalCost.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Text (LLM)</p>
              <p className="text-xl font-semibold">${conversation.textCost.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vision</p>
              <p className="text-xl font-semibold">${conversation.visionCost.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Models Used</p>
              <p className="text-sm">{conversation.modelsUsed.join(', ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}
```

### Data Requirements

**tRPC Endpoints**:
```typescript
// packages/api-contract/src/routers/conversations.ts

export const conversationsRouter = router({
  // Get conversation stats
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      const sessions = await db.query.sessions.findMany({
        where: eq(sessions.tenantId, ctx.session.tenantId),
      });

      return {
        total: sessions.length,
        newToday: sessions.filter(s => isToday(s.startedAt)).length,
        resolved: sessions.filter(s => s.status === 'resolved').length,
        resolutionRate: 94.2,
        avgResponseTime: '2.3',
        avgRating: 4.7,
        totalRatings: 856,
      };
    }),

  // List conversations
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.string().nullable(),
      dateRange: z.string(),
      limit: z.number(),
      offset: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const sessions = await db.query.sessions.findMany({
        where: and(
          eq(sessions.tenantId, ctx.session.tenantId),
          input.status ? eq(sessions.status, input.status) : undefined,
        ),
        limit: input.limit,
        offset: input.offset,
        orderBy: [desc(sessions.startedAt)],
      });

      return {
        items: sessions.map(s => ({
          id: s.id,
          userName: s.userName,
          status: s.status,
          firstMessage: s.firstMessage,
          messageCount: s.messageCount,
          duration: s.durationMinutes,
          rating: s.rating,
          startedAt: s.startedAt,
        })),
        total: sessions.length,
      };
    }),

  // Get conversation by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const session = await db.query.sessions.findFirst({
        where: and(
          eq(sessions.id, input.id),
          eq(sessions.tenantId, ctx.session.tenantId),
        ),
      });

      if (!session) throw new TRPCError({ code: 'NOT_FOUND' });

      const messages = await db.query.messages.findMany({
        where: eq(messages.sessionId, input.id),
        orderBy: [asc(messages.timestamp)],
      });

      return {
        ...session,
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          model: m.model,
          timestamp: m.timestamp,
        })),
      };
    }),
});
```

### Implementation Checklist

- [ ] Create `/dashboard/conversations` route
- [ ] Create `/dashboard/conversations/:id` route
- [ ] Implement stats cards with real-time data
- [ ] Build conversations list with filters
- [ ] Add search functionality
- [ ] Implement conversation detail view
- [ ] Show message thread with user/AI distinction
- [ ] Display cost breakdown per conversation
- [ ] Add pagination
- [ ] Handle empty states

---

## 4. Cost Intelligence Dashboard

**Route**: `/dashboard/costs`
**Timeline**: Phase 10, Day 10-12
**Priority**: P0 (Critical - Week 2)

### Layout Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Cost Intelligence                      Export Report ▼     │
├─────────────────────────────────────────────────────────────┤
│  💰 Monthly Overview (January 2025)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ $127.89    │ $2,500.00  │ 94.9%      │ $2,372.11   │  │
│  │ Spent      │ Budget     │ Saved      │ Remaining   │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  📊 Cost Breakdown by Service                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [████████████████████░░░] Text (LLM)    $92.45      │  │
│  │  [█████░░░░░░░░░░░░░░░░░░] Vision AI     $24.12      │  │
│  │  [███░░░░░░░░░░░░░░░░░░░░] Embeddings   $8.45       │  │
│  │  [█░░░░░░░░░░░░░░░░░░░░░░] Reranking    $2.87       │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  📈 Cost Trends (Last 30 Days)                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      ▁▂▁▃▄▅▆▅▄▃▂▁▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▁▂▃                   │  │
│  │  $0 ├────────────────────────────────┤ $15/day       │  │
│  │      Jan 1              Jan 15       Jan 30          │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  🎯 Top Cost Drivers                                        │
│  1. GPT-4o-mini (70%) - $64.72 | 48,540 requests           │
│  2. GPT-4o (30%) - $27.73 | 554 requests                   │
│  3. Gemini Flash-Lite (60%) - $14.45 | 19,267 frames       │
│  4. Voyage embeddings - $8.45 | 845K tokens                │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```tsx
// apps/dashboard/src/pages/costs/index.tsx

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingDown, Database, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CostIntelligencePage() {
  const [timeRange, setTimeRange] = useState<string>('30d');

  // tRPC queries
  const { data: overview } = trpc.platform.costs.overview.useQuery({ timeRange });
  const { data: breakdown } = trpc.platform.costs.breakdown.useQuery({ timeRange });
  const { data: trends } = trpc.platform.costs.trends.useQuery({ timeRange });
  const { data: topDrivers } = trpc.platform.costs.topDrivers.useQuery({ timeRange });

  const exportReport = async () => {
    // Export CSV report
    const csv = await trpc.platform.costs.exportReport.query({ timeRange });
    downloadCSV(csv, `cost-report-${timeRange}.csv`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cost Intelligence</h1>
          <p className="text-muted-foreground">Monitor AI spending and optimize costs</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportReport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Monthly Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview?.spent.toFixed(2) ?? '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.percentChange > 0 ? '+' : ''}{overview?.percentChange}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview?.budget.toFixed(2) ?? '0.00'}</div>
            <Progress value={overview?.usagePercent ?? 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {overview?.usagePercent.toFixed(1)}% used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {overview?.savingsPercent.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              ${overview?.savedAmount.toFixed(2)} saved vs baseline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview?.remaining.toFixed(2) ?? '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.daysRemaining} days left
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown by Service</CardTitle>
          <CardDescription>Distribution of AI costs across services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {breakdown?.map((item) => (
            <div key={item.service} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.service}</span>
                <span className="text-muted-foreground">${item.cost.toFixed(2)}</span>
              </div>
              <Progress value={item.percentage} />
              <p className="text-xs text-muted-foreground">
                {item.percentage.toFixed(1)}% of total spend
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cost Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Trends</CardTitle>
          <CardDescription>Daily spending over the past {timeRange}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="cost" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Cost Drivers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Cost Drivers</CardTitle>
          <CardDescription>AI models consuming the most budget</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topDrivers?.map((driver, index) => (
              <div key={driver.model} className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="font-medium">
                    {index + 1}. {driver.model} ({driver.percentage}%)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {driver.requests.toLocaleString()} requests
                  </p>
                </div>
                <span className="font-semibold">${driver.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
```

### Data Requirements

**tRPC Endpoints**:
```typescript
// packages/api-contract/src/routers/costs.ts

export const costsRouter = router({
  // Get cost overview
  overview: protectedProcedure
    .input(z.object({ timeRange: z.string() }))
    .query(async ({ ctx, input }) => {
      const events = await db.query.costEvents.findMany({
        where: and(
          eq(costEvents.tenantId, ctx.session.tenantId),
          gte(costEvents.timestamp, getStartDate(input.timeRange)),
        ),
      });

      const spent = events.reduce((sum, e) => sum + e.cost, 0);
      const budget = 2500; // From budget_alerts table

      return {
        spent,
        budget,
        usagePercent: (spent / budget) * 100,
        savingsPercent: 94.9, // From optimization calculations
        savedAmount: spent * 18.5, // Reverse calculate savings
        remaining: budget - spent,
        daysRemaining: 15,
        percentChange: 12.5,
      };
    }),

  // Get cost breakdown
  breakdown: protectedProcedure
    .input(z.object({ timeRange: z.string() }))
    .query(async ({ ctx, input }) => {
      const events = await db.query.costEvents.findMany({
        where: and(
          eq(costEvents.tenantId, ctx.session.tenantId),
          gte(costEvents.timestamp, getStartDate(input.timeRange)),
        ),
      });

      const grouped = groupBy(events, 'eventType');
      const total = events.reduce((sum, e) => sum + e.cost, 0);

      return Object.entries(grouped).map(([service, items]) => ({
        service,
        cost: items.reduce((sum, e) => sum + e.cost, 0),
        percentage: (items.reduce((sum, e) => sum + e.cost, 0) / total) * 100,
      }));
    }),

  // Get cost trends
  trends: protectedProcedure
    .input(z.object({ timeRange: z.string() }))
    .query(async ({ ctx, input }) => {
      const events = await db.query.costEvents.findMany({
        where: and(
          eq(costEvents.tenantId, ctx.session.tenantId),
          gte(costEvents.timestamp, getStartDate(input.timeRange)),
        ),
      });

      const dailyTotals = groupByDay(events);
      return dailyTotals.map(({ date, cost }) => ({ date, cost }));
    }),

  // Get top cost drivers
  topDrivers: protectedProcedure
    .input(z.object({ timeRange: z.string() }))
    .query(async ({ ctx, input }) => {
      const events = await db.query.costEvents.findMany({
        where: and(
          eq(costEvents.tenantId, ctx.session.tenantId),
          gte(costEvents.timestamp, getStartDate(input.timeRange)),
        ),
      });

      const grouped = groupBy(events, 'model');
      const total = events.reduce((sum, e) => sum + e.cost, 0);

      return Object.entries(grouped)
        .map(([model, items]) => ({
          model,
          cost: items.reduce((sum, e) => sum + e.cost, 0),
          requests: items.length,
          percentage: ((items.reduce((sum, e) => sum + e.cost, 0) / total) * 100).toFixed(1),
        }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 5);
    }),

  // Export cost report
  exportReport: protectedProcedure
    .input(z.object({ timeRange: z.string() }))
    .query(async ({ ctx, input }) => {
      const events = await db.query.costEvents.findMany({
        where: and(
          eq(costEvents.tenantId, ctx.session.tenantId),
          gte(costEvents.timestamp, getStartDate(input.timeRange)),
        ),
      });

      const csv = convertToCSV(events);
      return csv;
    }),
});
```

### Implementation Checklist

- [ ] Create `/dashboard/costs` route
- [ ] Implement monthly overview cards
- [ ] Build cost breakdown progress bars
- [ ] Add cost trends chart (Recharts)
- [ ] Display top cost drivers list
- [ ] Implement time range selector
- [ ] Add CSV export functionality
- [ ] Handle empty state (no costs yet)
- [ ] Add tooltips explaining cost calculations
- [ ] Show cost optimization recommendations

---

## 5. Budget Configuration

**Route**: `/dashboard/costs/budget`
**Timeline**: Phase 10, Day 13-14
**Priority**: P1 (High - Week 2)

### Layout Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Budget Configuration                      [Save Changes]   │
├─────────────────────────────────────────────────────────────┤
│  💰 Monthly Budget                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Current Budget: $2,500.00/month                     │  │
│  │  [====================|=====] $127.89 / $2,500.00    │  │
│  │  5.1% used | $2,372.11 remaining                     │  │
│  │                                                        │  │
│  │  Set New Budget: [$2,500.00]                         │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  🔔 Alert Thresholds                                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [✓] Warning at 70% ($1,750.00)                      │  │
│  │  [✓] Critical at 90% ($2,250.00)                     │  │
│  │  [✓] Auto-pause at 100% (prevents overages)          │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  📧 Notification Settings                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Email Alerts: [✓] admin@company.com                 │  │
│  │  Slack Webhook: [https://hooks.slack.com/...]        │  │
│  │  Frequency: [⚪ Real-time] [⚫ Daily] [⚪ Weekly]      │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  📊 Budget Forecast                                         │
│  Current usage rate: $4.26/day                              │
│  Projected monthly spend: $127.89 (5.1% of budget)          │
│  Status: ✅ Well within budget                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```tsx
// apps/dashboard/src/pages/costs/budget.tsx

import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Bell, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function BudgetConfigurationPage() {
  const { data: currentBudget, isLoading } = trpc.platform.budget.get.useQuery();
  const updateMutation = trpc.platform.budget.update.useMutation({
    onSuccess: () => toast.success('Budget settings saved'),
    onError: (err) => toast.error(`Failed to save: ${err.message}`),
  });

  const [formData, setFormData] = useState({
    monthlyBudget: currentBudget?.monthlyBudget ?? 2500,
    warningThreshold: currentBudget?.warningThreshold ?? 70,
    criticalThreshold: currentBudget?.criticalThreshold ?? 90,
    autoPause: currentBudget?.autoPause ?? true,
    emailAlerts: currentBudget?.emailAlerts ?? true,
    emailAddress: currentBudget?.emailAddress ?? '',
    slackWebhook: currentBudget?.slackWebhook ?? '',
    alertFrequency: currentBudget?.alertFrequency ?? 'realtime',
  });

  useEffect(() => {
    if (currentBudget) {
      setFormData({
        monthlyBudget: currentBudget.monthlyBudget,
        warningThreshold: currentBudget.warningThreshold,
        criticalThreshold: currentBudget.criticalThreshold,
        autoPause: currentBudget.autoPause,
        emailAlerts: currentBudget.emailAlerts,
        emailAddress: currentBudget.emailAddress,
        slackWebhook: currentBudget.slackWebhook,
        alertFrequency: currentBudget.alertFrequency,
      });
    }
  }, [currentBudget]);

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const warningAmount = (formData.monthlyBudget * formData.warningThreshold) / 100;
  const criticalAmount = (formData.monthlyBudget * formData.criticalThreshold) / 100;
  const currentSpend = currentBudget?.currentSpend ?? 0;
  const usagePercent = (currentSpend / formData.monthlyBudget) * 100;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Budget Configuration</h1>
          <p className="text-muted-foreground">Set spending limits and alert thresholds</p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Monthly Budget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Monthly Budget
          </CardTitle>
          <CardDescription>Set your AI spending limit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Current Usage</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>${currentSpend.toFixed(2)} / ${formData.monthlyBudget.toFixed(2)}</span>
                <span>{usagePercent.toFixed(1)}% used</span>
              </div>
              <Progress value={usagePercent} />
              <p className="text-xs text-muted-foreground">
                ${(formData.monthlyBudget - currentSpend).toFixed(2)} remaining
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Set New Budget</Label>
            <div className="flex gap-2">
              <span className="flex items-center">$</span>
              <Input
                type="number"
                value={formData.monthlyBudget}
                onChange={(e) => setFormData({ ...formData, monthlyBudget: parseFloat(e.target.value) })}
                min={100}
                step={100}
              />
              <span className="flex items-center text-muted-foreground">/month</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alert Thresholds
          </CardTitle>
          <CardDescription>Configure when to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Warning Alert ({formData.warningThreshold}%)</Label>
              <p className="text-sm text-muted-foreground">
                Notify at ${warningAmount.toFixed(2)}
              </p>
            </div>
            <Input
              type="number"
              value={formData.warningThreshold}
              onChange={(e) => setFormData({ ...formData, warningThreshold: parseInt(e.target.value) })}
              min={50}
              max={100}
              step={5}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Critical Alert ({formData.criticalThreshold}%)</Label>
              <p className="text-sm text-muted-foreground">
                Urgent notification at ${criticalAmount.toFixed(2)}
              </p>
            </div>
            <Input
              type="number"
              value={formData.criticalThreshold}
              onChange={(e) => setFormData({ ...formData, criticalThreshold: parseInt(e.target.value) })}
              min={70}
              max={100}
              step={5}
              className="w-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Pause at 100%</Label>
              <p className="text-sm text-muted-foreground">
                Automatically pause AI services to prevent overages
              </p>
            </div>
            <Switch
              checked={formData.autoPause}
              onCheckedChange={(checked) => setFormData({ ...formData, autoPause: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>How would you like to receive alerts?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Email Alerts</Label>
            <Switch
              checked={formData.emailAlerts}
              onCheckedChange={(checked) => setFormData({ ...formData, emailAlerts: checked })}
            />
          </div>

          {formData.emailAlerts && (
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={formData.emailAddress}
                onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                placeholder="admin@company.com"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Slack Webhook URL (Optional)</Label>
            <Input
              type="url"
              value={formData.slackWebhook}
              onChange={(e) => setFormData({ ...formData, slackWebhook: e.target.value })}
              placeholder="https://hooks.slack.com/services/..."
            />
            <p className="text-xs text-muted-foreground">
              Get budget alerts in Slack
            </p>
          </div>

          <div className="space-y-2">
            <Label>Alert Frequency</Label>
            <RadioGroup
              value={formData.alertFrequency}
              onValueChange={(value) => setFormData({ ...formData, alertFrequency: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="realtime" id="realtime" />
                <Label htmlFor="realtime">Real-time (immediate)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily">Daily digest</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly">Weekly summary</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Budget Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Forecast</CardTitle>
          <CardDescription>Projected spending based on current usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Current usage rate:</span>
            <span className="font-semibold">${currentBudget?.dailyRate.toFixed(2)}/day</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Projected monthly spend:</span>
            <span className="font-semibold">${currentBudget?.projectedSpend.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm">
              Status: <strong>Well within budget</strong> (
              {((currentBudget?.projectedSpend ?? 0) / formData.monthlyBudget * 100).toFixed(1)}% projected)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Data Requirements

**tRPC Endpoints**:
```typescript
// packages/api-contract/src/routers/budget.ts

export const budgetRouter = router({
  // Get current budget configuration
  get: protectedProcedure
    .query(async ({ ctx }) => {
      const budget = await db.query.budgetAlerts.findFirst({
        where: eq(budgetAlerts.tenantId, ctx.session.tenantId),
      });

      const currentSpend = await getCurrentMonthSpend(ctx.session.tenantId);
      const dailyRate = currentSpend / new Date().getDate();
      const projectedSpend = dailyRate * 30;

      return {
        ...(budget ?? getDefaultBudget()),
        currentSpend,
        dailyRate,
        projectedSpend,
      };
    }),

  // Update budget configuration
  update: protectedProcedure
    .input(z.object({
      monthlyBudget: z.number().min(100),
      warningThreshold: z.number().min(50).max(100),
      criticalThreshold: z.number().min(70).max(100),
      autoPause: z.boolean(),
      emailAlerts: z.boolean(),
      emailAddress: z.string().email(),
      slackWebhook: z.string().url().optional(),
      alertFrequency: z.enum(['realtime', 'daily', 'weekly']),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.insert(budgetAlerts)
        .values({
          tenantId: ctx.session.tenantId,
          ...input,
        })
        .onConflictDoUpdate({
          target: budgetAlerts.tenantId,
          set: input,
        });

      return { success: true };
    }),
});
```

### Implementation Checklist

- [ ] Create `/dashboard/costs/budget` route
- [ ] Implement monthly budget input
- [ ] Build alert threshold sliders
- [ ] Add auto-pause toggle
- [ ] Implement email notification settings
- [ ] Add Slack webhook configuration
- [ ] Build alert frequency selector
- [ ] Show budget forecast card
- [ ] Add validation for budget amounts
- [ ] Handle save errors gracefully

---

## 6. Knowledge Gaps Dashboard

**Route**: `/dashboard/optimize/knowledge-gaps`
**Timeline**: Phase 10, Day 15-16
**Priority**: P1 (High - Week 3)

### Layout Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Knowledge Gaps                     [Auto-Detect] [Refresh] │
├─────────────────────────────────────────────────────────────┤
│  🔍 Detection Summary                                       │
│  ┌──────────┬──────────┬──────────┬──────────┐             │
│  │ 47 gaps  │ 12 high  │ 23 med   │ 12 low   │             │
│  │ Detected │ Priority │ Priority │ Priority │             │
│  └──────────┴──────────┴──────────┴──────────┘             │
├─────────────────────────────────────────────────────────────┤
│  🚨 High Priority Gaps (Impacting >5 conversations/day)    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🔴 API Authentication                                │  │
│  │  • 42 failed queries in last 7 days                  │  │
│  │  • Common questions: "How do I get API key?", "Auth  │  │
│  │    errors", "Token expired"                          │  │
│  │  [📄 View Queries] [✅ Mark as Addressed]            │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  🔴 Webhook Configuration                            │  │
│  │  • 38 failed queries in last 7 days                  │  │
│  │  • Common questions: "Setup webhooks", "Event types" │  │
│  │  [📄 View Queries] [✅ Mark as Addressed]            │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ⚠️  Medium Priority Gaps (2-5 conversations/day)          │
│  • Rate limiting (23 queries)                               │
│  • Error handling best practices (19 queries)               │
│  • Pagination options (18 queries)                          │
│  [View All Medium Priority]                                 │
├─────────────────────────────────────────────────────────────┤
│  💡 Recommendations                                         │
│  1. Add "API Authentication Guide" to knowledge base        │
│  2. Create webhook setup tutorial                           │
│  3. Update rate limiting documentation                      │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

```tsx
// apps/dashboard/src/pages/optimize/knowledge-gaps.tsx

import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, FileText, RefreshCw, Zap } from 'lucide-react';

export default function KnowledgeGapsPage() {
  const { data: summary, refetch } = trpc.platform.knowledgeGaps.summary.useQuery();
  const { data: gaps, isLoading } = trpc.platform.knowledgeGaps.list.useQuery();

  const autoDetectMutation = trpc.platform.knowledgeGaps.autoDetect.useMutation({
    onSuccess: () => {
      toast.success('Gap detection complete');
      refetch();
    },
  });

  const markAddressedMutation = trpc.platform.knowledgeGaps.markAddressed.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Gaps</h1>
          <p className="text-muted-foreground">Identify and fix AI knowledge limitations</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => autoDetectMutation.mutate()}
            disabled={autoDetectMutation.isPending}
          >
            <Zap className="mr-2 h-4 w-4" />
            Auto-Detect
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Detection Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gaps</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Detected from conversation analysis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary?.highPriority ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {'>'}5 conversations/day affected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary?.mediumPriority ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              2-5 conversations/day affected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary?.lowPriority ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {'<'}2 conversations/day affected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* High Priority Gaps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            High Priority Gaps
          </CardTitle>
          <CardDescription>
            Critical knowledge gaps impacting {'>'}5 conversations per day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {gaps?.high.map((gap) => (
            <div key={gap.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{gap.topic}</h3>
                  <p className="text-sm text-muted-foreground">
                    {gap.failedQueries} failed queries in last 7 days
                  </p>
                </div>
                <Badge variant="destructive">High</Badge>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">Common Questions:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {gap.commonQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  View Queries
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => markAddressedMutation.mutate({ id: gap.id })}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Addressed
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Medium Priority Gaps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Medium Priority Gaps
          </CardTitle>
          <CardDescription>
            Knowledge gaps impacting 2-5 conversations per day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {gaps?.medium.map((gap) => (
              <li key={gap.id} className="flex justify-between items-center">
                <span className="text-sm">• {gap.topic} ({gap.failedQueries} queries)</span>
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full mt-4">
            View All Medium Priority
          </Button>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>Suggested actions to close knowledge gaps</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {gaps?.recommendations.map((rec, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  {index + 1}
                </span>
                <p className="text-sm flex-1">{rec.action}</p>
                <Badge variant="outline">{rec.impact}</Badge>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Data Requirements

**tRPC Endpoints**:
```typescript
// packages/api-contract/src/routers/knowledgeGaps.ts

export const knowledgeGapsRouter = router({
  // Get gaps summary
  summary: protectedProcedure
    .query(async ({ ctx }) => {
      const gaps = await detectKnowledgeGaps(ctx.session.tenantId);

      return {
        total: gaps.length,
        highPriority: gaps.filter(g => g.priority === 'high').length,
        mediumPriority: gaps.filter(g => g.priority === 'medium').length,
        lowPriority: gaps.filter(g => g.priority === 'low').length,
      };
    }),

  // List all gaps
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const gaps = await detectKnowledgeGaps(ctx.session.tenantId);

      return {
        high: gaps.filter(g => g.priority === 'high'),
        medium: gaps.filter(g => g.priority === 'medium'),
        low: gaps.filter(g => g.priority === 'low'),
        recommendations: generateRecommendations(gaps),
      };
    }),

  // Auto-detect gaps from conversations
  autoDetect: protectedProcedure
    .mutation(async ({ ctx }) => {
      const messages = await db.query.messages.findMany({
        where: eq(messages.tenantId, ctx.session.tenantId),
      });

      const gaps = await analyzeConversationsForGaps(messages);
      await saveGapsToDatabase(gaps, ctx.session.tenantId);

      return { detected: gaps.length };
    }),

  // Mark gap as addressed
  markAddressed: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db.update(knowledgeGaps)
        .set({ status: 'addressed' })
        .where(eq(knowledgeGaps.id, input.id));
    }),
});
```

### Implementation Checklist

- [ ] Create `/dashboard/optimize/knowledge-gaps` route
- [ ] Implement summary cards
- [ ] Build high-priority gaps list
- [ ] Add medium/low-priority sections
- [ ] Implement auto-detect functionality
- [ ] Add "Mark as Addressed" action
- [ ] Build recommendations list
- [ ] Add query detail modal
- [ ] Implement gap detection algorithm
- [ ] Handle empty state (no gaps detected)

---

## 7. Topic Performance Matrix

**Route**: `/dashboard/optimize/topics`
**Timeline**: Phase 10, Day 17-18
**Priority**: P2 (Medium - Week 3)

### Overview
Heatmap visualization showing AI performance across different topics and query types. Identifies which knowledge domains perform well vs. need improvement.

### Key Features
- **2D Heatmap**: Topics (rows) × Query Types (columns) with color-coded confidence scores
- **Performance Metrics**: Avg confidence, resolution rate, response time per topic
- **Filters**: Time range, confidence threshold, topic category
- **Drill-down**: Click cell to view sample conversations and failed queries
- **Export**: CSV export of performance matrix

### Component Pattern
```tsx
// Use react-grid-heatmap or custom implementation
import { HeatMapGrid } from 'react-grid-heatmap';
// Matrix data: matrix[topic][queryType] = { confidence, count, avgTime }
// Color scale: Red (<60%) → Yellow (60-80%) → Green (>80%)
```

### tRPC Endpoints
- `topics.performanceMatrix({ timeRange })` - Returns 2D array of topic × query type performance
- `topics.topicDetail({ topic, queryType })` - Returns failed queries and recommendations

### Implementation Checklist
- [ ] Install/build heatmap visualization
- [ ] Implement matrix data fetching and transformation
- [ ] Build color scale logic (confidence → color)
- [ ] Add cell click handlers and detail modals
- [ ] Implement CSV export functionality

---

## 8. Performance Dashboard (5 KPIs)

**Route**: `/dashboard/performance`
**Timeline**: Phase 10, Day 19-21
**Priority**: P0 (Critical - Week 3)

### Overview
Real-time performance monitoring with 5 critical KPIs from Phase 10 requirements.

### 5 Key Performance Indicators

**1. Response Time** (Target: <3 seconds)
- Line chart (24h trend), current value, target threshold
- Status: Green (<2s), Yellow (2-3s), Red (>3s)

**2. AI Confidence Score** (Target: >85%)
- Gauge chart with confidence distribution
- Status: Green (>85%), Yellow (70-85%), Red (<70%)

**3. Resolution Rate** (Target: >90%)
- Donut chart (resolved/escalated/abandoned)
- Status: Green (>90%), Yellow (80-90%), Red (<80%)

**4. Cost per Resolution** (Target: <$0.50)
- Bar chart (actual vs target), trend line
- Status: Green (<$0.40), Yellow ($0.40-$0.50), Red (>$0.50)

**5. Knowledge Coverage** (Target: >95%)
- Progress bar with gap count, trending graph
- Status: Green (>95%), Yellow (90-95%), Red (<90%)

### Component Pattern
```tsx
function KPICard({ title, value, target, status, chart }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Badge variant={status}>{status}</Badge>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-sm">Target: {target}</p>
        {chart}
      </CardContent>
    </Card>
  );
}
```

### tRPC Endpoints
- `performance.kpis()` - Returns all 5 KPIs with current values, trends, and status

### Implementation Checklist
- [ ] Create 5 KPI card components
- [ ] Implement KPI calculation logic (from sessions, messages, cost_events)
- [ ] Add Recharts visualizations (Line, Gauge, Donut, Bar)
- [ ] Build status color logic (green/yellow/red thresholds)
- [ ] Add real-time data refresh (polling every 30s)

---

## 9. Real-time Health Dashboard

**Route**: `/dashboard/health`
**Timeline**: Phase 10, Day 22-23
**Priority**: P1 (High - Week 4)

### Key Features
- **Service Status Grid**: API, PostgreSQL, Redis, LiveKit, OpenAI, Anthropic (green/yellow/red)
- **Error Rate Monitor**: Real-time errors with 5min/1h/24h trends
- **Uptime Tracker**: 99.9% target with 30-day historical chart
- **Active Sessions**: Count of live conversations
- **Incident Log**: Recent errors and service disruptions

### Component Pattern
```tsx
<ServiceStatusGrid>
  {services.map(s => (
    <Card className={getStatusColor(s.status)}>
      <StatusIcon status={s.status} />
      <span>{s.name}</span>
      <span>{s.responseTime}ms</span>
    </Card>
  ))}
</ServiceStatusGrid>
```

### tRPC Endpoints
- `health.status()` - Real-time health check of all services (poll every 5s)
- `health.incidents()` - Recent incidents with severity and resolution status

### Implementation Checklist
- [ ] Implement service health checks (PostgreSQL, Redis, LiveKit, AI APIs)
- [ ] Build service status grid with color coding
- [ ] Add error rate monitoring and trending
- [ ] Create incident logging system
- [ ] Implement real-time polling (5s intervals)

---

## 10. Widget Configuration

**Route**: `/dashboard/widget`
**Timeline**: Phase 10, Day 24-25
**Priority**: P2 (Medium - Week 4)

### Key Features
- Theme customization (colors, fonts, border radius)
- Position settings (bottom-right, bottom-left, custom coordinates)
- Greeting message configuration
- Logo/branding upload
- Widget installation code snippet (copy button)

### Component Pattern
```tsx
<Form>
  <ColorPicker label="Primary Color" value={config.primaryColor} />
  <PositionSelector options={positions} value={config.position} />
  <Textarea label="Greeting Message" value={config.greeting} />
  <FileUpload label="Logo" accept=".png,.jpg" />
  <CodeSnippet code={generateEmbedCode(config)} />
</Form>
```

### tRPC Endpoints
- `widget.getConfig()` - Current widget configuration
- `widget.updateConfig(config)` - Save widget settings
- `widget.uploadLogo(file)` - Upload logo image

### Implementation Checklist
- [ ] Build color picker component
- [ ] Add position selector with preview
- [ ] Implement logo upload
- [ ] Generate embed code snippet
- [ ] Add live preview pane

---

## 11. Batch Testing Interface

**Route**: `/dashboard/testing`
**Timeline**: Phase 10, Day 26-27
**Priority**: P2 (Medium - Week 4)

### Key Features
- Upload CSV of test queries (query, expected_answer, tags)
- Run batch tests against AI
- View results table (query, expected, actual, pass/fail, similarity score)
- Accuracy metrics (pass rate, avg similarity, by category)
- Export failed tests for analysis

### Component Pattern
```tsx
<div>
  <FileUpload accept=".csv" onChange={handleUploadCSV} />
  <Button onClick={runBatchTests}>Run Tests</Button>
  <ProgressBar value={progress} />
  
  <ResultsTable>
    {results.map(r => (
      <TableRow className={r.passed ? 'green' : 'red'}>
        <Cell>{r.query}</Cell>
        <Cell>{r.expected}</Cell>
        <Cell>{r.actual}</Cell>
        <Cell>{r.similarity}%</Cell>
        <Cell><Badge>{r.passed ? 'Pass' : 'Fail'}</Badge></Cell>
      </TableRow>
    ))}
  </ResultsTable>
  
  <StatsCard>
    Pass Rate: {stats.passRate}%
    Avg Similarity: {stats.avgSimilarity}%
  </StatsCard>
</div>
```

### tRPC Endpoints
- `testing.uploadBatch(csv)` - Parse CSV and create test batch
- `testing.runTests(batchId)` - Execute tests and return results
- `testing.getResults(batchId)` - Fetch test results with filtering

### Implementation Checklist
- [ ] Implement CSV parser (query, expected, tags)
- [ ] Build batch test execution logic
- [ ] Add similarity scoring (embeddings or string matching)
- [ ] Create results table with filters
- [ ] Implement export failed tests feature

---

## 12. Team Management

**Route**: `/dashboard/team`
**Timeline**: Phase 10, Day 28-29
**Priority**: P2 (Medium - Week 4)

### Key Features
- User list with roles and permissions
- Invite members via email
- Role management (Admin, Editor, Viewer)
- Permission controls per role
- Activity log (who did what when)

### Component Pattern
```tsx
<div>
  <Button onClick={openInviteModal}>Invite Member</Button>
  
  <UserTable>
    {users.map(u => (
      <TableRow>
        <Cell>{u.name}</Cell>
        <Cell>{u.email}</Cell>
        <Cell>
          <Select value={u.role} onChange={updateRole}>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </Select>
        </Cell>
        <Cell><Button onClick={() => removeUser(u.id)}>Remove</Button></Cell>
      </TableRow>
    ))}
  </UserTable>
  
  <ActivityLog>
    {activities.map(a => (
      <div>{a.user} {a.action} at {a.timestamp}</div>
    ))}
  </ActivityLog>
</div>
```

### tRPC Endpoints
- `team.list()` - Get all team members with roles
- `team.invite(email, role)` - Send invitation email
- `team.updateRole(userId, role)` - Change user role
- `team.remove(userId)` - Remove team member

### Implementation Checklist
- [ ] Build user table with role selector
- [ ] Implement invite modal with email validation
- [ ] Add role-based permission checks
- [ ] Create activity log with filtering
- [ ] Send invitation emails

---

## 13. API Keys & Webhooks

**Route**: `/dashboard/settings/api`
**Timeline**: Phase 10, Day 30
**Priority**: P2 (Medium - Week 4)

### Key Features
- Generate API keys with scopes
- Revoke keys
- Webhook endpoint configuration
- Webhook event type selection (conversation.created, conversation.completed, etc.)
- Test webhook delivery

### Component Pattern
```tsx
<Tabs>
  <TabPanel label="API Keys">
    <Button onClick={generateKey}>Create API Key</Button>
    <Table>
      {keys.map(k => (
        <TableRow>
          <Cell>{k.name}</Cell>
          <Cell>{maskKey(k.key)}</Cell>
          <Cell>{k.created}</Cell>
          <Cell><Button onClick={() => revokeKey(k.id)}>Revoke</Button></Cell>
        </TableRow>
      ))}
    </Table>
  </TabPanel>
  
  <TabPanel label="Webhooks">
    <Input label="Webhook URL" value={webhookUrl} />
    <CheckboxGroup label="Events">
      <Checkbox value="conversation.created" />
      <Checkbox value="conversation.completed" />
      <Checkbox value="escalation.created" />
    </CheckboxGroup>
    <Button onClick={testWebhook}>Test Webhook</Button>
  </TabPanel>
</Tabs>
```

### tRPC Endpoints
- `apiKeys.list()` - Get all API keys
- `apiKeys.create(name, scopes)` - Generate new key
- `apiKeys.revoke(keyId)` - Revoke key
- `webhooks.configure(url, events)` - Save webhook config
- `webhooks.test()` - Send test webhook

### Implementation Checklist
- [ ] Build API key generation and display
- [ ] Implement key masking (show first 8 chars)
- [ ] Add webhook URL input and validation
- [ ] Build event type checkboxes
- [ ] Implement webhook testing

---

# Phase 11 Components (5 Views)

## 14. Escalation Notifications

**Route**: `/dashboard/escalations`
**Timeline**: Phase 11, Week 1
**Priority**: P0 (Critical)

### Key Features
- Real-time escalation queue (conversations that need human intervention)
- Human agent assignment
- Priority sorting (urgent, high, medium, low)
- SLA tracking (time until breach)
- Context panel (full conversation history, user info, knowledge gaps)

### Component Pattern
```tsx
<EscalationQueue>
  {escalations.map(e => (
    <EscalationCard priority={e.priority}>
      <Header>
        <UserInfo user={e.user} />
        <SLACountdown breachTime={e.slaBreachAt} />
      </Header>
      <Context>
        <MessageThread messages={e.messages} />
        <KnowledgeGaps gaps={e.detectedGaps} />
      </Context>
      <Actions>
        <AssignToAgent agents={agents} />
        <ResolveButton onClick={() => resolve(e.id)} />
      </Actions>
    </EscalationCard>
  ))}
</EscalationQueue>
```

### tRPC Endpoints
- `escalations.list({ status, priority })` - Get escalation queue
- `escalations.assign(escalationId, agentId)` - Assign to human
- `escalations.resolve(escalationId, resolution)` - Mark resolved

### Implementation Checklist
- [ ] Build escalation card component
- [ ] Add SLA countdown timer
- [ ] Implement agent assignment dropdown
- [ ] Create context panel with conversation history
- [ ] Add real-time updates (WebSocket)

---

## 15. Service Hours Settings

**Route**: `/dashboard/settings/service-hours`
**Timeline**: Phase 11, Week 1
**Priority**: P1 (High)

### Key Features
- Business hours configuration (timezone, days of week, hours)
- Holiday calendar
- Auto-away message when outside service hours
- Escalation routing during off-hours

### Component Pattern
```tsx
<Form>
  <TimezoneSelect value={config.timezone} />
  
  <WeekSchedule>
    {daysOfWeek.map(day => (
      <DayRow key={day}>
        <Checkbox label={day} checked={config.days.includes(day)} />
        <TimeRangePicker 
          start={config.hours[day].start} 
          end={config.hours[day].end} 
        />
      </DayRow>
    ))}
  </WeekSchedule>
  
  <HolidayCalendar>
    <DatePicker mode="multiple" selected={config.holidays} />
  </HolidayCalendar>
  
  <Textarea 
    label="Away Message" 
    value={config.awayMessage} 
    placeholder="We're currently offline. We'll respond within 24 hours."
  />
</Form>
```

### tRPC Endpoints
- `serviceHours.get()` - Get current service hours config
- `serviceHours.update(config)` - Save service hours
- `holidays.list()` - Get holiday list
- `holidays.add(date, name)` - Add holiday

### Implementation Checklist
- [ ] Build timezone selector
- [ ] Add day/time picker for each day
- [ ] Implement holiday calendar
- [ ] Create away message editor
- [ ] Add business hours validation

---

## 16. Chat-First Widget Enhanced (Phase 11)

**File**: `apps/widget-sdk/src/components/ChatFirst.tsx`
**Timeline**: Phase 11, Week 2
**Priority**: P0 (Critical)

### Enhancements Over Phase 7
- **Feedback Button**: In-message feedback ("Was this helpful?")
- **Escalate to Human**: Button to request human agent
- **Rating After Conversation**: 1-5 stars + optional comment
- **Offline Mode Detection**: Show offline message when outside service hours

### New Props
```tsx
interface ChatFirstProps {
  // Existing props from Phase 7
  tenantId: string;
  apiUrl: string;
  theme?: Theme;
  position?: Position;
  
  // Phase 11 additions
  enableFeedback?: boolean;
  enableEscalation?: boolean;
  enableRating?: boolean;
  serviceHours?: ServiceHours;
  offlineMessage?: string;
  onFeedback?: (messageId: string, helpful: boolean) => void;
  onEscalate?: (sessionId: string, reason: string) => void;
  onRate?: (sessionId: string, rating: number, comment: string) => void;
}
```

### Implementation Checklist
- [ ] Add feedback buttons to AI messages
- [ ] Build escalate to human button
- [ ] Create rating modal (1-5 stars + comment)
- [ ] Implement service hours checking
- [ ] Show offline message when appropriate

---

## 17. In-Widget Feedback Modal

**File**: `apps/widget-sdk/src/components/FeedbackModal.tsx`
**Timeline**: Phase 11, Week 2
**Priority**: P1 (High)

### Key Features
- Star rating (1-5)
- Feedback textarea
- Category selection (Bug, Feature Request, General Feedback)
- Screenshot upload (optional)
- Thank you confirmation

### Component Pattern
```tsx
<Modal open={open} onClose={onClose}>
  <ModalHeader>
    <Title>Send Feedback</Title>
  </ModalHeader>
  
  <ModalContent>
    <StarRating value={rating} onChange={setRating} />
    
    <RadioGroup label="Category" value={category} onChange={setCategory}>
      <Radio value="bug">Bug Report</Radio>
      <Radio value="feature">Feature Request</Radio>
      <Radio value="general">General Feedback</Radio>
    </RadioGroup>
    
    <Textarea 
      label="Your Feedback" 
      value={feedback} 
      onChange={setFeedback}
      placeholder="Tell us what you think..."
      rows={6}
    />
    
    <FileUpload 
      label="Screenshot (Optional)"
      accept="image/*"
      onChange={setScreenshot}
    />
  </ModalContent>
  
  <ModalFooter>
    <Button variant="outline" onClick={onClose}>Cancel</Button>
    <Button onClick={handleSubmit}>Send Feedback</Button>
  </ModalFooter>
</Modal>
```

### API Integration
```typescript
// POST /api/feedback
{
  sessionId: string;
  rating: number;
  category: 'bug' | 'feature' | 'general';
  feedback: string;
  screenshot?: File;
}
```

### Implementation Checklist
- [ ] Build star rating component
- [ ] Add category radio group
- [ ] Implement textarea with character limit
- [ ] Add screenshot upload
- [ ] Show thank you confirmation after submit

---

## 18. Survey Page

**File**: `apps/widget-sdk/src/pages/SurveyPage.tsx`
**Timeline**: Phase 11, Week 3
**Priority**: P2 (Medium)

### Key Features
- Post-conversation survey (CSAT, NPS, custom questions)
- Multi-question forms with conditional logic
- Question types: rating scale, text, multiple choice, yes/no
- Progress bar
- Thank you page with call-to-action

### Component Pattern
```tsx
<SurveyContainer>
  <ProgressBar current={currentQuestion} total={questions.length} />
  
  {questions[currentQuestion].type === 'rating' && (
    <RatingQuestion 
      question={questions[currentQuestion]} 
      onChange={handleAnswer}
    />
  )}
  
  {questions[currentQuestion].type === 'text' && (
    <TextQuestion 
      question={questions[currentQuestion]} 
      onChange={handleAnswer}
    />
  )}
  
  {questions[currentQuestion].type === 'multiple_choice' && (
    <MultipleChoiceQuestion 
      question={questions[currentQuestion]} 
      onChange={handleAnswer}
    />
  )}
  
  <Navigation>
    {currentQuestion > 0 && (
      <Button onClick={previousQuestion}>Back</Button>
    )}
    <Button onClick={nextQuestion}>
      {currentQuestion < questions.length - 1 ? 'Next' : 'Submit'}
    </Button>
  </Navigation>
</SurveyContainer>

{submitted && (
  <ThankYouPage>
    <CheckCircle className="text-green-500 w-16 h-16" />
    <h2>Thank you for your feedback!</h2>
    <p>Your responses help us improve our service.</p>
    <Button onClick={closeWidget}>Close</Button>
  </ThankYouPage>
)}
```

### API Integration
```typescript
// POST /api/surveys
{
  sessionId: string;
  surveyId: string;
  responses: Array<{
    questionId: string;
    answer: string | number | string[];
  }>;
}
```

### Implementation Checklist
- [ ] Build question components (rating, text, multiple choice)
- [ ] Implement conditional question logic
- [ ] Add progress bar
- [ ] Create thank you page
- [ ] Handle survey submission

---

## Implementation Summary

### Complete Dashboard Count
- **Phase 10**: 13 views (Days 1-30)
- **Phase 11**: 5 components (Weeks 1-3)
- **Total**: 18 dashboard views

### Technology Stack
- ✅ React 18 + TypeScript 5
- ✅ Vite 6
- ✅ Tailwind CSS v4 (CSS-first)
- ✅ shadcn/ui components
- ✅ tRPC v11
- ✅ Recharts
- ✅ Lucide React icons
- ✅ Drizzle ORM + PostgreSQL 16+
- ✅ Redis Streams
- ✅ LiveKit WebRTC

### Sequential Development Plan

**Week 1 (P0 Critical)**:
- Day 1-4: Knowledge Management (#1)
- Day 5-7: Agent Configuration (#2)

**Week 2 (P0/P1 High)**:
- Day 8-9: Conversations (#3)
- Day 10-12: Cost Intelligence (#4)
- Day 13-14: Budget Configuration (#5)

**Week 3 (P1/P2 Medium)**:
- Day 15-16: Knowledge Gaps (#6)
- Day 17-18: Topic Performance (#7)
- Day 19-21: Performance Dashboard (#8)

**Week 4 (P1/P2)**:
- Day 22-23: Real-time Health (#9)
- Day 24-30: Widget Config, Batch Testing, Team, API Keys (#10-13)

**Phase 11 (Parallel)**:
- Week 1: Escalation + Service Hours (#14-15)
- Week 2: Chat Widget Enhanced + Feedback Modal (#16-17)
- Week 3: Survey Page (#18)

### Validation Checklist

#### Code Quality
- [ ] All components use TypeScript with strict mode
- [ ] All tRPC endpoints have Zod validation schemas
- [ ] All user inputs are validated and sanitized
- [ ] All errors are handled with user-friendly messages
- [ ] All loading states show skeleton loaders or spinners

#### Performance
- [ ] React.memo applied to expensive components
- [ ] useMemo/useCallback used for expensive computations
- [ ] Virtual scrolling for long lists (conversations, test results)
- [ ] Recharts charts are properly optimized
- [ ] Images are lazy loaded with proper alt text

#### Accessibility (WCAG 2.1 AA)
- [ ] All interactive elements are keyboard accessible
- [ ] All form inputs have associated labels
- [ ] Color contrast ratios meet 4.5:1 minimum
- [ ] Focus indicators are visible and clear
- [ ] Screen reader announcements for dynamic content

#### Responsive Design
- [ ] Mobile (320px-768px): Single column, bottom sheet modals
- [ ] Tablet (768px-1024px): Two column, side modals
- [ ] Desktop (1024px+): Multi-column, overlay modals
- [ ] Touch targets are minimum 44x44px
- [ ] Text is readable without zooming

#### Security
- [ ] All API calls use authentication tokens
- [ ] Tenant isolation enforced via RLS policies
- [ ] API keys are masked in UI
- [ ] File uploads are validated (type, size, content)
- [ ] XSS protection on all user-generated content

### Estimated Development Effort

**Per View Breakdown**:
- P0 (Critical): 2-3 days each (views 1, 2, 8, 14, 16)
- P1 (High): 1.5-2 days each (views 3, 4, 5, 6, 9, 15, 17)
- P2 (Medium): 1-1.5 days each (views 7, 10, 11, 12, 13, 18)

**Total**: ~30 development days + 5 days testing/polish = 35 days (7 weeks)

---

**END OF COMPLETE DASHBOARD IMPLEMENTATION GUIDE**

*All 18 dashboard views are now fully specified with React/TypeScript code patterns, tRPC endpoint definitions, implementation checklists, and sequential development timelines. This guide provides everything needed to implement Phase 10 and Phase 11 dashboards for the Enterprise AI Assistant Platform.*

