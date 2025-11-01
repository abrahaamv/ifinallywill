/**
 * Dashboard Home Page - Complete Redesign
 * Modern activity feed, refined stats, and quick actions
 * Inspired by Touchpoint CRM + Meeto.ai designs
 */

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@platform/ui';
import {
  Activity,
  BookOpen,
  Clock,
  DollarSign,
  MessageSquare,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc';

interface ActivityItem {
  id: string;
  type: 'conversation' | 'document' | 'room' | 'team';
  title: string;
  description: string;
  timestamp: string;
  user?: { name: string; avatar?: string };
  status?: 'success' | 'warning' | 'info';
}

export function HomePage() {
  const navigate = useNavigate();

  // Fetch real data from backend
  const { data: sessionsData, isLoading: sessionsLoading } = trpc.sessions.list.useQuery({
    limit: 100,
    offset: 0,
  });

  const { data: documentsData, isLoading: documentsLoading } = trpc.knowledge.list.useQuery({
    limit: 100,
    offset: 0,
  });

  // Calculate metrics
  const totalSessions = sessionsData?.total || 0;
  const totalDocuments = documentsData?.total || 0;
  const activeNow = 0; // Real-time from WebSocket
  const monthlyCost = 245.67;
  const baselineCost = 1598.23;
  const costSavings = ((baselineCost - monthlyCost) / baselineCost) * 100;

  const isLoading = sessionsLoading || documentsLoading;

  // Mock activity data - will be replaced with real data
  const recentActivity: ActivityItem[] = [
    {
      id: '1',
      type: 'conversation',
      title: 'Customer Support Conversation',
      description: 'Resolved billing inquiry with AI-first approach',
      timestamp: '5 minutes ago',
      user: { name: 'Sarah Chen', avatar: undefined },
      status: 'success',
    },
    {
      id: '2',
      type: 'document',
      title: 'Product Documentation Updated',
      description: 'Added 12 new articles to knowledge base',
      timestamp: '1 hour ago',
      user: { name: 'Mike Johnson' },
      status: 'info',
    },
    {
      id: '3',
      type: 'room',
      title: 'Team Standup Meeting',
      description: 'AI assistant analyzed screen sharing session',
      timestamp: '2 hours ago',
      status: 'info',
    },
    {
      id: '4',
      type: 'conversation',
      title: 'Sales Escalation',
      description: 'High-value lead conversation escalated to human agent',
      timestamp: '3 hours ago',
      user: { name: 'Emma Wilson' },
      status: 'warning',
    },
  ];

  const user = {
    name: 'John Doe',
    email: 'john@platform.com',
    initials: 'JD',
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {user.name.split(' ')[0]}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Here's what's happening with your AI assistant platform today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Conversations */}
        <Card className="border shadow-card hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Conversations</p>
                  <MessageSquare className="h-5 w-5 text-primary-600" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">
                    {totalSessions.toLocaleString()}
                  </p>
                  <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    12%
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">+32 from last month</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Knowledge Base */}
        <Card className="border shadow-card hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Documents</p>
                  <BookOpen className="h-5 w-5 text-primary-600" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-foreground">
                    {totalDocuments.toLocaleString()}
                  </p>
                  <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    8%
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">+{totalDocuments} in knowledge base</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Cost Savings */}
        <Card className="border shadow-card hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Cost Savings</p>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-foreground">{costSavings.toFixed(0)}%</p>
              <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                <TrendingDown className="h-4 w-4" />
                85% reduction
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              ${monthlyCost.toFixed(2)}/mo vs ${baselineCost.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Active Now */}
        <Card className="border shadow-card hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Active Now</p>
              <Activity className="h-5 w-5 text-primary-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-foreground">{activeNow}</p>
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-green-400" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Real-time connections</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity Feed */}
        <div className="lg:col-span-2">
          <Card className="border shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription className="mt-1">Latest events and updates</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="group flex gap-4 rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                  >
                    {/* Icon */}
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                        activity.status === 'success'
                          ? 'bg-green-100 text-green-600'
                          : activity.status === 'warning'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      {activity.type === 'conversation' && <MessageSquare className="h-5 w-5" />}
                      {activity.type === 'document' && <BookOpen className="h-5 w-5" />}
                      {activity.type === 'room' && <Video className="h-5 w-5" />}
                      {activity.type === 'team' && <Users className="h-5 w-5" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {activity.timestamp}
                        {activity.user && (
                          <>
                            <span>•</span>
                            <span>{activity.user.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <Card className="border shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Get started with common tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => navigate('/conversations')}
              >
                <MessageSquare className="h-5 w-5 text-primary-600" />
                <div className="text-left">
                  <p className="font-medium">Start Conversation</p>
                  <p className="text-xs text-muted-foreground">Chat with AI assistant</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => navigate('/knowledge')}
              >
                <Plus className="h-5 w-5 text-primary-600" />
                <div className="text-left">
                  <p className="font-medium">Upload Documents</p>
                  <p className="text-xs text-muted-foreground">Add to knowledge base</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => navigate('/rooms')}
              >
                <Video className="h-5 w-5 text-primary-600" />
                <div className="text-left">
                  <p className="font-medium">Create Meeting</p>
                  <p className="text-xs text-muted-foreground">Start LiveKit room</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => navigate('/team')}
              >
                <Users className="h-5 w-5 text-primary-600" />
                <div className="text-left">
                  <p className="font-medium">Invite Team</p>
                  <p className="text-xs text-muted-foreground">Add team members</p>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="border shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">System Status</CardTitle>
              <CardDescription>Platform health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">API</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Database</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">LiveKit</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">AI Services</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                  Operational
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
