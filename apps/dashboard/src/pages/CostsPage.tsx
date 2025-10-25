/**
 * Costs Page
 * Comprehensive cost intelligence dashboard with budget tracking and optimization
 * Based on product strategy: 82-85% cost reduction, transparent AI routing costs*
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
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  DollarSign,
  Download,
  PieChart,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

export function CostsPage() {
  const [timeRange, setTimeRange] = useState('30d');

  // Mock cost data**
  const currentMonth = {
    total: 1245.67,
    budget: 5000,
    savings: 6842.33,
    savingsPercentage: 84.6,
    previousMonth: 1187.42,
  };

  const costBreakdown = [
    { tier: 'Gemini Flash-Lite 8B', usage: '60%', cost: 747.4, requests: 12847, avgCost: 0.058 },
    { tier: 'Gemini Flash', usage: '25%', cost: 311.42, requests: 5353, avgCost: 0.058 },
    { tier: 'Claude Sonnet 4.5', usage: '15%', cost: 186.85, requests: 3208, avgCost: 0.058 },
  ];

  const dailyCosts = [
    { date: '10/05', total: 42.34, tier1: 25.4, tier2: 10.58, tier3: 6.36 },
    { date: '10/06', total: 38.92, tier1: 23.35, tier2: 9.73, tier3: 5.84 },
    { date: '10/07', total: 45.18, tier1: 27.11, tier2: 11.29, tier3: 6.78 },
    { date: '10/08', total: 41.67, tier1: 25.0, tier2: 10.42, tier3: 6.25 },
    { date: '10/09', total: 48.23, tier1: 28.94, tier2: 12.06, tier3: 7.23 },
    { date: '10/10', total: 39.84, tier1: 23.9, tier2: 9.96, tier3: 5.98 },
    { date: '10/11', total: 43.56, tier1: 26.14, tier2: 10.89, tier3: 6.53 },
  ];

  const budgetStatus = (currentMonth.total / currentMonth.budget) * 100;
  const monthlyChange =
    ((currentMonth.total - currentMonth.previousMonth) / currentMonth.previousMonth) * 100;

  const isLoading = false; // Will be true when tRPC integration is added

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-primary-600" />
            Cost Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            AI usage costs, budget tracking, and optimization opportunities
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${currentMonth.total.toFixed(2)}</div>
            <div className="flex items-center gap-1 mt-2">
              {monthlyChange > 0 ? (
                <ArrowUp className="h-4 w-4 text-[var(--color-error-600)]" />
              ) : (
                <ArrowDown className="h-4 w-4 text-[var(--color-success-600)]" />
              )}
              <span
                className={`text-sm font-medium ${monthlyChange > 0 ? 'text-[var(--color-error-600)]' : 'text-[var(--color-success-600)]'}`}
              >
                {Math.abs(monthlyChange).toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{budgetStatus.toFixed(1)}%</div>
            <Progress value={budgetStatus} className="h-2 mt-3" />
            <p className="text-xs text-muted-foreground mt-2">
              ${currentMonth.total.toFixed(2)} of ${currentMonth.budget.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-[var(--color-success-200)] bg-[var(--color-success-50)]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-success-900)]">
              Cost Savings***
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-[var(--color-success-600)]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--color-success-600)]">
              ${currentMonth.savings.toFixed(2)}
            </div>
            <p className="text-xs text-[var(--color-success-800)] mt-2">
              {currentMonth.savingsPercentage.toFixed(1)}% vs standard pricing
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg per Request
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$0.058</div>
            <p className="text-xs text-muted-foreground mt-2">Across all AI tiers</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown and Daily Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Tier Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by AI Tier*</CardTitle>
            <CardDescription>Three-tier routing for optimal cost efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Usage</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costBreakdown.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.tier}</span>
                        <Badge variant="secondary" className="w-fit mt-1">
                          Tier {index + 1}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-medium">{item.usage}</span>
                        <Progress
                          value={Number.parseFloat(item.usage)}
                          className="h-1.5 w-16 mt-1"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.requests.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-[var(--color-success-600)]">
                      ${item.cost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-secondary/50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell className="text-right font-mono">
                    {costBreakdown.reduce((sum, item) => sum + item.requests, 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[var(--color-success-600)]">
                    ${costBreakdown.reduce((sum, item) => sum + item.cost, 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Daily Cost Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Cost Trends**</CardTitle>
            <CardDescription>Last 7 days breakdown by AI tier</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Tier 1</TableHead>
                  <TableHead className="text-right">Tier 2</TableHead>
                  <TableHead className="text-right">Tier 3</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyCosts.map((day, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{day.date}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${day.tier1.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${day.tier2.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${day.tier3.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      ${day.total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alerts */}
      <Card className="border-[var(--color-warning-200)] bg-[var(--color-warning-50)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--color-warning-900)]">
            <AlertTriangle className="h-5 w-5" />
            Budget Alerts & Notifications
          </CardTitle>
          <CardDescription className="text-[var(--color-warning-800)]">
            Automated monitoring and threshold alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-[var(--color-warning-200)] bg-white">
              <div className="h-2 w-2 rounded-full bg-[var(--color-success-500)] mt-1.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-warning-900)]">
                  Budget Status: Healthy
                </p>
                <p className="text-xs text-[var(--color-warning-700)] mt-1">
                  You're using {budgetStatus.toFixed(1)}% of your monthly budget. On track for the
                  month.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-[var(--color-warning-200)] bg-white">
              <div className="h-2 w-2 rounded-full bg-[var(--color-info-500)] mt-1.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-warning-900)]">
                  Optimization Opportunity
                </p>
                <p className="text-xs text-[var(--color-warning-700)] mt-1">
                  15% of Tier 3 requests could be handled by Tier 2 AI. Potential savings:
                  $28.03/month.
                </p>
              </div>
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
              * AI Tier costs - Gemini Flash-Lite 8B ($0.075/1M tokens), Gemini Flash ($0.20/1M),
              Claude Sonnet 4.5 ($3.00/1M)
            </p>
            <p>
              ** Daily trends - Real system tracks costs per conversation session with LiveKit and
              AI provider usage
            </p>
            <p>
              *** Cost savings - Calculated against standard pricing without three-tier routing
              (estimated baseline ~$8K/month)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
