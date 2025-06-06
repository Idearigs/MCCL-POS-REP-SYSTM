import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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

// Define mock events
interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'repair' | 'delivery' | 'appointment' | 'other';
  description?: string;
}

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
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: 'Gold Ring Repair',
      date: new Date(2025, 4, 25), // May 25, 2025
      type: 'repair',
      description: 'Ring resizing for customer John Smith'
    },
    {
      id: '2',
      title: 'Diamond Delivery',
      date: new Date(2025, 4, 26), // May 26, 2025
      type: 'delivery'
    },
    {
      id: '3',
      title: 'Customer Meeting',
      date: new Date(2025, 4, 27), // May 27, 2025
      type: 'appointment',
      description: 'Custom wedding ring consultation'
    }
  ]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

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

  const onSubmit = (values: z.infer<typeof eventSchema>) => {
    // Create a new event with required fields
    const newEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      title: values.title,
      date: values.date,
      type: values.type,
      description: values.description
    };

    setEvents([...events, newEvent]);
    setIsAddEventOpen(false);
    form.reset();
    toast.success("Event added successfully");
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

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(
      (event) => 
        event.date.getFullYear() === date.getFullYear() &&
        event.date.getMonth() === date.getMonth() &&
        event.date.getDate() === date.getDate()
    );
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
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
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
                      <Button type="submit">Add Event</Button>
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
                        "text-xs p-1 rounded text-white truncate",
                        typeColors[event.type]
                      )}
                      title={event.description || event.title}
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
      </div>
    </MainLayout>
  );
};

export default CalendarPage;
