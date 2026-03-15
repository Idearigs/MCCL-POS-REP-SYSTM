import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, User, Mail, Phone, MapPin, Loader2 } from 'lucide-react';
import { customerService } from '@/services/customerService';
import { toast } from 'sonner';

const CustomerSelfRegistration: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    marketingEmail: false,
    marketingSms: false,
    dataProcessingConsent: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    if (!formData.dataProcessingConsent) {
      toast.error('Please accept the data processing consent');
      return;
    }

    setIsSubmitting(true);

    try {
      await customerService.createCustomer(formData);
      setIsSuccess(true);
      toast.success('Registration successful! Welcome!');

      // Auto-reset after 5 seconds
      setTimeout(() => {
        handleReset();
      }, 5000);
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      marketingEmail: false,
      marketingSms: false,
      dataProcessingConsent: false,
    });
    setIsSuccess(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl shadow-2xl border-2 border-green-200">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-32 h-32 text-green-500 mx-auto mb-6 animate-bounce" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Registration Successful!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Thank you for registering with us. We look forward to serving you!
            </p>
            <Button
              onClick={handleReset}
              size="lg"
              className="text-xl px-12 py-6 h-auto"
            >
              Register Another Customer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-3xl shadow-2xl">
        <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-purple-600 text-white pb-8 pt-10">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-12 h-12 text-blue-600" />
          </div>
          <CardTitle className="text-4xl font-bold mb-3">Customer Registration</CardTitle>
          <CardDescription className="text-blue-50 text-lg">
            Please fill in your information to register
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="text-lg h-14 border-2"
                required
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-lg font-semibold flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="text-lg h-14 border-2"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-lg font-semibold flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email (optional)"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="text-lg h-14 border-2"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Address
              </Label>
              <Textarea
                id="address"
                placeholder="Enter your address (optional)"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="text-lg border-2 min-h-[80px]"
                rows={2}
              />
            </div>

            {/* City and Postal Code */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-lg font-semibold">
                  City
                </Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="text-lg h-14 border-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-lg font-semibold">
                  Postal Code
                </Label>
                <Input
                  id="postalCode"
                  type="text"
                  placeholder="Postal Code"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  className="text-lg h-14 border-2"
                />
              </div>
            </div>

            {/* Marketing Preferences */}
            <div className="bg-blue-50 p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Marketing Preferences (Optional)
              </h3>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="marketingEmail"
                  checked={formData.marketingEmail}
                  onCheckedChange={(checked) => handleInputChange('marketingEmail', checked)}
                  className="mt-1"
                />
                <Label htmlFor="marketingEmail" className="text-base cursor-pointer leading-relaxed">
                  I would like to receive promotional emails and special offers
                </Label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="marketingSms"
                  checked={formData.marketingSms}
                  onCheckedChange={(checked) => handleInputChange('marketingSms', checked)}
                  className="mt-1"
                />
                <Label htmlFor="marketingSms" className="text-base cursor-pointer leading-relaxed">
                  I would like to receive SMS notifications about promotions
                </Label>
              </div>
            </div>

            {/* Data Processing Consent */}
            <div className="bg-yellow-50 border-2 border-yellow-200 p-6 rounded-lg">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="dataProcessingConsent"
                  checked={formData.dataProcessingConsent}
                  onCheckedChange={(checked) => handleInputChange('dataProcessingConsent', checked)}
                  className="mt-1"
                  required
                />
                <Label htmlFor="dataProcessingConsent" className="text-base cursor-pointer leading-relaxed">
                  <span className="text-red-500 font-bold">* Required:</span> I consent to the processing of my personal data in accordance with the privacy policy
                </Label>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleReset}
                className="flex-1 text-lg h-16"
                disabled={isSubmitting}
              >
                Clear Form
              </Button>
              <Button
                type="submit"
                size="lg"
                className="flex-1 text-lg h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register Now'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerSelfRegistration;
