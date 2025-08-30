import { Customer } from '../types/customer';
import { mockCustomers, generateId, simulateDelay } from './mockData';

// Storage key for localStorage
const STORAGE_KEY = 'mps_customers';

/**
 * Service for handling customer-related operations using localStorage
 */
export const customerService = {
  /**
   * Get customers from localStorage
   * @returns Array of customers from localStorage or mock data
   */
  getStoredCustomers(): Customer[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.warn('Error parsing stored customers, using mock data:', error);
      }
    }
    // Initialize with mock data if nothing stored
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockCustomers));
    return mockCustomers;
  },

  /**
   * Save customers to localStorage
   * @param customers Array of customers to save
   */
  saveCustomers(customers: Customer[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  },

  /**
   * Get all customers with optional search
   * @param search Optional search term
   * @returns Array of customers
   */
  async getCustomers(search?: string): Promise<Customer[]> {
    await simulateDelay(300); // Simulate network delay
    
    const customers = this.getStoredCustomers();
    
    if (!search) {
      return customers;
    }
    
    // Filter customers based on search term
    const searchLower = search.toLowerCase();
    return customers.filter(customer =>
      customer.first_name.toLowerCase().includes(searchLower) ||
      customer.last_name.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone.includes(search)
    );
  },

  /**
   * Get a customer by ID
   * @param id Customer ID
   * @returns Customer data
   */
  async getCustomerById(id: number): Promise<Customer> {
    await simulateDelay(200);
    
    const customers = this.getStoredCustomers();
    const customer = customers.find(c => c.id === id);
    
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }
    
    return customer;
  },

  /**
   * Create a new customer
   * @param customer Customer data
   * @returns Created customer
   */
  async createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
    await simulateDelay(400);
    
    const customers = this.getStoredCustomers();
    const newCustomer: Customer = {
      ...customer,
      id: generateId(),
      date_added: new Date().toISOString().split('T')[0],
      total_spent: 0,
      visit_count: 0,
      loyalty_points: 0
    };
    
    const updatedCustomers = [...customers, newCustomer];
    this.saveCustomers(updatedCustomers);
    
    return newCustomer;
  },

  /**
   * Update a customer
   * @param id Customer ID
   * @param customerData Customer data to update
   * @returns Updated customer
   */
  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer> {
    await simulateDelay(400);
    
    const customers = this.getStoredCustomers();
    const customerIndex = customers.findIndex(c => c.id === id);
    
    if (customerIndex === -1) {
      throw new Error(`Customer with ID ${id} not found`);
    }
    
    const updatedCustomer = { ...customers[customerIndex], ...customerData };
    const updatedCustomers = [...customers];
    updatedCustomers[customerIndex] = updatedCustomer;
    
    this.saveCustomers(updatedCustomers);
    
    return updatedCustomer;
  },

  /**
   * Delete a customer
   * @param id Customer ID
   * @returns Success status
   */
  async deleteCustomer(id: number): Promise<boolean> {
    await simulateDelay(300);
    
    const customers = this.getStoredCustomers();
    const filteredCustomers = customers.filter(c => c.id !== id);
    
    if (filteredCustomers.length === customers.length) {
      throw new Error(`Customer with ID ${id} not found`);
    }
    
    this.saveCustomers(filteredCustomers);
    
    return true;
  }
};
