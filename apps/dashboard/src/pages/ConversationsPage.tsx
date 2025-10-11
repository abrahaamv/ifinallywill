/**
 * Conversations Page
 * Comprehensive conversation management with filtering, search, and detail views
 * Based on product strategy: Real-time conversation monitoring, AI performance tracking*
 */

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@platform/ui';
import { Bot, CheckCircle2, Clock, Filter, MessageCircle, Search, User, XCircle } from 'lucide-react';
import { useState } from 'react';

export function ConversationsPage() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock conversation data*
  const conversations = [
    {
      id: 'conv-001',
      customer: 'Sarah Johnson',
      company: 'Acme Corp',
      topic: 'API Integration',
      status: 'resolved',
      aiTier: 'Tier 1',
      duration: '3:42',
      cost: '$0.12',
      satisfaction: 5,
      timestamp: '2024-10-11 14:32',
      tags: ['api', 'technical'],
    },
    {
      id: 'conv-002',
      customer: 'Michael Chen',
      company: 'TechStart Inc',
      topic: 'Billing Question',
      status: 'active',
      aiTier: 'Tier 2',
      duration: '2:15',
      cost: '$0.08',
      satisfaction: null,
      timestamp: '2024-10-11 14:45',
      tags: ['billing', 'account'],
    },
    {
      id: 'conv-003',
      customer: 'Emily Davis',
      company: 'Global Solutions',
      topic: 'Feature Request',
      status: 'escalated',
      aiTier: 'Tier 3',
      duration: '8:24',
      cost: '$0.45',
      satisfaction: 4,
      timestamp: '2024-10-11 13:58',
      tags: ['feature', 'product'],
    },
    {
      id: 'conv-004',
      customer: 'David Wilson',
      company: 'StartupXYZ',
      topic: 'Bug Report',
      status: 'resolved',
      aiTier: 'Tier 2',
      duration: '5:18',
      cost: '$0.22',
      satisfaction: 4,
      timestamp: '2024-10-11 13:12',
      tags: ['bug', 'technical'],
    },
    {
      id: 'conv-005',
      customer: 'Lisa Anderson',
      company: 'Enterprise Co',
      topic: 'Account Setup',
      status: 'resolved',
      aiTier: 'Tier 1',
      duration: '2:45',
      cost: '$0.09',
      satisfaction: 5,
      timestamp: '2024-10-11 12:30',
      tags: ['onboarding', 'account'],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'default';
      case 'active':
        return 'secondary';
      case 'escalated':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'active':
        return <Clock className="h-4 w-4" />;
      case 'escalated':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesStatus = filterStatus === 'all' || conv.status === filterStatus;
    const matchesSearch =
      searchQuery === '' ||
      conv.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.company.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-primary" />
            Conversations
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage all customer interactions
          </p>
        </div>
        <Button>
          <Bot className="h-4 w-4 mr-2" />
          Start Test Conversation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.length}</div>
            <p className="text-xs text-muted-foreground">All conversations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {conversations.filter((c) => c.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {conversations.filter((c) => c.status === 'resolved').length}
            </div>
            <p className="text-xs text-muted-foreground">Successfully closed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Escalated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {conversations.filter((c) => c.status === 'escalated').length}
            </div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Conversations</CardTitle>
          <CardDescription>Search and filter by status, topic, or customer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customer, topic, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conversations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations**</CardTitle>
          <CardDescription>
            {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AI Tier</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConversations.map((conv) => (
                <TableRow key={conv.id} className="hover:bg-secondary/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {conv.customer}
                      </div>
                      <div className="text-sm text-muted-foreground">{conv.company}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{conv.topic}</span>
                      <div className="flex gap-1 mt-1">
                        {conv.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(conv.status)} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(conv.status)}
                      {conv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{conv.aiTier}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{conv.duration}</TableCell>
                  <TableCell className="text-right font-mono text-sm text-green-600">{conv.cost}</TableCell>
                  <TableCell className="text-right">
                    {conv.satisfaction ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="font-medium">{conv.satisfaction}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" disabled>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer Annotations */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3 text-sm">Data Annotations:</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>* Mock data - Real conversations will be tracked from LiveKit sessions and AI chat interactions</p>
            <p>** Real-time updates - Production system will show live conversation status and real-time notifications</p>
            <p>*** AI Tier system - Tier 1 (Gemini Flash-Lite 8B), Tier 2 (Gemini Flash), Tier 3 (Claude Sonnet 4.5) for optimal cost/performance</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
