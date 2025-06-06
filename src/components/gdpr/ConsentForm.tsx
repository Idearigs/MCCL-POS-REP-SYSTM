
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ConsentFormProps {
  onSubmit: (consents: {
    email: boolean;
    sms: boolean;
    phone: boolean;
    dataProcessing: boolean;
  }) => void;
}

const ConsentForm: React.FC<ConsentFormProps> = ({ onSubmit }) => {
  const [consents, setConsents] = React.useState({
    email: false,
    sms: false,
    phone: false,
    dataProcessing: false,
  });

  const handleChange = (key: keyof typeof consents) => (checked: boolean) => {
    setConsents({ ...consents, [key]: checked });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(consents);
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
                    id="email-consent" 
                    checked={consents.email}
                    onCheckedChange={(checked) => handleChange('email')(!!checked)} 
                  />
                  <Label htmlFor="email-consent" className="text-sm font-normal">
                    I consent to receive marketing communications via Email
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sms-consent" 
                    checked={consents.sms}
                    onCheckedChange={(checked) => handleChange('sms')(!!checked)} 
                  />
                  <Label htmlFor="sms-consent" className="text-sm font-normal">
                    I consent to receive marketing communications via SMS
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="phone-consent" 
                    checked={consents.phone}
                    onCheckedChange={(checked) => handleChange('phone')(!!checked)} 
                  />
                  <Label htmlFor="phone-consent" className="text-sm font-normal">
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
                  id="data-consent" 
                  checked={consents.dataProcessing}
                  onCheckedChange={(checked) => handleChange('dataProcessing')(!!checked)} 
                  required
                />
                <Label htmlFor="data-consent" className="text-sm font-normal">
                  I consent to my personal data being processed as explained in the privacy policy
                </Label>
              </div>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <Button type="submit" className="w-full bg-navy hover:bg-navy-light">
              Save Preferences
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ConsentForm;
