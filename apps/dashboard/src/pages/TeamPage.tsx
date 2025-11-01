/**
 * Team Page - Complete Redesign
 * Modern member cards with role badges and activity tracking
 * Inspired by team management interfaces
 */

import {
  Avatar,
  AvatarFallback,
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
} from '@platform/ui';
import {
  AlertCircle,
  Clock,
  Mail,
  MessageSquare,
  Search,
  Shield,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { trpc } from '../utils/trpc';

export function TeamPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const { isLoading, error } = trpc.users.list.useQuery({
    limit: 100,
    offset: 0,
  });

  // Mock team members data
  const teamMembers = [
    {
      id: 'user-001',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@acme.com',
      role: 'admin',
      status: 'active',
      joinedAt: '2024-01-15',
      lastActive: '2024-10-11 14:52',
      conversations: 342,
      avgResponseTime: '3.2 min',
    },
    {
      id: 'user-002',
      name: 'Michael Chen',
      email: 'michael.chen@acme.com',
      role: 'agent',
      status: 'active',
      joinedAt: '2024-02-20',
      lastActive: '2024-10-11 14:45',
      conversations: 287,
      avgResponseTime: '4.1 min',
    },
    {
      id: 'user-003',
      name: 'Emily Davis',
      email: 'emily.davis@acme.com',
      role: 'agent',
      status: 'active',
      joinedAt: '2024-03-10',
      lastActive: '2024-10-11 13:20',
      conversations: 198,
      avgResponseTime: '3.8 min',
    },
    {
      id: 'user-004',
      name: 'Robert Martinez',
      email: 'robert.martinez@acme.com',
      role: 'manager',
      status: 'active',
      joinedAt: '2024-01-20',
      lastActive: '2024-10-11 12:15',
      conversations: 156,
      avgResponseTime: '5.2 min',
    },
  ];

  const getRoleBadgeColor = (role: string): 'destructive' | 'default' | 'secondary' | 'outline' => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
      admin: 'destructive',
      manager: 'default',
      agent: 'secondary',
      viewer: 'outline',
    };
    return variants[role] || 'outline';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch =
      searchQuery === '' ||
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="mt-2 text-muted-foreground">Manage team members, roles, and permissions</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Total Members</p>
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {isLoading ? '—' : teamMembers.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Active Now</p>
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {isLoading ? '—' : teamMembers.filter((m) => m.status === 'active').length}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Conversations</p>
              <MessageSquare className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {isLoading ? '—' : teamMembers.reduce((sum, m) => sum + m.conversations, 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
              <Clock className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{isLoading ? '—' : '3.8 min'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="border shadow-card">
        <CardHeader>
          <CardTitle>Filter Members</CardTitle>
          <CardDescription>Search by name, email, or filter by role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Grid */}
      <Card className="border shadow-card">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error ? (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load team members: {error.message}</p>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-4 h-16 w-16 text-gray-400" />
              <p className="text-muted-foreground">No team members found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((member) => (
                <Card
                  key={member.id}
                  className="group cursor-pointer border shadow-sm transition-all hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary-100 text-sm font-medium text-primary-700">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-base">{member.name}</CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-1 text-xs">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Role:</span>
                        <Badge variant={getRoleBadgeColor(member.role)} className="capitalize">
                          {member.role}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${member.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
                          />
                          <span className="text-xs capitalize">{member.status}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Conversations:</span>
                        <span className="text-xs font-medium">{member.conversations}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Avg Response:</span>
                        <span className="text-xs font-medium font-mono">
                          {member.avgResponseTime}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t">
                        <Clock className="h-3 w-3" />
                        <span>Last active: {member.lastActive}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Definitions */}
      <Card className="border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Definitions
          </CardTitle>
          <CardDescription>Access levels and permissions by role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="destructive">Admin</Badge>
                <span className="text-xs text-muted-foreground">Full Access</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Manage team members and permissions</li>
                <li>Configure integrations and webhooks</li>
                <li>View all analytics and reports</li>
                <li>Manage billing and subscriptions</li>
              </ul>
            </div>

            <div className="rounded-lg border border p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge>Manager</Badge>
                <span className="text-xs text-muted-foreground">Team Management</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Handle escalated conversations</li>
                <li>View team analytics and performance</li>
                <li>Manage knowledge base content</li>
                <li>Assign conversations to agents</li>
              </ul>
            </div>

            <div className="rounded-lg border border p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary">Agent</Badge>
                <span className="text-xs text-muted-foreground">Conversation Handling</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Handle assigned conversations</li>
                <li>View own performance metrics</li>
                <li>Update knowledge base articles</li>
                <li>Create escalations when needed</li>
              </ul>
            </div>

            <div className="rounded-lg border border p-4">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">Viewer</Badge>
                <span className="text-xs text-muted-foreground">Read Only</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>View conversations and transcripts</li>
                <li>Access analytics dashboards</li>
                <li>Read knowledge base content</li>
                <li>No editing or management permissions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
