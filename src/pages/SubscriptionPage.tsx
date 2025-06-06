import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, CheckCircle2, Clock, CreditCardIcon, Lock, Building2, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

const SubscriptionPage: React.FC = () => {
  const { auth, addNotification } = useAuth();
  const location = useLocation();
  const warningRef = useRef<HTMLDivElement>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [accountDetails, setAccountDetails] = useState('GB29 NWBK 6016 1331 9268 19');
  const [accountName, setAccountName] = useState('Idearigs Pvt Ltd');
  const [payoutDay, setPayoutDay] = useState('1');
  const [hasInsufficientFunds, setHasInsufficientFunds] = useState(true);
  
  const handleToggleInsufficientFunds = () => {
    const newState = !hasInsufficientFunds;
    setHasInsufficientFunds(newState);
    
    // Add notification when insufficient funds is enabled
    if (newState) {
      addNotification({
        type: 'payment',
        title: 'Payment Warning',
        message: 'Your account has insufficient funds. System will be shut down if payment is not received.',
        link: '/subscription?highlight=warning'
      });
    }
  };
  // Effect to scroll to warning message when navigated from notification
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const highlight = searchParams.get('highlight');
    
    if (highlight === 'warning' && warningRef.current) {
      // Scroll to the warning message with a slight delay to ensure rendering
      setTimeout(() => {
        warningRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a highlight animation by adding a class with animation
        warningRef.current?.classList.add('animate-pulse');
        // Make the border more prominent
        warningRef.current?.classList.add('border-red-500');
        warningRef.current?.classList.add('border-2');
        
        // Remove the highlight after animation
        setTimeout(() => {
          warningRef.current?.classList.remove('animate-pulse');
          warningRef.current?.classList.remove('border-red-500');
          warningRef.current?.classList.remove('border-2');
          warningRef.current?.classList.add('border');
          warningRef.current?.classList.add('border-red-200');
        }, 3000);
      }, 300);
    }
  }, [location]);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '•••• •••• •••• 4242',
    expiryDate: '12/28',
    cvv: '•••',
    cardholderName: 'Client Name'
  });
  const [directDebitEnabled, setDirectDebitEnabled] = useState(true);
  const [withdrawalDay, setWithdrawalDay] = useState('1');
  const [isSavingWithdrawalDay, setIsSavingWithdrawalDay] = useState(false);
  const [isEditingWithdrawalDay, setIsEditingWithdrawalDay] = useState(false);
  
  const validateCardDetails = () => {
    const errors = [];
    
    // Basic validation
    if (!cardDetails.cardNumber.trim()) errors.push('Card number is required');
    if (!cardDetails.expiryDate.trim()) errors.push('Expiry date is required');
    if (!cardDetails.cvv.trim()) errors.push('CVV is required');
    if (!cardDetails.cardholderName.trim()) errors.push('Cardholder name is required');
    
    // Format validation
    const cardNumberPattern = /^(\d{4}\s?){3}\d{4}$/;
    if (cardDetails.cardNumber.replace(/[•\s]/g, '').length > 0 && 
        !cardNumberPattern.test(cardDetails.cardNumber.replace(/[•]/g, '0'))) {
      errors.push('Card number must be 16 digits (format: XXXX XXXX XXXX XXXX)');
    }
    
    const expiryPattern = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (cardDetails.expiryDate && !expiryPattern.test(cardDetails.expiryDate)) {
      errors.push('Expiry date must be in MM/YY format');
    }
    
    const cvvPattern = /^[0-9]{3,4}$/;
    if (cardDetails.cvv.replace(/[•]/g, '').length > 0 && 
        !cvvPattern.test(cardDetails.cvv.replace(/[•]/g, '0'))) {
      errors.push('CVV must be 3 or 4 digits');
    }
    
    return errors;
  };
  
  const handleSavePaymentDetails = () => {
    setIsProcessing(true);
    
    // Validate card details
    const errors = validateCardDetails();
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      setIsProcessing(false);
      return;
    }
    
    // Simulate API call to save payment details
    setTimeout(() => {
      // Update local storage or context if needed
      // For demo, we'll just show a success message
      toast.success('Payment details saved successfully');
      setIsProcessing(false);
      setIsEditing(false);
      
      // In a real application, you would update the auth context or make an API call
      // Example: updateSubscription(cardDetails);
    }, 1000);
  };

  return (
    <MainLayout pageTitle="Subscription Management" hasPaymentWarning={hasInsufficientFunds}>
      <div className="container mx-auto py-6 space-y-8">
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              <span>Automatic Payment Setup</span>
            </CardTitle>
            <CardDescription className="text-xs">Monthly payment configuration for Idearigs Pvt Ltd</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                <div className="space-y-0.5">
                  <div className="text-base font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>Direct Debit Enabled</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Automatically process monthly subscription payment
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Required</span>
                  <Switch
                    checked={true}
                    disabled={true}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col h-full">
                  <h3 className="text-lg font-medium mb-4">Payment Source</h3>
                  <div className="space-y-4 p-4 border rounded-lg flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Card Details</span>
                      <div className="flex items-center gap-2">
                        {!isEditing ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsEditing(true)}
                            className="text-primary hover:text-primary/80"
                          >
                            Edit
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsEditing(false)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </Button>
                        )}
                        <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <div className="relative">
                        <Input
                          id="cardNumber"
                          value={cardDetails.cardNumber}
                          readOnly={!isEditing}
                          className={`pr-10 ${!isEditing ? 'bg-muted' : ''}`}
                          onChange={(e) => setCardDetails({...cardDetails, cardNumber: e.target.value})}
                          placeholder="1234 5678 9012 3456"
                        />
                        <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiryDate">Expiry Date</Label>
                        <Input
                          id="expiryDate"
                          value={cardDetails.expiryDate}
                          readOnly={!isEditing}
                          className={!isEditing ? 'bg-muted' : ''}
                          onChange={(e) => setCardDetails({...cardDetails, expiryDate: e.target.value})}
                          placeholder="MM/YY"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <div className="relative">
                          <Input
                            id="cvv"
                            value={cardDetails.cvv}
                            readOnly={!isEditing}
                            className={`pr-10 ${!isEditing ? 'bg-muted' : ''}`}
                            onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                            placeholder="123"
                          />
                          <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cardholderName">Cardholder Name</Label>
                      <Input
                        id="cardholderName"
                        value={cardDetails.cardholderName}
                        readOnly={!isEditing}
                        className={!isEditing ? 'bg-muted' : ''}
                        onChange={(e) => setCardDetails({...cardDetails, cardholderName: e.target.value})}
                        placeholder="Cardholder Name"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col h-full">
                  <h3 className="text-lg font-medium mb-4">Payment Settings</h3>
                  <div className="space-y-4 p-4 border rounded-lg flex-1">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="withdrawalDay">Withdrawal Day of Month</Label>
                        {isEditingWithdrawalDay ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsEditingWithdrawalDay(false)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </Button>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setIsEditingWithdrawalDay(true)}
                            className="text-primary hover:text-primary/80"
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="withdrawalDay"
                          value={withdrawalDay}
                          readOnly={!isEditingWithdrawalDay}
                          className={!isEditingWithdrawalDay ? 'bg-muted' : ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow numbers 1-28
                            if (/^([1-9]|1\d|2[0-8])$/.test(value) || value === '') {
                              setWithdrawalDay(value);
                            }
                          }}
                          placeholder="1-28"
                        />
                        {isEditingWithdrawalDay && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              setIsSavingWithdrawalDay(true);
                              setTimeout(() => {
                                toast.success('Withdrawal day updated successfully');
                                setIsSavingWithdrawalDay(false);
                                setIsEditingWithdrawalDay(false);
                              }, 1000);
                            }}
                            disabled={isSavingWithdrawalDay}
                          >
                            {isSavingWithdrawalDay ? 'Saving...' : 'Save'}
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">Day of the month when payment will be processed</p>
                    </div>
                    
                    <div className="pt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Payment Amount</span>
                        <span className="font-bold">£100.00/month</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Fixed monthly subscription fee</p>
                    </div>
                    
                    <div className="pt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Account Name</span>
                        <span className="font-medium">{accountName}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Company name for subscription payments</p>

                      <div className="flex items-center justify-between mt-3">
                        <span className="font-medium">Account Number</span>
                        <span className="font-medium">{accountDetails}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Bank account for subscription payments</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Automatic Payment Flow</span>
                </div>
                <p className="text-sm">On the {withdrawalDay}{withdrawalDay === '1' ? 'st' : withdrawalDay === '2' ? 'nd' : withdrawalDay === '3' ? 'rd' : 'th'} of each month, £100.00 will be automatically processed by Idearigs Pvt Ltd for the monthly subscription.</p>
              </div>
              
              {hasInsufficientFunds && (
                <div 
                  ref={warningRef}
                  className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg transition-all duration-300 highlight-pulse-animation"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Payment Warning</span>
                  </div>
                  <p className="text-sm ml-7"><strong>Warning:</strong> Your account has insufficient funds for the upcoming payment. If payment is not received by the due date, your system will be automatically shut down. Please ensure your payment method has adequate funds before the next billing date.</p>
                  <div className="flex justify-end mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => {
                        setHasInsufficientFunds(false);
                        // Find and clear any payment warning notifications
                        const paymentWarning = auth.notifications.find(
                          n => n.type === 'payment' && n.title === 'Payment Warning'
                        );
                        if (paymentWarning) {
                          addNotification({
                            type: 'system',
                            title: 'Payment Issue Resolved',
                            message: 'Your payment issue has been resolved. Thank you for your prompt attention.',
                            link: '/subscription'
                          });
                        }
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}
              
              {isEditing ? (
                <Button 
                  onClick={handleSavePaymentDetails} 
                  disabled={isProcessing}
                  className="w-full md:w-auto"
                >
                  {isProcessing ? 'Saving...' : 'Save Card Details'}
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Subscription payment settings configured</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscription Status</CardTitle>
            <CardDescription className="text-xs">Overview of your Idearigs Pvt Ltd subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg text-sm">
                <h3 className="font-medium text-sm">Plan</h3>
                <p className="text-sm capitalize">{auth.subscription.plan}</p>
              </div>
              <div className="p-3 border rounded-lg text-sm">
                <h3 className="font-medium text-sm">Status</h3>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <p className="text-sm capitalize">{auth.subscription.status}</p>
                </div>
              </div>
              <div className="p-3 border rounded-lg text-sm">
                <h3 className="font-medium text-sm">Price</h3>
                <p className="text-sm">£100.00/month</p>
              </div>
              <div className="p-3 border rounded-lg text-sm">
                <h3 className="font-medium text-sm">Renewal Date</h3>
                <p className="text-sm">{new Date(auth.subscription.endDate).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SubscriptionPage;
