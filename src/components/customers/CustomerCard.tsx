
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, Mail, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CustomerCardProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  since: string;
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
  marketingConsent,
  onClick,
}) => {
  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-md overflow-hidden h-full border-navy/10 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl" 
      onClick={() => onClick(id)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium flex items-center gap-2 text-navy">
          <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center">
            <User size={16} className="text-navy" />
          </div>
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-navy/60" />
            <span className="text-navy/80">{email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone size={14} className="text-navy/60" />
            <span className="text-navy/80">{phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-navy/60" />
            <span className="text-navy/80">Customer since: {since}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3 border-t border-navy/10 pt-3">
          <Badge 
            variant={marketingConsent.email ? "default" : "outline"} 
            className={`text-xs rounded-full px-2 py-0.5 ${marketingConsent.email ? 'bg-navy/10 text-navy border border-navy/20' : 'bg-white/50 text-navy/60 border border-navy/10'}`}
          >
            Email {marketingConsent.email ? '✓' : '✗'}
          </Badge>
          <Badge 
            variant={marketingConsent.sms ? "default" : "outline"} 
            className={`text-xs rounded-full px-2 py-0.5 ${marketingConsent.sms ? 'bg-gold/10 text-gold-dark border border-gold/20' : 'bg-white/50 text-navy/60 border border-navy/10'}`}
          >
            SMS {marketingConsent.sms ? '✓' : '✗'}
          </Badge>
          <Badge 
            variant={marketingConsent.phone ? "default" : "outline"} 
            className={`text-xs rounded-full px-2 py-0.5 ${marketingConsent.phone ? 'bg-navy/10 text-navy border border-navy/20' : 'bg-white/50 text-navy/60 border border-navy/10'}`}
          >
            Phone {marketingConsent.phone ? '✓' : '✗'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerCard;
