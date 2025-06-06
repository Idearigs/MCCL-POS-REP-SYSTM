import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CustomersPage from './pages/CustomersPage';
import { Toaster } from './components/ui/toaster';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-gray-900 text-white shadow-md">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-1">
                <img src="/logo.png" alt="MCCL POS System" className="h-8 w-auto" />
                <span className="text-xl font-bold">MCCL POS System</span>
              </div>
              <div className="hidden md:flex space-x-6">
                <Link to="/" className="hover:text-blue-300 transition-colors">Dashboard</Link>
                <Link to="/customers" className="hover:text-blue-300 transition-colors">Customers</Link>
                <Link to="/products" className="hover:text-blue-300 transition-colors">Products</Link>
                <Link to="/repairs" className="hover:text-blue-300 transition-colors">Repair Jobs</Link>
                <Link to="/transactions" className="hover:text-blue-300 transition-colors">Transactions</Link>
              </div>
              <div className="flex items-center">
                <span className="text-sm mr-2">Staff Name</span>
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-xs font-bold">SN</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<div>Dashboard</div>} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/products" element={<div>Products</div>} />
            <Route path="/repairs" element={<div>Repair Jobs</div>} />
            <Route path="/transactions" element={<div>Transactions</div>} />
          </Routes>
        </main>

        <footer className="bg-gray-100 border-t border-gray-200 py-4">
          <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
            &copy; {new Date().getFullYear()} MCCL POS & Repair Management System. All rights reserved.
          </div>
        </footer>

        <Toaster />
      </div>
    </Router>
  );
};

export default App;
