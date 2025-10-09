
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface ConsentFormProps {
  initialConsents?: {
    email: boolean;
    sms: boolean;
    phone: boolean;
    dataProcessing: boolean;
  };
  onSubmit: (consents: {
    email: boolean;
    sms: boolean;
    phone: boolean;
    dataProcessing: boolean;
  }) => void;
}

const ConsentForm: React.FC<ConsentFormProps> = ({ initialConsents, onSubmit }) => {
  const [consents, setConsents] = React.useState({
    email: initialConsents?.email || false,
    sms: initialConsents?.sms || false,
    phone: initialConsents?.phone || false,
    dataProcessing: initialConsents?.dataProcessing || true, // Default to true for existing customers
  });

  // Update state when initialConsents change
  useEffect(() => {
    if (initialConsents) {
      setConsents({
        email: initialConsents.email,
        sms: initialConsents.sms,
        phone: initialConsents.phone,
        dataProcessing: initialConsents.dataProcessing,
      });
    }
  }, [initialConsents]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(consents);
      toast({
        title: "Preferences Updated",
        description: "Your marketing preferences have been saved successfully.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Marketing & Data Processing Consent</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">Marketing Preferences</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We would like to send you information about our products, special offers, and services which we think you might be interested in.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="update-email-consent" 
                    checked={consents.email}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      setConsents(prev => ({ ...prev, email: isChecked }));
                    }} 
                  />
                  <Label htmlFor="update-email-consent" className="text-sm font-normal">
                    I consent to receive marketing communications via Email
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="update-sms-consent" 
                    checked={consents.sms}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      setConsents(prev => ({ ...prev, sms: isChecked }));
                    }} 
                  />
                  <Label htmlFor="update-sms-consent" className="text-sm font-normal">
                    I consent to receive marketing communications via SMS
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="update-phone-consent" 
                    checked={consents.phone}
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      setConsents(prev => ({ ...prev, phone: isChecked }));
                    }} 
                  />
                  <Label htmlFor="update-phone-consent" className="text-sm font-normal">
                    I consent to receive marketing communications via Phone calls
                  </Label>
                </div>
              </div>
            </div>
            
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-2">Data Processing</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We need to process your personal data to manage your account, provide services, and ensure security.
              </p>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="update-data-consent" 
                  checked={consents.dataProcessing}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    setConsents(prev => ({ ...prev, dataProcessing: isChecked }));
                  }} 
                  required
                />
                <Label htmlFor="update-data-consent" className="text-sm font-normal">
                  I consent to my personal data being processed as explained in the privacy policy
                </Label>
              </div>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600">
              Update Preferences
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ConsentForm;
