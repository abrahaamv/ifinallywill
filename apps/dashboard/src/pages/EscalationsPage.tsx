/**
 * Escalations Page
 *
 * Human agent escalation management.
 * Previously integrated with Chatwoot — now standalone.
 */

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@platform/ui';
import { AlertTriangle, CheckCircle2, Clock, MessageCircle, User, XCircle } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';

export function EscalationsPage() {
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('pending');

  // Mock escalation data
  const escalations = [
    {
      id: 'esc-001',
      conversationId: 'conv-003',
      customer: 'Emily Davis',
      company: 'Global Solutions',
      reason: 'Complex technical issue beyond AI scope',
      priority: 'high',
      status: 'pending',
      assignedTo: null,
      createdAt: '2024-10-11 13:58',
      waitTime: '1h 15m',
      category: 'technical',
    },
    {
      id: 'esc-002',
      conversationId: 'conv-018',
      customer: 'Robert Martinez',
      company: 'Enterprise LLC',
      reason: 'Customer requested human agent',
      priority: 'medium',
      status: 'assigned',
      assignedTo: 'Sarah Johnson',
      createdAt: '2024-10-11 14:22',
      waitTime: '52m',
      category: 'request',
    },
    {
      id: 'esc-003',
      conversationId: 'conv-012',
      customer: 'Jennifer Lee',
      company: 'Tech Innovations',
      reason: 'Billing dispute requiring manual review',
      priority: 'high',
      status: 'in-progress',
      assignedTo: 'Michael Chen',
      createdAt: '2024-10-11 12:45',
      waitTime: '2h 30m',
      category: 'billing',
    },
    {
      id: 'esc-004',
      conversationId: 'conv-029',
      customer: 'David Thompson',
      company: 'StartupHub',
      reason: 'AI confidence score below threshold',
      priority: 'low',
      status: 'pending',
      assignedTo: null,
      createdAt: '2024-10-11 14:45',
      waitTime: '30m',
      category: 'ai-confidence',
    },
    {
      id: 'esc-005',
      conversationId: 'conv-007',
      customer: 'Lisa Anderson',
      company: 'Global Corp',
      reason: 'Security concern flagged by AI',
      priority: 'critical',
      status: 'assigned',
      assignedTo: 'Alex Kim',
      createdAt: '2024-10-11 14:50',
      waitTime: '25m',
      category: 'security',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'in-progress':
        return <Clock className="h-4 w-4" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  const filteredEscalations = escalations.filter((esc) => {
    const matchesPriority = filterPriority === 'all' || esc.priority === filterPriority;
    const matchesStatus = filterStatus === 'all' || esc.status === filterStatus;
    return matchesPriority && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-primary" />
            Escalations
          </h1>
          <p className="text-muted-foreground mt-1">
            Conversations requiring human intervention and expert assistance
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-900 dark:text-red-100">
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {escalations.filter((e) => e.priority === 'critical').length}
            </div>
            <p className="text-xs text-red-800 dark:text-red-200">Immediate attention required</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">
              High
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {escalations.filter((e) => e.priority === 'high').length}
            </div>
            <p className="text-xs text-orange-800 dark:text-orange-200">Within 1 hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {escalations.filter((e) => e.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {
                escalations.filter((e) => e.status === 'in-progress' || e.status === 'assigned')
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">Being handled</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Escalations</CardTitle>
          <CardDescription>View by priority level or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Escalations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Escalations</CardTitle>
          <CardDescription>
            {filteredEscalations.length} escalation{filteredEscalations.length !== 1 ? 's' : ''}{' '}
            found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead className="text-right">Wait Time</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEscalations.map((esc) => (
                <TableRow key={esc.id} className="hover:bg-secondary/50">
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {esc.customer}
                      </div>
                      <div className="text-sm text-muted-foreground">{esc.company}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col max-w-xs">
                      <span className="text-sm">{esc.reason}</span>
                      <Badge variant="outline" className="w-fit mt-1">
                        {esc.category}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(esc.priority)} className="capitalize">
                      {esc.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                      {getStatusIcon(esc.status)}
                      {esc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {esc.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{esc.assignedTo}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{esc.waitTime}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {esc.status === 'pending' && (
                        <Button variant="outline" size="sm">
                          Assign
                        </Button>
                      )}
                      <NavLink to={`/conversations/${esc.conversationId}`}>
                        <Button variant="ghost" size="sm">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </NavLink>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
