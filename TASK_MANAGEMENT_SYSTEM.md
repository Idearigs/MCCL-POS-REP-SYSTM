# Task Management System - Implementation Guide

## Overview
Complete task management system with role-based access control, allowing admins to create, assign, and track tasks with notifications.

## Backend Implementation ✅ COMPLETE

### Database Schema ✅
- `tasks` - Main task table with title, description, priority, status, assignments
- `task_comments` - Comments on tasks
- `task_activities` - Activity log for task changes
- Enums: TaskPriority (LOW, MEDIUM, HIGH, URGENT), TaskStatus (TODO, IN_PROGRESS, IN_REVIEW, COMPLETED, CANCELLED)

### API Endpoints ✅
- `POST /api/v1/tasks` - Create task (Admin/Manager only)
- `GET /api/v1/tasks` - Get all tasks with filters
- `GET /api/v1/tasks/my-tasks` - Get tasks assigned to current user
- `GET /api/v1/tasks/stats` - Get task statistics
- `GET /api/v1/tasks/:id` - Get single task with comments and activities
- `PUT /api/v1/tasks/:id` - Update task (Admin/Manager only)
- `DELETE /api/v1/tasks/:id` - Delete task (Admin/Manager only)
- `POST /api/v1/tasks/:id/comments` - Add comment to task

### Role-Based Access ✅
- **Admin/Manager**: Can create, edit, delete, and assign tasks
- **All Users**: Can view tasks assigned to them, add comments, view task details

## Frontend Implementation (TODO)

### Required Pages:

#### 1. Tasks Dashboard (`src/pages/TasksPage.tsx`)
```typescript
// Modern Kanban board with drag-and-drop
// Columns: TODO, IN PROGRESS, IN REVIEW, COMPLETED
// Features:
// - Filter by priority, assigned user, tags
// - Search tasks
// - Stats cards (Total, In Progress, Completed, Overdue)
// - Create Task button (Admin only)
```

#### 2. Task Detail Modal (`src/components/tasks/TaskDetailModal.tsx`)
```typescript
// Sidebar overlay showing:
// - Task title, description, priority badge
// - Assigned users with avatars
// - Due date with overdue warning
// - Status change dropdown
// - Comments section with real-time updates
// - Activity timeline
// - Attachments section
```

#### 3. Create/Edit Task Modal (`src/components/tasks/CreateTaskDialog.tsx`)
```typescript
// Form fields:
// - Title (required)
// - Description (rich text editor)
// - Priority selector with color coding
// - Assign to users (multi-select dropdown)
// - Due date picker
// - Start date picker
// - Tags input
```

### Required Services:

#### `src/services/taskService.ts`
```typescript
import { apiClient } from './apiClient';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  assignedTo: string[];
  createdBy: string;
  dueDate?: string;
  startDate?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  comments?: TaskComment[];
  activities?: TaskActivity[];
}

export interface TaskComment {
  id: string;
  comment: string;
  userId: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export interface TaskActivity {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

export const taskService = {
  // Get all tasks
  getAll: (filters?: {
    status?: string;
    priority?: string;
    assignedToMe?: boolean;
    createdByMe?: boolean;
  }) => apiClient.get('/tasks', { params: filters }),

  // Get my tasks
  getMyTasks: () => apiClient.get('/tasks/my-tasks'),

  // Get task stats
  getStats: () => apiClient.get('/tasks/stats'),

  // Get single task
  getById: (id: string) => apiClient.get(`/tasks/${id}`),

  // Create task
  create: (data: {
    title: string;
    description?: string;
    priority?: string;
    assignedTo: string[];
    dueDate?: string;
    startDate?: string;
    tags?: string[];
  }) => apiClient.post('/tasks', data),

  // Update task
  update: (id: string, data: Partial<Task>) => apiClient.put(`/tasks/${id}`, data),

  // Delete task
  delete: (id: string) => apiClient.delete(`/tasks/${id}`),

  // Add comment
  addComment: (id: string, comment: string) =>
    apiClient.post(`/tasks/${id}/comments`, { comment }),
};
```

### UI Components Needed:

1. **TaskCard** - Card component for Kanban board
2. **TaskBoard** - Kanban board with drag-and-drop (use @dnd-kit/core)
3. **PriorityBadge** - Color-coded priority indicator
4. **StatusBadge** - Status indicator with colors
5. **UserAvatar** - User avatar with initials
6. **CommentsList** - Comments section with add comment form
7. **ActivityTimeline** - Timeline of task activities

### Recommended Libraries:
- `@dnd-kit/core` - Drag and drop for Kanban board
- `react-quill` - Rich text editor for descriptions
- `date-fns` - Date formatting
- `react-select` - Multi-select for user assignment
- `framer-motion` - Animations

### Color Coding:
**Priority:**
- LOW: Blue (#3B82F6)
- MEDIUM: Yellow (#F59E0B)
- HIGH: Orange (#F97316)
- URGENT: Red (#EF4444)

**Status:**
- TODO: Gray (#6B7280)
- IN_PROGRESS: Blue (#3B82F6)
- IN_REVIEW: Purple (#8B5CF6)
- COMPLETED: Green (#10B981)
- CANCELLED: Red (#EF4444)

### Notifications:
When a user is assigned to a task, they should receive a notification with:
- Task title
- Due date
- Assigned by (admin name)
- Priority level

## Testing Checklist:
- [ ] Admin can create tasks
- [ ] Admin can assign tasks to multiple users
- [ ] Assigned users can see tasks in their "My Tasks" view
- [ ] Users can add comments to tasks
- [ ] Users can update task status (if assigned)
- [ ] Activity log tracks all changes
- [ ] Overdue tasks are highlighted
- [ ] Drag-and-drop updates task status
- [ ] Task deletion requires confirmation
- [ ] Real-time updates when task is modified

## Next Steps:
1. Create TasksPage.tsx with Kanban board
2. Add Tasks link to sidebar navigation
3. Create task service file
4. Build task components
5. Add permission checks in UI
6. Implement notifications
