import React, { useState } from 'react';
import { apiClient } from '../services/apiClient';
import { authService } from '../services/authService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

const ApiTestPage: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, result: any, success: boolean) => {
    setResults(prev => [...prev, {
      test,
      result,
      success,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(true);
    try {
      const result = await testFn();
      addResult(testName, result, true);
    } catch (error) {
      addResult(testName, error, false);
    }
    setLoading(false);
  };

  const testHealthCheck = () => runTest('Health Check', () => apiClient.healthCheck());

  const testCustomerService = () => runTest('Customer Service', () => customerService.getCustomers());

  const testProductService = () => runTest('Product Service', () => productService.getProducts());

  const testAuthStatus = () => runTest('Auth Status', () => Promise.resolve({
    isAuthenticated: authService.isAuthenticated(),
    currentUser: authService.getCurrentUser(),
    token: authService.getToken() ? 'Present' : 'None'
  }));

  const clearResults = () => setResults([]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Integration Test Page</CardTitle>
          <CardDescription>
            Test the integration between frontend services and backend API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={testHealthCheck} disabled={loading}>
              Test Health Check
            </Button>
            <Button onClick={testCustomerService} disabled={loading} variant="outline">
              Test Customer Service
            </Button>
            <Button onClick={testProductService} disabled={loading} variant="outline">
              Test Product Service
            </Button>
            <Button onClick={testAuthStatus} disabled={loading} variant="outline">
              Check Auth Status
            </Button>
            <Button onClick={clearResults} variant="destructive" size="sm">
              Clear Results
            </Button>
          </div>
          
          {loading && (
            <div className="text-center p-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">Running test...</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            Results from API integration tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-muted-foreground">No tests run yet. Click a test button above.</p>
          ) : (
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  result.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{result.test}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{result.timestamp}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        result.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.success ? 'SUCCESS' : 'ERROR'}
                      </span>
                    </div>
                  </div>
                  <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                    {JSON.stringify(result.result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✅ Completed</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• PostgreSQL database setup and migrations</li>
                <li>• API client service with authentication</li>
                <li>• Customer service with CRUD operations</li>
                <li>• Product service with inventory management</li>
                <li>• Sales service with transaction handling</li>
                <li>• Repair service with job management</li>
                <li>• Frontend build system (Vite) working</li>
                <li>• TypeScript interfaces and types</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-orange-600">⚠️ Next Steps</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Start backend server (cd backend && npm run start:dev)</li>
                <li>• Test API endpoints from frontend</li>
                <li>• Verify authentication flow</li>
                <li>• Test CRUD operations</li>
                <li>• Validate data persistence</li>
                <li>• Error handling verification</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiTestPage;