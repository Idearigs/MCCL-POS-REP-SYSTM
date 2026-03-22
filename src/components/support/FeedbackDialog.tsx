import React, { useState } from 'react';
import { Bug, Lightbulb, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { feedbackService } from '@/services/feedbackService';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'bug' | 'feature';
}

const emptyBug = {
  title: '',
  description: '',
  priority: 'MEDIUM' as const,
  stepsToReproduce: '',
  expectedBehavior: '',
  actualBehavior: '',
};

const emptyFeature = { title: '', description: '' };

const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  open,
  onOpenChange,
  defaultTab = 'bug',
}) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<'bug' | 'feature'>(defaultTab);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [bug, setBug] = useState(emptyBug);
  const [feature, setFeature] = useState(emptyFeature);

  const resetAndClose = () => {
    setBug(emptyBug);
    setFeature(emptyFeature);
    setSubmitted(false);
    onOpenChange(false);
  };

  const submitBug = async () => {
    if (!bug.title.trim() || !bug.description.trim()) {
      toast({ title: 'Required fields missing', description: 'Please fill in the title and description.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await feedbackService.submitBugReport(bug);
      setSubmitted(true);
    } catch {
      toast({ title: 'Submission failed', description: 'Could not send bug report. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const submitFeature = async () => {
    if (!feature.title.trim() || !feature.description.trim()) {
      toast({ title: 'Required fields missing', description: 'Please fill in the title and description.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await feedbackService.submitFeatureRequest(feature);
      setSubmitted(true);
    } catch {
      toast({ title: 'Submission failed', description: 'Could not send feature request. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Help &amp; Feedback
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                {tab === 'bug' ? 'Bug report submitted!' : 'Feature request submitted!'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Our team will review it shortly. Thank you for your feedback.
              </p>
            </div>
            <Button variant="outline" onClick={resetAndClose}>Close</Button>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'bug' | 'feature')}>
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="bug" className="flex items-center gap-2">
                <Bug className="w-4 h-4" /> Report a Bug
              </TabsTrigger>
              <TabsTrigger value="feature" className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4" /> Feature Request
              </TabsTrigger>
            </TabsList>

            {/* ── Bug Report Tab ── */}
            <TabsContent value="bug" className="space-y-4 mt-0">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Describe what went wrong and we'll investigate. For urgent issues please contact support directly.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bug-title">Title <span className="text-red-500">*</span></Label>
                <Input
                  id="bug-title"
                  placeholder="Brief summary of the issue"
                  value={bug.title}
                  onChange={e => setBug(p => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bug-desc">Description <span className="text-red-500">*</span></Label>
                <Textarea
                  id="bug-desc"
                  placeholder="What happened? What were you doing when this occurred?"
                  rows={3}
                  value={bug.description}
                  onChange={e => setBug(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={bug.priority}
                  onValueChange={v => setBug(p => ({ ...p, priority: v as typeof bug.priority }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low — minor inconvenience</SelectItem>
                    <SelectItem value="MEDIUM">Medium — affects workflow</SelectItem>
                    <SelectItem value="HIGH">High — blocks work</SelectItem>
                    <SelectItem value="CRITICAL">Critical — system unusable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bug-steps">Steps to reproduce <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Textarea
                  id="bug-steps"
                  placeholder="1. Go to..&#10;2. Click on...&#10;3. See error..."
                  rows={2}
                  value={bug.stepsToReproduce}
                  onChange={e => setBug(p => ({ ...p, stepsToReproduce: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bug-expected">Expected</Label>
                  <Input
                    id="bug-expected"
                    placeholder="What should happen"
                    value={bug.expectedBehavior}
                    onChange={e => setBug(p => ({ ...p, expectedBehavior: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bug-actual">Actual</Label>
                  <Input
                    id="bug-actual"
                    placeholder="What actually happens"
                    value={bug.actualBehavior}
                    onChange={e => setBug(p => ({ ...p, actualBehavior: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
                <Button onClick={submitBug} disabled={loading}>
                  {loading ? 'Submitting…' : <>Submit Report <ChevronRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </div>
            </TabsContent>

            {/* ── Feature Request Tab ── */}
            <TabsContent value="feature" className="space-y-4 mt-0">
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Have an idea that would improve your workflow? Tell us about it — popular requests get prioritised.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="feat-title">Title <span className="text-red-500">*</span></Label>
                <Input
                  id="feat-title"
                  placeholder="Short title for your idea"
                  value={feature.title}
                  onChange={e => setFeature(p => ({ ...p, title: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="feat-desc">Description <span className="text-red-500">*</span></Label>
                <Textarea
                  id="feat-desc"
                  placeholder="What problem does this solve? How would it work? Who would benefit?"
                  rows={5}
                  value={feature.description}
                  onChange={e => setFeature(p => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
                <Button onClick={submitFeature} disabled={loading}>
                  {loading ? 'Submitting…' : <>Submit Request <ChevronRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
