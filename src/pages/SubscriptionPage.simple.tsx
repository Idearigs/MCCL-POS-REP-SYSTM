import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const SubscriptionPage: React.FC = () => {
  const { auth } = useAuth();

  return (
    <MainLayout pageTitle="Subscription Management">
      <div className="container mx-auto py-6 space-y-8">
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        
        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>Overview of your current subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">Plan</h3>
                <p className="text-lg capitalize">{auth.subscription.plan}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">Status</h3>
                <p className="text-lg capitalize">{auth.subscription.status}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">Price</h3>
                <p className="text-lg">${auth.subscription.price.toFixed(2)}/month</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium">Renewal Date</h3>
                <p className="text-lg">{new Date(auth.subscription.endDate).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SubscriptionPage;
