
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Tag, MoreHorizontal, Trash2, Hash, ImageOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRepairTags } from '@/contexts/RepairTagsContext';

interface RepairJobCardProps {
  id: string;
  repairNumber?: string;
  customerName: string;
  itemDescription: string;
  status: 'received' | 'in-progress' | 'completed' | 'collected';
  tagId?: string | null;
  dueDate: string;
  estimatedPrice?: string;
  firstImage?: string;
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

const tagColorClasses: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 border border-blue-200',
  yellow: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  orange: 'bg-orange-100 text-orange-700 border border-orange-200',
  red: 'bg-red-100 text-red-700 border border-red-200',
  green: 'bg-green-100 text-green-700 border border-green-200',
  purple: 'bg-purple-100 text-purple-700 border border-purple-200',
  pink: 'bg-pink-100 text-pink-700 border border-pink-200',
  gray: 'bg-gray-100 text-gray-700 border border-gray-200',
  cyan: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
};

const RepairJobCard: React.FC<RepairJobCardProps> = ({
  id,
  repairNumber,
  customerName,
  itemDescription,
  status,
  tagId,
  dueDate,
  estimatedPrice,
  firstImage,
  onClick,
  onDelete
}) => {
  const { tags } = useRepairTags();
  const currentTag = tagId ? tags.find(t => t.id === tagId) : null;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(id);
  };

  const formattedDue = (() => {
    try {
      return new Date(dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dueDate;
    }
  })();

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-md overflow-hidden border-gray-100 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl"
      onClick={() => onClick(id)}
    >
      {/* Image thumbnail */}
      {firstImage ? (
        <div className="w-full h-36 overflow-hidden bg-gray-100 relative">
          <img
            src={firstImage}
            alt="Repair item"
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute bottom-2 left-2">
            <Badge className={`${statusColors[status]} rounded-full px-2 py-0.5 text-xs font-medium shadow-sm`}>
              {statusLabels[status]}
            </Badge>
          </div>
        </div>
      ) : null}

      <CardHeader className="pb-2 pt-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-md font-medium text-gray-800 truncate">{customerName}</CardTitle>
            {repairNumber && (
              <div className="flex items-center gap-1 mt-0.5">
                <Hash size={11} className="text-gray-400 flex-shrink-0" />
                <span className="text-xs font-mono text-gray-500">{repairNumber}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2">
            {!firstImage && (
              <Badge className={`${statusColors[status]} rounded-full px-3 py-1 text-xs font-medium shadow-sm flex-shrink-0`}>
                {statusLabels[status]}
              </Badge>
            )}
            {onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-gray-100 rounded-full flex-shrink-0"
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
        {currentTag && (
          <div className="flex items-center gap-1 mt-1">
            <Tag size={11} className="text-gray-400" />
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tagColorClasses[currentTag.color] || tagColorClasses.gray}`}>
              {currentTag.name}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {itemDescription}
        </p>
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1 text-gray-500">
            <Calendar size={14} />
            <span>Due: {formattedDue}</span>
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
