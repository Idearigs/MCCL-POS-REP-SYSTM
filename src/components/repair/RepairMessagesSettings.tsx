import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, RefreshCcw, Save, AlertCircle } from 'lucide-react';
import { useRepairMessages } from '@/contexts/RepairMessagesContext';
import { toast } from 'sonner';

interface RepairMessagesSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const RepairMessagesSettings: React.FC<RepairMessagesSettingsProps> = ({
  isOpen,
  onClose
}) => {
  const { templates, updateTemplate, resetTemplates } = useRepairMessages();
  const [editedTemplates, setEditedTemplates] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const handleTemplateChange = (id: string, content: string) => {
    setEditedTemplates(prev => ({ ...prev, [id]: content }));
    setHasChanges(true);
  };

  const handleSave = () => {
    Object.entries(editedTemplates).forEach(([id, content]) => {
      updateTemplate(id, content);
    });
    setEditedTemplates({});
    setHasChanges(false);
    toast.success('Message templates saved successfully');
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all templates to default? This cannot be undone.')) {
      resetTemplates();
      setEditedTemplates({});
      setHasChanges(false);
      toast.success('Templates reset to default');
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close without saving?')) {
        setEditedTemplates({});
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getTemplateContent = (id: string): string => {
    return editedTemplates[id] ?? templates.find(t => t.id === id)?.content ?? '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare size={20} className="text-navy" />
            Repair Message Templates
          </DialogTitle>
          <DialogDescription>
            Customize the SMS messages sent to customers at different stages of the repair process.
            Use {'{CUSTOMER}'} for customer name and {'{RMA}'} for repair ID.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>Available placeholders:</strong>
              <ul className="mt-1 ml-4 list-disc">
                <li><code>{'{CUSTOMER}'}</code> - Customer's name</li>
                <li><code>{'{RMA}'}</code> - Repair job ID</li>
                <li><code>{'{ITEM}'}</code> - Item description</li>
                <li><code>{'{PRICE}'}</code> - Estimated/quoted price</li>
                <li><code>{'{DATE}'}</code> - Due/completion date</li>
              </ul>
            </div>
          </div>

          <Tabs defaultValue={templates[0]?.id} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {templates.map((template) => (
                <TabsTrigger key={template.id} value={template.id}>
                  {template.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {templates.map((template) => (
              <TabsContent key={template.id} value={template.id} className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`template-${template.id}`}>Message Content</Label>
                      <Textarea
                        id={`template-${template.id}`}
                        value={getTemplateContent(template.id)}
                        onChange={(e) => handleTemplateChange(template.id, e.target.value)}
                        rows={6}
                        className="font-mono text-sm"
                        placeholder="Enter your message template here..."
                      />
                      <p className="text-xs text-gray-500">
                        Character count: {getTemplateContent(template.id).length}
                        {getTemplateContent(template.id).length > 160 &&
                          <span className="text-amber-600"> (Multiple SMS messages will be sent)</span>
                        }
                      </p>
                    </div>

                    {template.status && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Triggered when:</strong> Repair status changes to{' '}
                          <span className="font-semibold text-navy">
                            {template.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </p>
                      </div>
                    )}

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-700 mb-2">Preview:</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {getTemplateContent(template.id)
                          .replace(/{CUSTOMER}/g, 'John Smith')
                          .replace(/{RMA}/g, 'REP-001')
                          .replace(/{ITEM}/g, 'Gold Ring')
                          .replace(/{PRICE}/g, '£50.00')
                          .replace(/{DATE}/g, new Date().toLocaleDateString('en-GB'))
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="mr-auto"
          >
            <RefreshCcw size={16} className="mr-2" />
            Reset to Default
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="bg-navy hover:bg-navy-dark text-white"
          >
            <Save size={16} className="mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RepairMessagesSettings;
