/**
 * Customer interface representing a customer in the system
 */
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
  created_at?: string;
  updated_at?: string;
}
