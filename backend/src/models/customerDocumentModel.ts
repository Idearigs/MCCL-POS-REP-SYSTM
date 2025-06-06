import pool from '../utils/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { driveService } from '../utils/drive/googleDriveService';
import { Customer } from './customerModel';

export interface CustomerDocument {
  id?: number;
  customer_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  drive_file_id: string;
  drive_view_link: string;
  document_type: 'contract' | 'receipt' | 'repair' | 'other';
  notes?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export class CustomerDocumentModel {
  /**
   * Create a new customer document record
   * @param document Customer document data
   * @returns Created document with ID
   */
  static async create(document: CustomerDocument): Promise<CustomerDocument> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO customer_documents (
        customer_id, file_name, file_type, file_size, 
        drive_file_id, drive_view_link, document_type, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        document.customer_id,
        document.file_name,
        document.file_type,
        document.file_size,
        document.drive_file_id,
        document.drive_view_link,
        document.document_type,
        document.notes
      ]
    );

    return { ...document, id: result.insertId };
  }

  /**
   * Get all documents for a specific customer
   * @param customerId ID of the customer
   * @returns Array of customer documents
   */
  static async getByCustomerId(customerId: number): Promise<CustomerDocument[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM customer_documents WHERE customer_id = ? ORDER BY created_at DESC`,
      [customerId]
    );

    return rows as CustomerDocument[];
  }

  /**
   * Get a document by ID
   * @param id Document ID
   * @returns Customer document or null if not found
   */
  static async getById(id: number): Promise<CustomerDocument | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM customer_documents WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as CustomerDocument;
  }

  /**
   * Update a customer document
   * @param id Document ID
   * @param documentData Updated document data
   * @returns Updated document or null if not found
   */
  static async update(
    id: number,
    documentData: Partial<CustomerDocument>
  ): Promise<CustomerDocument | null> {
    // Only allow updating certain fields
    const allowedFields = ['document_type', 'notes'];
    const updates: Record<string, any> = {};

    // Filter out fields that are not allowed to be updated
    for (const field of allowedFields) {
      if (field in documentData) {
        updates[field] = (documentData as any)[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      // No valid fields to update
      const document = await this.getById(id);
      return document;
    }

    // Build the SET part of the query
    const setClause = Object.keys(updates)
      .map((field) => `${field} = ?`)
      .join(', ');

    const values = [...Object.values(updates), id];

    await pool.execute(
      `UPDATE customer_documents SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return this.getById(id);
  }

  /**
   * Delete a customer document
   * @param id Document ID
   * @returns True if deleted, false if not found
   */
  static async delete(id: number): Promise<boolean> {
    // First, get the document to retrieve the Drive file ID
    const document = await this.getById(id);
    if (!document) {
      return false;
    }

    // Delete the record from the database
    const [result] = await pool.execute<ResultSetHeader>(
      `DELETE FROM customer_documents WHERE id = ?`,
      [id]
    );

    // Attempt to delete the file from Google Drive
    // Note: We don't throw if Drive deletion fails, as the database record is the source of truth
    try {
      if (document.drive_file_id) {
        await driveService.deleteFile(document.drive_file_id);
      }
    } catch (error) {
      console.error(`Failed to delete file from Google Drive: ${document.drive_file_id}`, error);
      // Continue with the database deletion even if Drive deletion fails
    }

    return result.affectedRows > 0;
  }

  /**
   * Upload a document for a customer and create the database record
   * @param customerId ID of the customer
   * @param fileBuffer Buffer containing the file data
   * @param fileName Original file name
   * @param fileType MIME type of the file
   * @param documentType Type of document (contract, receipt, etc.)
   * @param notes Optional notes about the document
   * @returns Created document record
   */
  static async uploadDocument(
    customerId: number,
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
    documentType: CustomerDocument['document_type'],
    notes?: string
  ): Promise<CustomerDocument> {
    try {
      // First, create a folder for the customer if it doesn't exist
      const customerFolderId = await this.getOrCreateCustomerFolder(customerId);
      
      // Upload the file to Google Drive
      const { id: driveFileId, webViewLink } = await driveService.uploadFile(
        fileBuffer,
        fileName,
        fileType,
        customerFolderId
      );
      
      // Create the document record in the database
      const document: CustomerDocument = {
        customer_id: customerId,
        file_name: fileName,
        file_type: fileType,
        file_size: fileBuffer.length,
        drive_file_id: driveFileId,
        drive_view_link: webViewLink,
        document_type: documentType,
        notes: notes || null
      };
      
      return await this.create(document);
    } catch (error) {
      console.error('Error uploading customer document:', error);
      throw new Error('Failed to upload customer document');
    }
  }

  /**
   * Get or create a Google Drive folder for a customer
   * @param customerId ID of the customer
   * @returns ID of the customer's folder
   */
  private static async getOrCreateCustomerFolder(customerId: number): Promise<string> {
    try {
      // First, ensure the customers folder exists
      const customersFolderId = await driveService.createFolder('Customers');
      
      // Get the customer's name to use in the folder name
      const [customerRows] = await pool.execute<RowDataPacket[]>(
        `SELECT name FROM customers WHERE id = ?`,
        [customerId]
      );
      
      if (customerRows.length === 0) {
        throw new Error(`Customer with ID ${customerId} not found`);
      }
      
      const customerName = (customerRows[0] as Customer).name;
      const folderName = `${customerName} (ID ${customerId})`;
      
      // Create or get the customer's folder
      return await driveService.createFolder(folderName, customersFolderId);
    } catch (error) {
      console.error('Error creating customer folder:', error);
      throw new Error('Failed to create customer folder in Google Drive');
    }
  }
}
