/**
 * Analytics Page
 * Comprehensive analytics dashboard with KPIs, trends, and insights
 * Based on product strategy: Performance metrics, conversation analysis, cost tracking*
 */

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
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
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Clock,
  DollarSign,
  MessageCircle,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');

  // Mock data for analytics*
  const kpis = [
    {
      label: 'Total Conversations',
      value: '2,847',
      change: '+12.3%',
      trend: 'up',
      icon: MessageCircle,
    },
    {
      label: 'Avg Resolution Time',
      value: '4.2 min',
      change: '-18.5%',
      trend: 'down',
      icon: Clock,
    },
    {
      label: 'AI Success Rate',
      value: '94.8%',
      change: '+5.2%',
      trend: 'up',
      icon: Zap,
    },
    {
      label: 'Cost Savings',
      value: '$12,450',
      change: '+22.1%',
      trend: 'up',
      icon: DollarSign,
    },
  ];

  const topTopics = [
    { topic: 'API Integration', count: 487, percentage: 85, sentiment: 'positive' },
    { topic: 'Billing Questions', count: 312, percentage: 72, sentiment: 'neutral' },
    { topic: 'Feature Requests', count: 298, percentage: 68, sentiment: 'positive' },
    { topic: 'Bug Reports', count: 156, percentage: 45, sentiment: 'negative' },
    { topic: 'Account Setup', count: 134, percentage: 38, sentiment: 'neutral' },
  ];

  const recentPerformance = [
    { date: 'Mon', conversations: 420, resolved: 398, avgTime: 4.1 },
    { date: 'Tue', conversations: 445, resolved: 421, avgTime: 4.3 },
    { date: 'Wed', conversations: 412, resolved: 395, avgTime: 3.9 },
    { date: 'Thu', conversations: 468, resolved: 441, avgTime: 4.5 },
    { date: 'Fri', conversations: 502, resolved: 475, avgTime: 4.2 },
    { date: 'Sat', conversations: 301, resolved: 287, avgTime: 3.8 },
    { date: 'Sun', conversations: 299, resolved: 283, avgTime: 3.7 },
  ];

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Performance metrics and conversation insights
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          const isPositive = kpi.trend === 'up';
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{kpi.value}</div>
                <div className="flex items-center gap-1 mt-2">
                  {isPositive ? (
                    <ArrowUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {kpi.change}
                  </span>
                  <span className="text-sm text-muted-foreground">vs last period</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts and Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Topics */}
        <Card>
          <CardHeader>
            <CardTitle>Top Conversation Topics**</CardTitle>
            <CardDescription>Most frequent discussion areas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topTopics.map((topic, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{topic.topic}</span>
                    <Badge
                      variant={
                        topic.sentiment === 'positive'
                          ? 'default'
                          : topic.sentiment === 'negative'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="text-xs"
                    >
                      {topic.sentiment}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground">{topic.count} conversations</span>
                </div>
                <Progress value={topic.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weekly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Performance*</CardTitle>
            <CardDescription>Daily conversation metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Conversations</TableHead>
                  <TableHead className="text-right">Resolved</TableHead>
                  <TableHead className="text-right">Avg Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPerformance.map((day, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{day.date}</TableCell>
                    <TableCell className="text-right">{day.conversations}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-600 font-medium">{day.resolved}</span>
                    </TableCell>
                    <TableCell className="text-right">{day.avgTime} min</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            AI-Generated Insights***
          </CardTitle>
          <CardDescription>Actionable recommendations based on performance data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-green-600" />
                <h4 className="font-semibold text-green-900 dark:text-green-100">
                  High Performance
                </h4>
              </div>
              <p className="text-sm text-green-800 dark:text-green-200">
                API Integration topic showing 85% resolution rate. Consider creating more
                documentation.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">Peak Hours</h4>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Fridays show 15% higher volume. Consider adjusting agent availability during these
                times.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-orange-600" />
                <h4 className="font-semibold text-orange-900 dark:text-orange-100">
                  Cost Optimization
                </h4>
              </div>
              <p className="text-sm text-orange-800 dark:text-orange-200">
                82% of conversations resolved with Tier 1 AI (lowest cost). Excellent cost
                efficiency.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Annotations */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3 text-sm">Data Annotations:</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              * Mock data - Real analytics will be populated from actual conversation sessions and
              knowledge base interactions
            </p>
            <p>
              ** Topic analysis - Will use AI-powered NLP to automatically categorize and track
              conversation themes
            </p>
            <p>
              *** AI insights - Generated by analyzing patterns in conversation success rates,
              resolution times, and user feedback
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
