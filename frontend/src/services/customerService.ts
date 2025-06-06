import axios from 'axios';
import { Customer } from '../types/customer';

const API_URL = '/api/customers';

/**
 * Service for handling customer-related API calls
 */
export const customerService = {
  /**
   * Get all customers with optional search
   * @param search Optional search term
   * @returns Array of customers
   */
  async getCustomers(search?: string): Promise<Customer[]> {
    const params = search ? { search } : {};
    const response = await axios.get(API_URL, { params });
    return response.data.customers;
  },

  /**
   * Get a customer by ID
   * @param id Customer ID
   * @returns Customer data
   */
  async getCustomerById(id: number): Promise<Customer> {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data.customer;
  },

  /**
   * Create a new customer
   * @param customer Customer data
   * @returns Created customer
   */
  async createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
    const response = await axios.post(API_URL, customer);
    return response.data.customer;
  },

  /**
   * Update a customer
   * @param id Customer ID
   * @param customer Customer data to update
   * @returns Updated customer
   */
  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer> {
    const response = await axios.put(`${API_URL}/${id}`, customer);
    return response.data.customer;
  },

  /**
   * Delete a customer
   * @param id Customer ID
   * @returns Success status
   */
  async deleteCustomer(id: number): Promise<boolean> {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data.success;
  }
};
