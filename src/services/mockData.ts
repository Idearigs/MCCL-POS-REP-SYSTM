import { Customer } from '../types/customer';
import { CustomerDocument } from '../types/customerDocument';

// Mock customer data for demonstration
export const mockCustomers: Customer[] = [
  {
    id: 1,
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+94771234567',
    address: '123 Main Street, Colombo 03',
    date_added: '2024-01-15',
    total_spent: 2850.00,
    visit_count: 12,
    notes: 'Preferred customer, likes gold jewelry',
    loyalty_points: 285,
    preferred_contact: 'email',
    birth_date: '1985-06-15',
    anniversary_date: '2010-09-20'
  },
  {
    id: 2,
    first_name: 'Michael',
    last_name: 'Fernando',
    email: 'michael.f@email.com',
    phone: '+94771234568',
    address: '456 Lake Road, Kandy',
    date_added: '2024-02-10',
    total_spent: 1200.00,
    visit_count: 5,
    notes: 'Watch collector, prefers Swiss brands',
    loyalty_points: 120,
    preferred_contact: 'phone',
    birth_date: '1978-12-03',
    anniversary_date: '2005-11-14'
  },
  {
    id: 3,
    first_name: 'Priya',
    last_name: 'Perera',
    email: 'priya.perera@email.com',
    phone: '+94771234569',
    address: '789 Galle Road, Mount Lavinia',
    date_added: '2024-03-05',
    total_spent: 950.00,
    visit_count: 3,
    notes: 'Recently engaged, looking for wedding jewelry',
    loyalty_points: 95,
    preferred_contact: 'email',
    birth_date: '1992-04-22',
    anniversary_date: null
  },
  {
    id: 4,
    first_name: 'Raj',
    last_name: 'Silva',
    email: 'raj.silva@email.com',
    phone: '+94771234570',
    address: '321 Temple Road, Nugegoda',
    date_added: '2024-01-30',
    total_spent: 3200.00,
    visit_count: 18,
    notes: 'VIP customer, buys gifts frequently',
    loyalty_points: 320,
    preferred_contact: 'phone',
    birth_date: '1970-08-10',
    anniversary_date: '1995-12-25'
  },
  {
    id: 5,
    first_name: 'Emma',
    last_name: 'Wilson',
    email: 'emma.wilson@email.com',
    phone: '+94771234571',
    address: '567 Park Street, Colombo 07',
    date_added: '2024-02-20',
    total_spent: 1750.00,
    visit_count: 8,
    notes: 'Prefers modern designs, silver jewelry',
    loyalty_points: 175,
    preferred_contact: 'email',
    birth_date: '1988-11-28',
    anniversary_date: '2012-06-15'
  }
];

// Mock customer documents
export const mockCustomerDocuments: CustomerDocument[] = [
  {
    id: 1,
    customer_id: 1,
    document_type: 'receipt',
    file_name: 'receipt_001.pdf',
    file_path: '/documents/customer_1/receipt_001.pdf',
    file_size: 245760,
    mime_type: 'application/pdf',
    uploaded_at: '2024-01-15T10:30:00Z',
    notes: 'Purchase receipt for gold necklace'
  },
  {
    id: 2,
    customer_id: 1,
    document_type: 'warranty',
    file_name: 'warranty_certificate.pdf',
    file_path: '/documents/customer_1/warranty_certificate.pdf',
    file_size: 185920,
    mime_type: 'application/pdf',
    uploaded_at: '2024-01-15T10:35:00Z',
    notes: '2-year warranty certificate'
  },
  {
    id: 3,
    customer_id: 2,
    document_type: 'appraisal',
    file_name: 'watch_appraisal.pdf',
    file_path: '/documents/customer_2/watch_appraisal.pdf',
    file_size: 512000,
    mime_type: 'application/pdf',
    uploaded_at: '2024-02-10T14:20:00Z',
    notes: 'Professional appraisal for Rolex watch'
  }
];

// Helper function to generate unique ID
export const generateId = (): number => {
  return Date.now() + Math.floor(Math.random() * 1000);
};

// Helper function to simulate API delay
export const simulateDelay = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};