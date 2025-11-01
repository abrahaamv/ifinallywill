/**
 * Conversations Page - Complete Redesign
 * Modern table with filters, search, and status indicators
 * Inspired by Touchpoint CRM design
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@platform/ui';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  Filter,
  MessageCircle,
  Search,
  User,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { trpc } from '../utils/trpc';

export function ConversationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data, isLoading, error } = trpc.sessions.list.useQuery({
    limit: 100,
    offset: 0,
  });

  const conversations = data?.sessions || [];
  const totalCount = data?.total || 0;

  // Helper function to compute status from session data
  const getConversationStatus = (conv: typeof conversations[0]): string => {
    if (conv.endedAt) return 'completed';
    return 'active';
  };

  // Filter conversations based on search and status
  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      searchQuery === '' || conv.id.toLowerCase().includes(searchQuery.toLowerCase());
    const convStatus = getConversationStatus(conv);
    const matchesStatus = statusFilter === 'all' || convStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any; label: string }
    > = {
      active: { variant: 'default', icon: Clock, label: 'Active' },
      completed: { variant: 'secondary', icon: CheckCircle2, label: 'Completed' },
      escalated: { variant: 'destructive', icon: AlertCircle, label: 'Escalated' },
      abandoned: { variant: 'outline', icon: XCircle, label: 'Abandoned' },
    };

    const config = (variants[status] || variants.active)!;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conversations</h1>
          <p className="mt-2 text-muted-foreground">Manage and review AI assistant conversations</p>
        </div>
        <Button>
          <MessageCircle className="mr-2 h-4 w-4" />
          New Conversation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <MessageCircle className="h-5 w-5 text-gray-400" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {isLoading ? '—' : totalCount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Active</p>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {isLoading ? '—' : conversations.filter((c) => getConversationStatus(c) === 'active').length}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {isLoading ? '—' : conversations.filter((c) => getConversationStatus(c) === 'completed').length}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Escalated</p>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {isLoading ? '—' : conversations.filter((c) => getConversationStatus(c) === 'escalated').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversations Table */}
      <Card className="border shadow-card">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Conversations</CardTitle>
              <CardDescription className="mt-1">
                {filteredConversations.length} of {totalCount} conversations
              </CardDescription>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="abandoned">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {error ? (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load conversations: {error.message}</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="mb-4 h-12 w-12 text-gray-400" />
              <p className="text-muted-foreground">No conversations found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start a new conversation to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConversations.map((conv) => (
                    <TableRow key={conv.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {conv.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{getStatusBadge(getConversationStatus(conv))}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {conv.mode === 'meeting' ? (
                            <>
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">Meeting</span>
                            </>
                          ) : (
                            <>
                              <Bot className="h-4 w-4 text-primary-600" />
                              <span className="text-sm">Text Chat</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {/* Mock message count */}
                        {Math.floor(Math.random() * 20) + 1}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(conv.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {conv.endedAt ? formatDate(conv.endedAt) : 'Active'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
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
  );
}
