
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RepairJobCardProps {
  id: string;
  customerName: string;
  itemDescription: string;
  status: 'received' | 'in-progress' | 'completed' | 'collected';
  dueDate: string;
  estimatedPrice?: string;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
}

const statusColors = {
  'received': 'bg-blue-50 text-blue-500 border border-blue-200',
  'in-progress': 'bg-orange-50 text-orange-500 border border-orange-200',
  'completed': 'bg-green-50 text-green-500 border border-green-200',
  'collected': 'bg-gray-50 text-gray-500 border border-gray-200',
};

const statusLabels = {
  'received': 'Received',
  'in-progress': 'In Progress',
  'completed': 'Completed',
  'collected': 'Collected',
};

const RepairJobCard: React.FC<RepairJobCardProps> = ({ 
  id, 
  customerName, 
  itemDescription, 
  status, 
  dueDate,
  estimatedPrice,
  onClick,
  onDelete 
}) => {
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  };
  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-md overflow-hidden border-gray-100 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl" 
      onClick={() => onClick(id)}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-md font-medium text-gray-800">{customerName}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={`${statusColors[status]} rounded-full px-3 py-1 text-xs font-medium shadow-sm`}>
              {statusLabels[status]}
            </Badge>
            {onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete Repair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {itemDescription}
        </p>
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1 text-gray-500">
            <Calendar size={14} />
            <span>Due: {dueDate}</span>
          </div>
          {estimatedPrice && (
            <span className="font-medium text-gray-800 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">Est. £{estimatedPrice}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RepairJobCard;
