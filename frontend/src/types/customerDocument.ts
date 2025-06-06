/**
 * Customer document interface
 */
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
  created_at?: string;
  updated_at?: string;
}

/**
 * Document type options with display names
 */
export const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Contract' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'repair', label: 'Repair Document' },
  { value: 'other', label: 'Other' },
] as const;
