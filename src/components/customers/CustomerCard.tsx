
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, Mail, Calendar, DollarSign, Award, Star, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CustomerCardProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  since: string;
  totalSpent?: number;
  loyaltyPoints?: number;
  customerGroup?: string;
  marketingConsent: {
    email: boolean;
    sms: boolean;
    phone: boolean;
  };
  onClick: (id: string) => void;
}

const CustomerCard: React.FC<CustomerCardProps> = ({
  id,
  name,
  email,
  phone,
  since,
  totalSpent = 0,
  loyaltyPoints = 0,
  customerGroup = 'RETAIL',
  marketingConsent,
  onClick,
}) => {
  // Get customer group badge styling
  const getGroupBadge = (group: string) => {
    switch (group) {
      case 'VIP':
        return { color: 'bg-gradient-to-r from-amber-400 to-amber-500 text-white', icon: <Star size={12} className="mr-1" /> };
      case 'WHOLESALE':
        return { color: 'bg-gradient-to-r from-blue-400 to-blue-500 text-white', icon: <TrendingUp size={12} className="mr-1" /> };
      case 'CORPORATE':
        return { color: 'bg-gradient-to-r from-purple-400 to-purple-500 text-white', icon: <Award size={12} className="mr-1" /> };
      case 'TRADE':
        return { color: 'bg-gradient-to-r from-green-400 to-green-500 text-white', icon: <Award size={12} className="mr-1" /> };
      case 'REGULAR':
        return { color: 'bg-gradient-to-r from-indigo-400 to-indigo-500 text-white', icon: <User size={12} className="mr-1" /> };
      default:
        return { color: 'bg-gray-100 text-gray-700', icon: null };
    }
  };

  const groupBadge = getGroupBadge(customerGroup);

  return (
    <Card
      className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] overflow-hidden h-full border-0 bg-white rounded-2xl shadow-md"
      onClick={() => onClick(id)}
    >
      <CardHeader className="pb-3 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
              <User size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-gray-800 truncate">
                {name}
              </CardTitle>
              <Badge className={`${groupBadge.color} text-xs font-medium mt-1 border-0 flex items-center w-fit`}>
                {groupBadge.icon}
                {customerGroup}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Contact Info */}
        <div className="space-y-2.5 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
              <Mail size={12} className="text-blue-600" />
            </div>
            <span className="text-gray-600 truncate flex-1">{email || 'No email'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center">
              <Phone size={12} className="text-green-600" />
            </div>
            <span className="text-gray-600">{phone || 'No phone'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center">
              <Calendar size={12} className="text-purple-600" />
            </div>
            <span className="text-gray-600">Since {since}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-100">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-xl">
            <div className="flex items-center gap-1 text-green-700 mb-1">
              <DollarSign size={12} />
              <span className="text-xs font-medium">Total Spent</span>
            </div>
            <div className="text-lg font-bold text-green-800">
              £{(totalSpent || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3 rounded-xl">
            <div className="flex items-center gap-1 text-amber-700 mb-1">
              <Award size={12} />
              <span className="text-xs font-medium">Points</span>
            </div>
            <div className="text-lg font-bold text-amber-800">
              {loyaltyPoints || 0}
            </div>
          </div>
        </div>

        {/* Marketing Consent */}
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={marketingConsent?.email ? "default" : "outline"}
            className={`text-xs ${marketingConsent?.email ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500'}`}
          >
            <Mail size={10} className="mr-1" />
            Email
          </Badge>
          <Badge
            variant={marketingConsent?.sms ? "default" : "outline"}
            className={`text-xs ${marketingConsent?.sms ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500'}`}
          >
            <Phone size={10} className="mr-1" />
            SMS
          </Badge>
          <Badge
            variant={marketingConsent?.phone ? "default" : "outline"}
            className={`text-xs ${marketingConsent?.phone ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-500'}`}
          >
            <Phone size={10} className="mr-1" />
            Call
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerCard;
