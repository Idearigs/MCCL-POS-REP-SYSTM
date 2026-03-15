import React, { useState, useEffect } from 'react';
import { Plus, Filter, Search, BarChart3, CheckCircle, Clock, PlayCircle, Circle, LayoutGrid, List } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { taskService, Task, TaskStatus, TaskStats } from '../services/taskService';
import TaskCard from '../components/tasks/TaskCard';
import CreateTaskDialog from '../components/tasks/CreateTaskDialog';
import MainLayout from '../components/layout/MainLayout';
import { toast } from 'sonner';

// Updated: 2025-01-26 - Fixed undefined tasks error
const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    todo: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);

  useEffect(() => {
    loadData();

    // Real-time polling - refresh every 10 seconds without showing loader
    const intervalId = setInterval(() => {
      loadData(false);
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const loadData = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      const [tasksData, statsData] = await Promise.all([
        taskService.getAll(),
        taskService.getStats(),
      ]);
      console.log('📋 Tasks loaded:', tasksData);
      console.log('📊 Stats loaded:', statsData);
      setTasks(tasksData || []);
      setStats(statsData || {
        total: 0,
        todo: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
      });
    } catch (error) {
      console.error('Error loading tasks:', error);
      if (showLoader) {
        toast.error('Failed to load tasks. Please make sure the backend is running.');
      }
      setTasks([]);
      setStats({
        total: 0,
        todo: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0,
      });
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    // TODO: Open task detail modal
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await taskService.update(taskId, { status: newStatus });
      await loadData();
      toast.success('Task status updated');
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    // Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const newStatus = destination.droppableId as TaskStatus;

    // Optimistic update - update UI immediately
    const updatedTasks = tasks.map(task =>
      task.id === draggableId
        ? { ...task, status: newStatus }
        : task
    );
    setTasks(updatedTasks);

    // Update stats immediately
    const oldTask = tasks.find(t => t.id === draggableId);
    if (oldTask) {
      const newStats = { ...stats };

      // Decrement old status count
      if (oldTask.status === 'TODO') newStats.todo--;
      else if (oldTask.status === 'IN_PROGRESS') newStats.inProgress--;
      else if (oldTask.status === 'COMPLETED') newStats.completed--;

      // Increment new status count
      if (newStatus === 'TODO') newStats.todo++;
      else if (newStatus === 'IN_PROGRESS') newStats.inProgress++;
      else if (newStatus === 'COMPLETED') newStats.completed++;

      setStats(newStats);
    }

    // Show immediate feedback
    toast.success(`Task moved to ${columns.find(c => c.status === newStatus)?.title}`);

    // Save to server in background
    try {
      await taskService.update(draggableId, { status: newStatus });
    } catch (error) {
      // Revert on error
      setTasks(tasks);
      loadData(false);
      toast.error('Failed to update task status');
    }
  };

  const handleQuickUpdate = async (taskId: string, field: string, value: any) => {
    try {
      await taskService.update(taskId, { [field]: value });
      await loadData(false);
      toast.success('Task updated');
      setEditingCell(null);
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const filteredTasks = (tasks || []).filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTasksByStatus = (status: TaskStatus) => {
    return filteredTasks.filter((task) => task.status === status);
  };

  const columns: { status: TaskStatus; title: string; icon: React.FC<any>; color: string }[] = [
    { status: 'TODO', title: 'To Do', icon: Circle, color: 'text-gray-600' },
    { status: 'IN_PROGRESS', title: 'In Progress', icon: PlayCircle, color: 'text-blue-600' },
    { status: 'IN_REVIEW', title: 'In Review', icon: Clock, color: 'text-purple-600' },
    { status: 'COMPLETED', title: 'Completed', icon: CheckCircle, color: 'text-green-600' },
  ];

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600 mt-1">Manage and track your team's tasks</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              New Task
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">To Do</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todo}</p>
              </div>
              <Circle className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <PlayCircle className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-red-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <Clock className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {columns.map((column) => {
              const Icon = column.icon;
              const columnTasks = getTasksByStatus(column.status);

              return (
                <div key={column.status} className="flex flex-col">
                  {/* Column Header */}
                  <div className="bg-white rounded-t-lg border-x border-t border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${column.color}`} />
                        <h3 className="font-semibold text-gray-900">{column.title}</h3>
                      </div>
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-semibold">
                        {columnTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Column Content - Droppable */}
                  <Droppable droppableId={column.status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 bg-gray-50 rounded-b-lg border-x border-b border-gray-200 p-4 space-y-3 min-h-[400px] transition-colors ${
                          snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : ''
                        }`}
                      >
                        {columnTasks.length === 0 ? (
                          <div className="text-center text-gray-400 py-8">
                            <p className="text-sm">No tasks</p>
                          </div>
                        ) : (
                          columnTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={snapshot.isDragging ? 'opacity-50' : ''}
                                >
                                  <TaskCard task={task} onClick={() => handleTaskClick(task)} />
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No tasks found
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td
                      className="px-6 py-4 cursor-pointer"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-gray-500 truncate max-w-md">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        value={task.status}
                        onChange={(e) => handleQuickUpdate(task.id, 'status', e.target.value)}
                        className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${
                          task.status === 'TODO'
                            ? 'bg-gray-100 text-gray-800'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : task.status === 'IN_REVIEW'
                            ? 'bg-purple-100 text-purple-800'
                            : task.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        <option value="TODO">TO DO</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="IN_REVIEW">IN REVIEW</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        value={task.priority}
                        onChange={(e) => handleQuickUpdate(task.id, 'priority', e.target.value)}
                        className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${
                          task.priority === 'LOW'
                            ? 'bg-blue-100 text-blue-800'
                            : task.priority === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800'
                            : task.priority === 'HIGH'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-sm text-gray-900">{task.assignedTo.length} user(s)</div>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="date"
                        value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleQuickUpdate(task.id, 'dueDate', e.target.value)}
                        className="text-sm text-gray-900 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                      />
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-sm text-gray-900">
                        {task.creator.firstName} {task.creator.lastName}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={loadData}
      />
      </div>
    </MainLayout>
  );
};

export default TasksPage;
