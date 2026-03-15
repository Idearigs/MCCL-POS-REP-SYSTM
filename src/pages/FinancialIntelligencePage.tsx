import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  TrendingUp as Profit,
  Percent,
  Brain,
  Sparkles,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Plus,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { financialIntelligenceService, DashboardSummary, Recommendation } from '@/services/financialIntelligenceService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const FinancialIntelligencePage: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [recommendationNotes, setRecommendationNotes] = useState('');

  // Generate Analysis Dialog State
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analysisType, setAnalysisType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM'>('MONTHLY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useAI, setUseAI] = useState(true);

  useEffect(() => {
    loadDashboard();
    // Set default date range (current month)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await financialIntelligenceService.getDashboardSummary();
      setSummary(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load dashboard',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
    toast({
      title: 'Refreshed',
      description: 'Dashboard data has been updated',
    });
  };

  const handleUpdateRecommendation = async (id: string, status: Recommendation['status']) => {
    try {
      await financialIntelligenceService.updateRecommendation(id, {
        status,
        notes: recommendationNotes || undefined,
      });
      toast({
        title: 'Success',
        description: 'Recommendation updated successfully',
      });
      setSelectedRecommendation(null);
      setRecommendationNotes('');
      await loadDashboard();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update recommendation',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateAnalysis = async () => {
    if (!startDate || !endDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select both start and end dates',
        variant: 'destructive',
      });
      return;
    }

    try {
      setGenerating(true);
      await financialIntelligenceService.generateAnalysis({
        analysisType,
        startDate,
        endDate,
        useAI,
      });
      toast({
        title: 'Success',
        description: 'Financial analysis generated successfully',
      });
      setIsGenerateDialogOpen(false);
      await loadDashboard();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate analysis',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => financialIntelligenceService.formatCurrency(amount);
  const formatPercentage = (value: number) => financialIntelligenceService.formatPercentage(value);
  const getPriorityColor = (priority: Recommendation['priority']) => financialIntelligenceService.getPriorityColor(priority);
  const getCategoryName = (category: Recommendation['category']) => financialIntelligenceService.getCategoryName(category);

  const getPriorityIcon = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'CRITICAL':
        return '🔴';
      case 'HIGH':
        return '🟡';
      case 'MEDIUM':
        return '🟢';
      case 'LOW':
        return '⚪';
      default:
        return '⚪';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <RefreshCw className="animate-spin h-8 w-8 text-navy" />
        </div>
      </MainLayout>
    );
  }

  if (!summary) {
    return (
      <MainLayout>
        <div className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load dashboard data</AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-navy">Financials</h1>
            <p className="text-gray-600 mt-1">AI-powered insights and recommendations</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsGenerateDialogOpen(true)} className="bg-navy hover:bg-navy/90">
              <Plus className="h-4 w-4 mr-2" />
              Generate Analysis
            </Button>
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.currentPeriod.revenue)}</div>
              <div className={`flex items-center text-sm mt-2 ${summary.changes.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.changes.revenueChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {formatPercentage(summary.changes.revenueChange)} from last period
              </div>
            </CardContent>
          </Card>

          {/* Profit Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Profit className="h-4 w-4 mr-2" />
                Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.currentPeriod.profit)}</div>
              <div className={`flex items-center text-sm mt-2 ${summary.changes.profitChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.changes.profitChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {formatPercentage(summary.changes.profitChange)} from last period
              </div>
            </CardContent>
          </Card>

          {/* Profit Margin Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Percent className="h-4 w-4 mr-2" />
                Profit Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.currentPeriod.profitMargin.toFixed(1)}%</div>
              <div className="text-sm text-gray-600 mt-2">
                Previous: {summary.previousPeriod.profitMargin.toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          {/* Transactions Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.currentPeriod.transactions}</div>
              <div className={`flex items-center text-sm mt-2 ${summary.changes.transactionsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.changes.transactionsChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {formatPercentage(summary.changes.transactionsChange)} from last period
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {summary.alerts && summary.alerts.length > 0 && (
          <div className="space-y-2">
            {summary.alerts.map((alert, index) => (
              <Alert key={index} variant={alert.type === 'CRITICAL' ? 'destructive' : 'default'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* AI Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2" />
              AI Recommendations
              <Badge variant="secondary" className="ml-3">
                <Sparkles className="h-3 w-3 mr-1" />
                Powered by AI
              </Badge>
            </CardTitle>
            <CardDescription>
              Smart suggestions to improve your business performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summary.recentRecommendations && summary.recentRecommendations.length > 0 ? (
              <div className="space-y-3">
                {summary.recentRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(rec.priority)}`}
                    onClick={() => setSelectedRecommendation(rec)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getPriorityIcon(rec.priority)}</span>
                          <span className="font-semibold">{rec.priority}</span>
                          <Badge variant="outline">{getCategoryName(rec.category)}</Badge>
                        </div>
                        <h4 className="font-semibold text-lg mb-2">{rec.title}</h4>
                        <p className="text-sm">{rec.description}</p>
                        {rec.expectedImpact && (
                          <div className="mt-2 text-sm font-medium text-green-700">
                            💡 {rec.expectedImpact}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 flex-shrink-0 ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recommendations available. Generate an analysis to get AI insights.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products & Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
              <CardDescription>Best performing items this period</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.topProducts && summary.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {summary.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.units} units sold</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(product.revenue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>Most valuable customers this period</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.topCustomers && summary.topCustomers.length > 0 ? (
                <div className="space-y-3">
                  {summary.topCustomers.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.transactions} transactions</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(customer.totalSpent)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recommendation Details Dialog */}
        {selectedRecommendation && (
          <Dialog open={!!selectedRecommendation} onOpenChange={() => setSelectedRecommendation(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{getPriorityIcon(selectedRecommendation.priority)}</span>
                  {selectedRecommendation.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <div className="flex gap-2 mb-3">
                    <Badge className={getPriorityColor(selectedRecommendation.priority)}>
                      {selectedRecommendation.priority}
                    </Badge>
                    <Badge variant="outline">{getCategoryName(selectedRecommendation.category)}</Badge>
                    {selectedRecommendation.confidence && (
                      <Badge variant="secondary">Confidence: {selectedRecommendation.confidence}%</Badge>
                    )}
                  </div>
                  <p className="text-gray-700">{selectedRecommendation.description}</p>
                </div>

                {selectedRecommendation.reasoning && (
                  <div>
                    <h4 className="font-semibold mb-2">Why This Matters:</h4>
                    <p className="text-sm text-gray-600">{selectedRecommendation.reasoning}</p>
                  </div>
                )}

                {selectedRecommendation.expectedImpact && (
                  <div>
                    <h4 className="font-semibold mb-2">Expected Impact:</h4>
                    <p className="text-sm text-green-700 font-medium">{selectedRecommendation.expectedImpact}</p>
                  </div>
                )}

                {selectedRecommendation.actionItems && selectedRecommendation.actionItems.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Action Items:</h4>
                    <ul className="space-y-2">
                      {selectedRecommendation.actionItems.map((item, index) => (
                        <li key={index} className="flex items-start text-sm">
                          <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-green-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Notes (optional):</h4>
                  <Textarea
                    value={recommendationNotes}
                    onChange={(e) => setRecommendationNotes(e.target.value)}
                    placeholder="Add notes about this recommendation..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateRecommendation(selectedRecommendation.id, 'DISMISSED')}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Dismiss
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateRecommendation(selectedRecommendation.id, 'IN_PROGRESS')}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    In Progress
                  </Button>
                  <Button
                    onClick={() => handleUpdateRecommendation(selectedRecommendation.id, 'IMPLEMENTED')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Implemented
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Generate Analysis Dialog */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Generate Analysis
              </DialogTitle>
              <DialogDescription>
                Create a new AI-powered financial analysis report with insights and recommendations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="analysisType">Analysis Type</Label>
                <Select value={analysisType} onValueChange={(value: any) => setAnalysisType(value)}>
                  <SelectTrigger id="analysisType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                    <SelectItem value="CUSTOM">Custom Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="useAI" className="text-base">
                    Use AI Insights
                  </Label>
                  <p className="text-sm text-gray-500">
                    Generate AI-powered recommendations and insights
                  </p>
                </div>
                <Switch
                  id="useAI"
                  checked={useAI}
                  onCheckedChange={setUseAI}
                />
              </div>

              {useAI && (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    AI analysis may take 30-60 seconds to complete
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)} disabled={generating}>
                Cancel
              </Button>
              <Button onClick={handleGenerateAnalysis} disabled={generating} className="bg-navy hover:bg-navy/90">
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default FinancialIntelligencePage;
