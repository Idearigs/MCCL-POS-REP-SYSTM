import pool from '../utils/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Customer {
  id?: number;
  name: string;
  email: string | null;
  phone: string;
  notes?: string | null;
  marketing_email: boolean;
  marketing_sms: boolean;
  marketing_phone: boolean;
  data_processing_consent: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class CustomerModel {
  /**
   * Create a new customer
   * @param customer Customer data
   * @returns Created customer with ID
   */
  static async create(customer: Customer): Promise<Customer> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO customers (
        name, email, phone, notes, 
        marketing_email, marketing_sms, marketing_phone, data_processing_consent,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        customer.name,
        customer.email,
        customer.phone,
        customer.notes,
        customer.marketing_email ? 1 : 0,
        customer.marketing_sms ? 1 : 0,
        customer.marketing_phone ? 1 : 0,
        customer.data_processing_consent ? 1 : 0
      ]
    );

    return { ...customer, id: result.insertId };
  }

  /**
   * Get all customers
   * @param search Optional search term for name, email, or phone
   * @returns Array of customers
   */
  static async getAll(search?: string): Promise<Customer[]> {
    let query = `
      SELECT * FROM customers
      ORDER BY name ASC
    `;
    
    let params: any[] = [];
    
    if (search) {
      query = `
        SELECT * FROM customers
        WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
        ORDER BY name ASC
      `;
      params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      notes: row.notes,
      marketing_email: Boolean(row.marketing_email),
      marketing_sms: Boolean(row.marketing_sms),
      marketing_phone: Boolean(row.marketing_phone),
      data_processing_consent: Boolean(row.data_processing_consent),
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  }

  /**
   * Get a customer by ID
   * @param id Customer ID
   * @returns Customer or null if not found
   */
  static async getById(id: number): Promise<Customer | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM customers WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      notes: row.notes,
      marketing_email: Boolean(row.marketing_email),
      marketing_sms: Boolean(row.marketing_sms),
      marketing_phone: Boolean(row.marketing_phone),
      data_processing_consent: Boolean(row.data_processing_consent),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Update a customer
   * @param id Customer ID
   * @param customer Customer data to update
   * @returns Updated customer
   */
  static async update(id: number, customer: Partial<Customer>): Promise<Customer | null> {
    const fields: string[] = [];
    const values: any[] = [];

    // Build dynamic update fields
    Object.entries(customer).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
        if (key === 'marketing_email' || key === 'marketing_sms' || 
            key === 'marketing_phone' || key === 'data_processing_consent') {
          fields.push(`${key} = ?`);
          values.push(value ? 1 : 0);
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    });

    fields.push('updated_at = NOW()');

    // Add ID to values array for WHERE clause
    values.push(id);

    await pool.execute(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getById(id);
  }

  /**
   * Delete a customer
   * @param id Customer ID
   * @returns True if deleted successfully
   */
  static async delete(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM customers WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  }
}
