import { Request, Response } from 'express';
import { CustomerModel, Customer } from '../models/customerModel';

export class CustomerController {
  /**
   * Create a new customer
   * @param req Express request
   * @param res Express response
   */
  async createCustomer(req: Request, res: Response) {
    try {
      const customerData: Customer = {
        name: req.body.name,
        email: req.body.email || null,
        phone: req.body.phone,
        notes: req.body.notes || null,
        marketing_email: Boolean(req.body.marketing_email),
        marketing_sms: Boolean(req.body.marketing_sms),
        marketing_phone: Boolean(req.body.marketing_phone),
        data_processing_consent: Boolean(req.body.data_processing_consent)
      };

      // Validate required fields
      if (!customerData.name || !customerData.phone) {
        return res.status(400).json({ 
          success: false, 
          message: 'Name and phone are required fields' 
        });
      }

      const customer = await CustomerModel.create(customerData);

      return res.status(201).json({
        success: true,
        customer
      });
    } catch (error: any) {
      console.error('Error creating customer:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create customer',
        error: error.message 
      });
    }
  }

  /**
   * Get all customers with optional search
   * @param req Express request
   * @param res Express response
   */
  async getCustomers(req: Request, res: Response) {
    try {
      const search = req.query.search as string | undefined;
      const customers = await CustomerModel.getAll(search);

      return res.status(200).json({
        success: true,
        count: customers.length,
        customers
      });
    } catch (error: any) {
      console.error('Error getting customers:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to get customers',
        error: error.message 
      });
    }
  }

  /**
   * Get a customer by ID
   * @param req Express request
   * @param res Express response
   */
  async getCustomerById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid customer ID' 
        });
      }

      const customer = await CustomerModel.getById(id);

      if (!customer) {
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }

      return res.status(200).json({
        success: true,
        customer
      });
    } catch (error: any) {
      console.error('Error getting customer:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to get customer',
        error: error.message 
      });
    }
  }

  /**
   * Update a customer
   * @param req Express request
   * @param res Express response
   */
  async updateCustomer(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid customer ID' 
        });
      }

      // Check if customer exists
      const existingCustomer = await CustomerModel.getById(id);

      if (!existingCustomer) {
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }

      // Prepare update data
      const updateData: Partial<Customer> = {};
      
      // Only include fields that are provided in the request
      if (req.body.name !== undefined) updateData.name = req.body.name;
      if (req.body.email !== undefined) updateData.email = req.body.email;
      if (req.body.phone !== undefined) updateData.phone = req.body.phone;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      if (req.body.marketing_email !== undefined) updateData.marketing_email = Boolean(req.body.marketing_email);
      if (req.body.marketing_sms !== undefined) updateData.marketing_sms = Boolean(req.body.marketing_sms);
      if (req.body.marketing_phone !== undefined) updateData.marketing_phone = Boolean(req.body.marketing_phone);
      if (req.body.data_processing_consent !== undefined) updateData.data_processing_consent = Boolean(req.body.data_processing_consent);

      // Update customer
      const updatedCustomer = await CustomerModel.update(id, updateData);

      return res.status(200).json({
        success: true,
        customer: updatedCustomer
      });
    } catch (error: any) {
      console.error('Error updating customer:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update customer',
        error: error.message 
      });
    }
  }

  /**
   * Delete a customer
   * @param req Express request
   * @param res Express response
   */
  async deleteCustomer(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid customer ID' 
        });
      }

      // Check if customer exists
      const existingCustomer = await CustomerModel.getById(id);

      if (!existingCustomer) {
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }

      // Delete customer
      const deleted = await CustomerModel.delete(id);

      return res.status(200).json({
        success: deleted,
        message: deleted ? 'Customer deleted successfully' : 'Failed to delete customer'
      });
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete customer',
        error: error.message 
      });
    }
  }
}

export const customerController = new CustomerController();
