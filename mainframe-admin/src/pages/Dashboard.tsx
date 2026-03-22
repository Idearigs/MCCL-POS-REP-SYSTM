import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { customerProfilesApi, subscriptionsApi, bugReportsApi, featureRequestsApi } from '../services/api';
import { Building2, DollarSign, Bug, Lightbulb, LogOut, Server, Users, Package } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { admin, logout } = useAuth();
  const [stats, setStats] = useState({
    customers: 0,
    activeCustomers: 0,
    mrr: 0,
    openBugs: 0,
    featureRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [customerStats, subStats, bugStats, requests] = await Promise.all([
        customerProfilesApi.getStats().catch(() => ({ data: { total: 0, active: 0 } })),
        subscriptionsApi.getStats().catch(() => ({ data: { mrr: 0 } })),
        bugReportsApi.getStats().catch(() => ({ data: { open: 0 } })),
        featureRequestsApi.getAll().catch(() => ({ data: [] })),
      ]);

      setStats({
        customers: customerStats.data.total || 0,
        activeCustomers: customerStats.data.active || 0,
        mrr: subStats.data.mrr || 0,
        openBugs: bugStats.data.open || 0,
        featureRequests: requests.data.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TrueDesk MainFrame</h1>
              <p className="text-sm text-gray-500">Admin Control Center</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {admin?.firstName} {admin?.lastName}
              </p>
              <p className="text-xs text-gray-500">{admin?.role}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">Overview of all customer instances and system status</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Total Customers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.customers}</p>
                <p className="text-xs text-green-600 mt-2">{stats.activeCustomers} active</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-green-100">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900">£{stats.mrr}</p>
                <p className="text-xs text-gray-500 mt-2">MRR</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-100">
                    <Bug className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Open Bugs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.openBugs}</p>
                <p className="text-xs text-gray-500 mt-2">Pending fixes</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100">
                    <Lightbulb className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-1">Feature Requests</p>
                <p className="text-3xl font-bold text-gray-900">{stats.featureRequests}</p>
                <p className="text-xs text-gray-500 mt-2">From customers</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-blue-100">
                    <Building2 className="w-5 h-5 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Add Customer</p>
                    <p className="text-sm text-gray-500">Create new instance</p>
                  </div>
                </button>

                <button className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-green-100">
                    <Package className="w-5 h-5 text-gray-600 group-hover:text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">Manage Features</p>
                    <p className="text-sm text-gray-500">System features</p>
                  </div>
                </button>

                <button className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-purple-100">
                    <Users className="w-5 h-5 text-gray-600 group-hover:text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">View Customers</p>
                    <p className="text-sm text-gray-500">All instances</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Full Dashboard Coming Soon
              </h3>
              <p className="text-blue-700">
                This is a simplified MainFrame dashboard. The complete customer management,
                subscription billing, feature control, and bug tracking interface will be
                integrated here. Run the Prisma migration to create the database tables first.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
