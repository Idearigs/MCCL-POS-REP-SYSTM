import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Edit, Trash2, X } from 'lucide-react';
import MainLayout from '../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { calendarService, CalendarEvent as APICalendarEvent, EventType } from '@/services/calendarService';

// UI Calendar Event interface
interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'repair' | 'delivery' | 'appointment' | 'other';
  description?: string;
}

// Type mapping between UI and backend
const typeMapping: Record<string, EventType> = {
  'repair': 'REPAIR',
  'delivery': 'DELIVERY',
  'appointment': 'APPOINTMENT',
  'other': 'OTHER'
};

const reverseTypeMapping: Record<EventType, 'repair' | 'delivery' | 'appointment' | 'other'> = {
  'REPAIR': 'repair',
  'DELIVERY': 'delivery',
  'APPOINTMENT': 'appointment',
  'OTHER': 'other'
};

const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.date({
    required_error: "Please select a date",
  }),
  type: z.enum(['repair', 'delivery', 'appointment', 'other']),
  description: z.string().optional(),
});

const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Get days for the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Form handling for new events
  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      date: new Date(),
      type: "appointment",
      description: "",
    },
  });

  // Load events from database for current month
  const loadEvents = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const apiEvents = await calendarService.getEventsByMonth(year, month);

      // Convert API events to UI format
      const uiEvents: CalendarEvent[] = apiEvents.map((apiEvent: APICalendarEvent) => ({
        id: apiEvent.id,
        title: apiEvent.title,
        date: new Date(apiEvent.eventDate),
        type: reverseTypeMapping[apiEvent.eventType],
        description: apiEvent.description
      }));

      setEvents(uiEvents);
    } catch (error: any) {
      console.error('Failed to load events:', error);
      toast.error('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  // Load events when component mounts or month changes
  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const onSubmit = async (values: z.infer<typeof eventSchema>) => {
    try {
      setLoading(true);

      // Create event via API
      const createData = {
        title: values.title,
        description: values.description || undefined,
        eventDate: values.date.toISOString(),
        eventType: typeMapping[values.type],
        isAllDay: true,
      };

      await calendarService.createEvent(createData);

      // Reload events
      await loadEvents();

      setIsAddEventOpen(false);
      form.reset();
      toast.success("Event added successfully");
    } catch (error: any) {
      console.error('Failed to create event:', error);
      toast.error('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle month navigation
  const previousMonth = () => {
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentDate(prevMonth);
  };

  const nextMonth = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentDate(nextMonth);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(
      (event) =>
        event.date.getFullYear() === date.getFullYear() &&
        event.date.getMonth() === date.getMonth() &&
        event.date.getDate() === date.getDate()
    );
  };

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
    setIsEditing(false);
  };

  // Handle event update
  const handleEventUpdate = async () => {
    if (!selectedEvent) return;

    try {
      setLoading(true);

      const updateData = {
        title: selectedEvent.title,
        description: selectedEvent.description || undefined,
        eventDate: selectedEvent.date.toISOString(),
        eventType: typeMapping[selectedEvent.type],
        isAllDay: true,
      };

      await calendarService.updateEvent(selectedEvent.id, updateData);
      await loadEvents();

      setIsDetailOpen(false);
      setSelectedEvent(null);
      setIsEditing(false);
      toast.success("Event updated successfully");
    } catch (error: any) {
      console.error('Failed to update event:', error);
      toast.error('Failed to update event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle event delete - open confirmation dialog
  const handleEventDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  // Confirm and execute delete
  const confirmDelete = async () => {
    if (!selectedEvent) return;

    try {
      setLoading(true);

      await calendarService.deleteEvent(selectedEvent.id);
      await loadEvents();

      setIsDeleteDialogOpen(false);
      setIsDetailOpen(false);
      setSelectedEvent(null);
      toast.success("Event deleted successfully");
    } catch (error: any) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const typeColors = {
    repair: "bg-blue-500",
    delivery: "bg-green-500",
    appointment: "bg-purple-500",
    other: "bg-gray-500"
  };

  return (
    <MainLayout pageTitle="Calendar">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{format(currentDate, 'MMMM yyyy')}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={previousMonth} disabled={loading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday} disabled={loading}>Today</Button>
            <Button variant="outline" size="icon" onClick={nextMonth} disabled={loading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add Event</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Event</DialogTitle>
                  <DialogDescription>
                    Create a new event for your calendar.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter event title" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Event Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Type</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                            >
                              <option value="repair">Repair</option>
                              <option value="delivery">Delivery</option>
                              <option value="appointment">Appointment</option>
                              <option value="other">Other</option>
                            </select>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter description" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Adding...' : 'Add Event'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-medium p-2">
              {day}
            </div>
          ))}
          
          {Array.from({ length: monthStart.getDay() }).map((_, index) => (
            <div key={`empty-start-${index}`} className="p-2 border rounded-md bg-gray-50"></div>
          ))}
          
          {days.map((day) => {
            const dayEvents = getEventsForDate(day);
            return (
              <Card 
                key={day.toISOString()} 
                className={cn(
                  "p-2 min-h-28 flex flex-col",
                  isToday(day) ? "border-primary" : "",
                  !isSameMonth(day, currentDate) ? "opacity-50" : ""
                )}
              >
                <div className={cn(
                  "text-right font-semibold text-sm mb-1", 
                  isToday(day) ? "text-primary" : ""
                )}>
                  {format(day, 'd')}
                </div>
                <div className="flex-grow space-y-1 overflow-y-auto">
                  {dayEvents.map(event => (
                    <div
                      key={event.id}
                      className={cn(
                        "text-xs p-1 rounded text-white truncate cursor-pointer hover:opacity-80 transition-opacity",
                        typeColors[event.type]
                      )}
                      title={event.description || event.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
          
          {Array.from({ length: (6 * 7) - monthStart.getDay() - days.length }).map((_, index) => (
            <div key={`empty-end-${index}`} className="p-2 border rounded-md bg-gray-50"></div>
          ))}
        </div>

        {/* Event Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Event Details</span>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        disabled={loading}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEventDelete}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>

            {selectedEvent && (
              <div className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        value={selectedEvent.title}
                        onChange={(e) =>
                          setSelectedEvent({ ...selectedEvent, title: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <select
                        value={selectedEvent.type}
                        onChange={(e) =>
                          setSelectedEvent({
                            ...selectedEvent,
                            type: e.target.value as 'repair' | 'delivery' | 'appointment' | 'other',
                          })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                      >
                        <option value="repair">Repair</option>
                        <option value="delivery">Delivery</option>
                        <option value="appointment">Appointment</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        value={selectedEvent.description || ''}
                        onChange={(e) =>
                          setSelectedEvent({ ...selectedEvent, description: e.target.value })
                        }
                        className="mt-1"
                        placeholder="Enter description"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Title</label>
                      <p className="text-lg font-semibold">{selectedEvent.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date</label>
                      <p className="text-base">{format(selectedEvent.date, 'PPP')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Type</label>
                      <div className="mt-1">
                        <span
                          className={cn(
                            'inline-block px-3 py-1 rounded-full text-white text-sm',
                            typeColors[selectedEvent.type]
                          )}
                        >
                          {selectedEvent.type.charAt(0).toUpperCase() + selectedEvent.type.slice(1)}
                        </span>
                      </div>
                    </div>
                    {selectedEvent.description && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Description</label>
                        <p className="text-base">{selectedEvent.description}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <DialogFooter>
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleEventUpdate} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Delete Event</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this event? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="py-4">
                <p className="text-sm text-gray-600">
                  You are about to delete: <span className="font-semibold">{selectedEvent.title}</span>
                </p>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Event'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default CalendarPage;
