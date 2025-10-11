/**
 * Team Page
 * Team member management, roles, permissions, and activity tracking
 * Based on product strategy: RBAC, team collaboration, activity logs*
 */

import { Avatar, AvatarFallback, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@platform/ui';
import { Clock, Mail, MoreVertical, Plus, Search, Shield, UserCheck, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';

export function TeamPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Mock team members data**
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
    {
      id: 'user-005',
      name: 'Lisa Anderson',
      email: 'lisa.anderson@acme.com',
      role: 'viewer',
      status: 'inactive',
      joinedAt: '2024-04-05',
      lastActive: '2024-10-08 16:30',
      conversations: 0,
      avgResponseTime: '—',
    },
  ];

  // Mock activity log data***
  const activityLog = [
    {
      id: 'act-001',
      user: 'Sarah Johnson',
      action: 'Handled escalated conversation',
      target: 'conv-003',
      timestamp: '2024-10-11 14:52',
      type: 'conversation',
    },
    {
      id: 'act-002',
      user: 'Michael Chen',
      action: 'Updated knowledge base article',
      target: 'API Rate Limiting',
      timestamp: '2024-10-11 14:45',
      type: 'knowledge',
    },
    {
      id: 'act-003',
      user: 'Emily Davis',
      action: 'Resolved escalation',
      target: 'esc-002',
      timestamp: '2024-10-11 13:20',
      type: 'escalation',
    },
    {
      id: 'act-004',
      user: 'Robert Martinez',
      action: 'Modified team permissions',
      target: 'Team Settings',
      timestamp: '2024-10-11 12:15',
      type: 'admin',
    },
    {
      id: 'act-005',
      user: 'Sarah Johnson',
      action: 'Added new team member',
      target: 'Alex Kim',
      timestamp: '2024-10-11 09:30',
      type: 'admin',
    },
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'manager':
        return 'default';
      case 'agent':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'outline';
    }
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
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Team Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage team members, roles, and permissions
          </p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Team Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">Active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {teamMembers.filter((m) => m.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Online today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.reduce((sum, m) => sum + m.conversations, 0)}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.8 min</div>
            <p className="text-xs text-muted-foreground">Team average</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Team Members</CardTitle>
          <CardDescription>Search by name, email, or filter by role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full md:w-[200px]">
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

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members*</CardTitle>
          <CardDescription>
            {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Conversations</TableHead>
                <TableHead className="text-right">Avg Response</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id} className="hover:bg-secondary/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeColor(member.role)} className="capitalize">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${member.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
                      />
                      <span className="text-sm capitalize">{member.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{member.conversations}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{member.avgResponseTime}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {member.lastActive}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Roles and Permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Definitions**
            </CardTitle>
            <CardDescription>Access levels and permissions by role</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 rounded-lg border">
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

              <div className="p-3 rounded-lg border">
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

              <div className="p-3 rounded-lg border">
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

              <div className="p-3 rounded-lg border">
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

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Recent Activity***
            </CardTitle>
            <CardDescription>Team member actions and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activityLog.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-secondary/50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-secondary text-xs">
                      {getInitials(activity.user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{activity.user}</span>
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activity.action}
                      {activity.target && (
                        <span className="font-medium ml-1">• {activity.target}</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {activity.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Annotations */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3 text-sm">Data Annotations:</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>* Team members - Real system includes OAuth SSO, SAML integration, and custom role creation</p>
            <p>** Role permissions - Production includes granular permissions (RBAC) with custom permission sets and API-level access control</p>
            <p>*** Activity log - Full audit trail with IP tracking, device fingerprinting, and 90-day retention for compliance</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
