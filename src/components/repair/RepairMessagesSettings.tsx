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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Edit, Trash2, Plus, Save, X, AlertCircle } from 'lucide-react';
import { useRepairMessages, MessageTemplate } from '@/contexts/RepairMessagesContext';
import { toast } from 'sonner';

interface RepairMessagesSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const RepairMessagesSettings: React.FC<RepairMessagesSettingsProps> = ({
  isOpen,
  onClose
}) => {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useRepairMessages();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editForm, setEditForm] = useState<MessageTemplate>({
    id: '',
    name: '',
    content: '',
    description: '',
    status: ''
  });

  const repairStatuses = [
    { value: '', label: 'None (Manual Send Only)' },
    { value: 'RECEIVED', label: 'Received' },
    { value: 'QUOTED', label: 'Quoted' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'READY_FOR_COLLECTION', label: 'Ready for Collection' },
    { value: 'COLLECTED', label: 'Collected' }
  ];

  const handleEdit = (template: MessageTemplate) => {
    setEditingId(template.id);
    setEditForm({ ...template });
    setIsAddingNew(false);
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setEditForm({
      id: '',
      name: '',
      content: '',
      description: '',
      status: ''
    });
  };

  const handleSave = () => {
    if (!editForm.name.trim() || !editForm.content.trim()) {
      toast.error('Please fill in name and message content');
      return;
    }

    if (isAddingNew) {
      addTemplate({
        name: editForm.name,
        content: editForm.content,
        description: editForm.description,
        status: editForm.status || undefined
      });
      toast.success('New message template added');
    } else if (editingId) {
      updateTemplate(editingId, {
        name: editForm.name,
        content: editForm.content,
        description: editForm.description,
        status: editForm.status || undefined
      });
      toast.success('Message template updated');
    }

    setEditingId(null);
    setIsAddingNew(false);
    setEditForm({
      id: '',
      name: '',
      content: '',
      description: '',
      status: ''
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setEditForm({
      id: '',
      name: '',
      content: '',
      description: '',
      status: ''
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteTemplate(id);
      toast.success('Message template deleted');
    }
  };

  const getPreviewText = (content: string): string => {
    return content
      .replace(/{CUSTOMER}/g, 'John Smith')
      .replace(/{RMA}/g, 'REP-001')
      .replace(/{ITEM}/g, 'Gold Ring')
      .replace(/{PRICE}/g, '£50.00')
      .replace(/{DATE}/g, new Date().toLocaleDateString('en-GB'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare size={20} className="text-navy" />
            Repair Message Templates
          </DialogTitle>
          <DialogDescription>
            Manage SMS message templates sent to customers at different repair stages.
            Use placeholders: {'{CUSTOMER}'}, {'{RMA}'}, {'{ITEM}'}, {'{PRICE}'}, {'{DATE}'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <strong>Available placeholders:</strong> {'{CUSTOMER}'} (name), {'{RMA}'} (repair ID), {'{ITEM}'} (description), {'{PRICE}'} (cost), {'{DATE}'} (due date)
            </div>
          </div>

          {/* Template List */}
          <div className="space-y-3">
            {templates.map((template) => (
              <Card key={template.id} className="border-2 hover:border-navy/20 transition-colors">
                {editingId === template.id ? (
                  // Edit Mode
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-name">Template Name</Label>
                        <Input
                          id="edit-name"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="e.g., Item Ready for Collection"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-status">Trigger Status (Optional)</Label>
                        <Select
                          value={editForm.status || ''}
                          onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                        >
                          <SelectTrigger id="edit-status">
                            <SelectValue placeholder="Select status trigger..." />
                          </SelectTrigger>
                          <SelectContent>
                            {repairStatuses.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="edit-description">Description</Label>
                      <Input
                        id="edit-description"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Brief description of when this message is used"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit-content">Message Content</Label>
                      <Textarea
                        id="edit-content"
                        value={editForm.content}
                        onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                        rows={4}
                        className="font-mono text-sm"
                        placeholder="Enter your message here..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Characters: {editForm.content.length}
                        {editForm.content.length > 160 && (
                          <span className="text-amber-600"> (Multiple SMS)</span>
                        )}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Preview:</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {getPreviewText(editForm.content)}
                      </p>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={handleCancel}>
                        <X size={16} className="mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} className="bg-navy hover:bg-navy-dark">
                        <Save size={16} className="mr-1" />
                        Save
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  // View Mode
                  <>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.description && (
                            <CardDescription className="mt-1">{template.description}</CardDescription>
                          )}
                          {template.status && (
                            <div className="mt-2">
                              <span className="text-xs font-medium px-2 py-1 bg-navy/10 text-navy rounded-full">
                                Triggers on: {template.status.replace(/_/g, ' ')}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                            className="text-navy hover:bg-navy/10"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id, template.name)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                            {template.content}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {template.content.length} characters
                          </p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Preview:</p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">
                            {getPreviewText(template.content)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            ))}

            {/* Add New Template Form */}
            {isAddingNew && (
              <Card className="border-2 border-navy/30">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">New Message Template</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="new-name">Template Name *</Label>
                      <Input
                        id="new-name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="e.g., Delivery Notification"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-status">Trigger Status (Optional)</Label>
                      <Select
                        value={editForm.status || ''}
                        onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                      >
                        <SelectTrigger id="new-status">
                          <SelectValue placeholder="Select status trigger..." />
                        </SelectTrigger>
                        <SelectContent>
                          {repairStatuses.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="new-description">Description</Label>
                    <Input
                      id="new-description"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Brief description of when this message is used"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new-content">Message Content *</Label>
                    <Textarea
                      id="new-content"
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      rows={4}
                      className="font-mono text-sm"
                      placeholder="Enter your message here using {CUSTOMER}, {RMA}, etc."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Characters: {editForm.content.length}
                      {editForm.content.length > 160 && (
                        <span className="text-amber-600"> (Multiple SMS)</span>
                      )}
                    </p>
                  </div>

                  {editForm.content && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Preview:</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {getPreviewText(editForm.content)}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      <X size={16} className="mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} className="bg-navy hover:bg-navy-dark">
                      <Save size={16} className="mr-1" />
                      Add Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Add New Button */}
          {!isAddingNew && !editingId && (
            <Button
              variant="outline"
              className="w-full border-2 border-dashed border-gray-300 hover:border-navy hover:bg-navy/5"
              onClick={handleAddNew}
            >
              <Plus size={16} className="mr-2" />
              Add New Message Template
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RepairMessagesSettings;
