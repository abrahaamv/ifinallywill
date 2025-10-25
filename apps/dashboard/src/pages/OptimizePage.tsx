/**
 * Optimize Page - Complete Redesign
 * Knowledge gaps identification and AI improvement recommendations
 * Modern card-based layout with actionable insights
 */

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@platform/ui';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileQuestion,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export function OptimizePage() {
  // Mock knowledge gaps data
  const knowledgeGaps = [
    {
      id: 'gap-001',
      topic: 'API Rate Limiting Configuration',
      frequency: 28,
      impact: 'high',
      confidence: 45,
      suggestedDocs: ['API Configuration Guide', 'Rate Limiting Best Practices'],
      exampleQuestions: [
        'How do I configure rate limits?',
        'What are the default rate limit values?',
        'Can I customize rate limiting per endpoint?',
      ],
    },
    {
      id: 'gap-002',
      topic: 'Webhook Payload Structure',
      frequency: 19,
      impact: 'medium',
      confidence: 52,
      suggestedDocs: ['Webhook Integration Guide', 'Event Payload Reference'],
      exampleQuestions: [
        'What fields are included in webhook payloads?',
        'How do I verify webhook signatures?',
      ],
    },
    {
      id: 'gap-003',
      topic: 'Custom Domain SSL Setup',
      frequency: 15,
      impact: 'medium',
      confidence: 58,
      suggestedDocs: ['Custom Domain Configuration', 'SSL Certificate Management'],
      exampleQuestions: [
        'How do I add a custom domain?',
        'What SSL certificate formats are supported?',
      ],
    },
    {
      id: 'gap-004',
      topic: 'Data Export Automation',
      frequency: 12,
      impact: 'low',
      confidence: 63,
      suggestedDocs: ['Data Export API', 'Scheduling Automated Exports'],
      exampleQuestions: ['Can I automate data exports?', 'What export formats are available?'],
    },
  ];

  const optimizationSuggestions = [
    {
      category: 'Knowledge Base',
      suggestion: 'Create dedicated guide for API rate limiting',
      impact: 'High',
      effort: 'Medium',
      expectedImprovement: '+15% resolution rate',
      priority: 'high',
    },
    {
      category: 'Agent Training',
      suggestion: 'Add webhook signature verification examples',
      impact: 'Medium',
      effort: 'Low',
      expectedImprovement: '+8% confidence score',
      priority: 'medium',
    },
    {
      category: 'Documentation',
      suggestion: 'Expand SSL setup troubleshooting section',
      impact: 'Medium',
      effort: 'Medium',
      expectedImprovement: '+10% first-contact resolution',
      priority: 'medium',
    },
    {
      category: 'Cost Optimization',
      suggestion: 'Route 12% more queries to Tier 1 AI',
      impact: 'High',
      effort: 'Low',
      expectedImprovement: '-$124/month costs',
      priority: 'high',
    },
  ];

  const learningOpportunities = [
    {
      topic: 'API Integration Patterns',
      currentPerformance: 87,
      targetPerformance: 95,
      conversations: 156,
      status: 'in-progress',
    },
    {
      topic: 'Billing & Payments',
      currentPerformance: 92,
      targetPerformance: 98,
      conversations: 98,
      status: 'completed',
    },
    {
      topic: 'Account Management',
      currentPerformance: 79,
      targetPerformance: 90,
      conversations: 134,
      status: 'pending',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Optimization</h1>
          <p className="mt-2 text-gray-600">
            Knowledge gaps, improvement opportunities, and learning recommendations
          </p>
        </div>
        <Button>
          <BookOpen className="mr-2 h-4 w-4" />
          Generate Improvement Plan
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Knowledge Gaps</p>
              <FileQuestion className="h-5 w-5 text-orange-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">{knowledgeGaps.length}</p>
            <p className="mt-1 text-xs text-gray-500">Areas needing improvement</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Opportunities</p>
              <Lightbulb className="h-5 w-5 text-blue-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">
              {optimizationSuggestions.length}
            </p>
            <p className="mt-1 text-xs text-gray-500">Active recommendations</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Avg AI Confidence</p>
              <Sparkles className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">86.3%</p>
            <p className="mt-1 text-xs text-gray-500">Across all topics</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Potential Savings</p>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-900">$148/mo</p>
            <p className="mt-1 text-xs text-gray-500">From optimizations</p>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Gaps */}
      <Card className="border-gray-200 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            Identified Knowledge Gaps
          </CardTitle>
          <CardDescription>
            Topics where AI confidence is low or frequently unanswered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead className="text-right">Frequency</TableHead>
                <TableHead className="text-right">AI Confidence</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Suggested Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {knowledgeGaps.map((gap) => (
                <TableRow key={gap.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{gap.topic}</span>
                      <div className="mt-1 text-xs text-gray-500">"{gap.exampleQuestions[0]}"</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{gap.frequency} queries</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-medium">{gap.confidence}%</span>
                      <Progress value={gap.confidence} className="h-1.5 w-20" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        gap.impact === 'high'
                          ? 'destructive'
                          : gap.impact === 'medium'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {gap.impact}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Create Guide
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Optimization Suggestions */}
      <Card className="border-gray-200 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Optimization Suggestions
          </CardTitle>
          <CardDescription>AI-generated recommendations for improvement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {optimizationSuggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`rounded-lg border p-4 ${
                suggestion.priority === 'high'
                  ? 'border-red-200 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline">{suggestion.category}</Badge>
                    <Badge
                      variant={
                        suggestion.priority === 'high'
                          ? 'destructive'
                          : suggestion.priority === 'medium'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {suggestion.priority} priority
                    </Badge>
                  </div>
                  <h4 className="mb-2 font-semibold">{suggestion.suggestion}</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Impact:</span>
                      <span className="ml-2 font-medium">{suggestion.impact}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Effort:</span>
                      <span className="ml-2 font-medium">{suggestion.effort}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Expected:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {suggestion.expectedImprovement}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Implement
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Learning Progress */}
      <Card className="border-gray-200 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Continuous Learning Progress
          </CardTitle>
          <CardDescription>AI performance improvement tracking by topic</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {learningOpportunities.map((opportunity, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{opportunity.topic}</span>
                  {opportunity.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : opportunity.status === 'in-progress' ? (
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                  ) : null}
                </div>
                <span className="text-sm text-gray-500">
                  {opportunity.conversations} conversations
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">
                      Current: {opportunity.currentPerformance}%
                    </span>
                    <span className="text-gray-600">Target: {opportunity.targetPerformance}%</span>
                  </div>
                  <Progress value={opportunity.currentPerformance} className="h-2" />
                </div>
                <Badge
                  variant={
                    opportunity.status === 'completed'
                      ? 'default'
                      : opportunity.status === 'in-progress'
                        ? 'secondary'
                        : 'outline'
                  }
                  className="capitalize"
                >
                  {opportunity.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
