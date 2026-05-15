import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useRepairTags } from '@/contexts/RepairTagsContext';
import RepairTagBadge from './RepairTagBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

const RepairTagsSettings: React.FC = () => {
  const { tags, addTag, updateTag, deleteTag } = useRepairTags();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<any>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('blue');
  const [tagDescription, setTagDescription] = useState('');

  const colorOptions = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-600' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-400' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
    { value: 'red', label: 'Red', class: 'bg-red-600' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-600' },
    { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
  ];

  const handleAddTag = () => {
    if (!tagName.trim()) {
      toast.error('Please enter a tag name');
      return;
    }

    addTag({
      name: tagName,
      color: tagColor,
      description: tagDescription,
    });

    toast.success('Tag added successfully');
    setTagName('');
    setTagColor('blue');
    setTagDescription('');
    setIsAddDialogOpen(false);
  };

  const handleEditTag = () => {
    if (!editingTag || !tagName.trim()) {
      toast.error('Please enter a tag name');
      return;
    }

    updateTag(editingTag.id, {
      name: tagName,
      color: tagColor,
      description: tagDescription,
    });

    toast.success('Tag updated successfully');
    setEditingTag(null);
    setTagName('');
    setTagColor('blue');
    setTagDescription('');
    setIsEditDialogOpen(false);
  };

  const handleDeleteTag = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the tag "${name}"?`)) {
      deleteTag(id);
      toast.success('Tag deleted successfully');
    }
  };



  const openEditDialog = (tag: any) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setTagDescription(tag.description || '');
    setIsEditDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Repair Tags Management</CardTitle>
            <CardDescription>
              Manage custom tags for categorizing repair jobs
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tag
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {tags.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tags found. Click "Add Tag" to create one.
            </div>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <RepairTagBadge tagName={tag.name} tagColor={tag.color} />
                  {tag.description && (
                    <span className="text-sm text-gray-600">{tag.description}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(tag)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTag(tag.id, tag.name)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Add Tag Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Tag</DialogTitle>
            <DialogDescription>
              Create a new tag for categorizing repair jobs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="tag-name">Tag Name</Label>
              <Input
                id="tag-name"
                placeholder="Enter tag name"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tag-color">Color</Label>
              <Select value={tagColor} onValueChange={setTagColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${color.class}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tag-description">Description (Optional)</Label>
              <Input
                id="tag-description"
                placeholder="Enter description"
                value={tagDescription}
                onChange={(e) => setTagDescription(e.target.value)}
              />
            </div>
            <div className="mt-4">
              <Label>Preview:</Label>
              <div className="mt-2">
                <RepairTagBadge tagName={tagName || 'Tag Name'} tagColor={tagColor} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTag}>Add Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Update the tag details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-tag-name">Tag Name</Label>
              <Input
                id="edit-tag-name"
                placeholder="Enter tag name"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-tag-color">Color</Label>
              <Select value={tagColor} onValueChange={setTagColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${color.class}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-tag-description">Description (Optional)</Label>
              <Input
                id="edit-tag-description"
                placeholder="Enter description"
                value={tagDescription}
                onChange={(e) => setTagDescription(e.target.value)}
              />
            </div>
            <div className="mt-4">
              <Label>Preview:</Label>
              <div className="mt-2">
                <RepairTagBadge tagName={tagName || 'Tag Name'} tagColor={tagColor} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTag}>Update Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RepairTagsSettings;
