/**
 * Intelligent CSV Parser
 * Automatically detects columns, handles variations, validates data
 */

export interface ParsedCSVData {
  headers: string[];
  rows: any[];
  detectedColumns: ColumnMapping;
  validRows: number;
  invalidRows: number;
  errors: ParseError[];
}

export interface ColumnMapping {
  name?: number;
  sku?: number;
  category?: number;
  supplier?: number;
  material?: number;
  purity?: number;
  weight?: number;
  price?: number;
  sellingPrice?: number;
  cost?: number;
  costPrice?: number;
  quantity?: number;
  stock?: number;
  threshold?: number;
  minStock?: number;
  description?: number;
  location?: number;
  barcode?: number;
}

export interface ParseError {
  row: number;
  field: string;
  value: any;
  error: string;
}

export interface ValidatedInventoryItem {
  name: string;
  sku: string;
  category?: string;
  supplier?: string;
  material?: string;
  purity?: string;
  weight?: number;
  price: number;
  cost?: number;
  quantity: number;
  threshold?: number;
  description?: string;
  location?: string;
  barcode?: string;
  _rowNumber?: number;
  _warnings?: string[];
}

// Column name variations for intelligent detection
const COLUMN_VARIATIONS: Record<string, string[]> = {
  name: ['name', 'product name', 'product', 'item name', 'item', 'title'],
  sku: ['sku', 'product code', 'code', 'item code', 'product id'],
  category: ['category', 'cat', 'type', 'product type', 'category name'],
  supplier: ['supplier', 'vendor', 'supplier name', 'vendor name'],
  material: ['material', 'metal', 'material type', 'metal type'],
  purity: ['purity', 'karat', 'carat', 'gold purity', 'kt', 'k'],
  weight: ['weight', 'wt', 'weight (g)', 'weight in grams', 'grams', 'weight(g)'],
  price: ['price', 'selling price', 'sell price', 'retail price', 'sale price', 'sellingprice'],
  cost: ['cost', 'cost price', 'purchase price', 'buy price', 'costprice'],
  quantity: ['quantity', 'qty', 'stock', 'stock quantity', 'amount', 'count', 'stockquantity'],
  threshold: ['threshold', 'min stock', 'minimum stock', 'reorder level', 'low stock', 'minstock', 'minstocklevel'],
  description: ['description', 'desc', 'details', 'notes', 'note'],
  location: ['location', 'loc', 'storage', 'warehouse', 'bin', 'shelf'],
  barcode: ['barcode', 'upc', 'ean', 'gtin', 'bar code']
};

/**
 * Normalize header name for comparison
 */
const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, ''); // Remove special characters
};

/**
 * Detect column mapping based on header names
 */
export const detectColumns = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {};

  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);

    // Check against all variations
    for (const [field, variations] of Object.entries(COLUMN_VARIATIONS)) {
      if (variations.some(v => normalizeHeader(v) === normalized)) {
        (mapping as any)[field] = index;
        break;
      }
    }
  });

  return mapping;
};

/**
 * Parse number with flexibility
 */
const parseNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;

  // Remove currency symbols and commas
  const cleaned = String(value).replace(/[£$,\s]/g, '');
  const num = parseFloat(cleaned);

  return isNaN(num) ? null : num;
};

/**
 * Clean and normalize text
 */
const cleanText = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

/**
 * Validate and transform a single row
 */
const validateRow = (
  row: string[],
  mapping: ColumnMapping,
  rowNumber: number
): { item: ValidatedInventoryItem | null; errors: ParseError[] } => {
  const errors: ParseError[] = [];
  const warnings: string[] = [];

  // Extract values based on mapping
  const name = mapping.name !== undefined ? cleanText(row[mapping.name]) : '';
  const sku = mapping.sku !== undefined ? cleanText(row[mapping.sku]) : '';

  // Required fields validation
  if (!name) {
    errors.push({
      row: rowNumber,
      field: 'name',
      value: name,
      error: 'Product name is required'
    });
  }

  if (!sku) {
    errors.push({
      row: rowNumber,
      field: 'sku',
      value: sku,
      error: 'SKU is required'
    });
  }

  // Price - try both 'price' and 'sellingPrice' columns
  let price: number | null = null;
  if (mapping.price !== undefined) {
    price = parseNumber(row[mapping.price]);
  }
  if (!price && mapping.sellingPrice !== undefined) {
    price = parseNumber(row[mapping.sellingPrice]);
  }

  if (!price || price <= 0) {
    errors.push({
      row: rowNumber,
      field: 'price',
      value: price,
      error: 'Valid price is required (must be > 0)'
    });
  }

  // Quantity - try both 'quantity' and 'stock' columns
  let quantity: number | null = null;
  if (mapping.quantity !== undefined) {
    quantity = parseNumber(row[mapping.quantity]);
  }
  if (quantity === null && mapping.stock !== undefined) {
    quantity = parseNumber(row[mapping.stock]);
  }

  if (quantity === null || quantity < 0) {
    errors.push({
      row: rowNumber,
      field: 'quantity',
      value: quantity,
      error: 'Valid quantity is required (must be >= 0)'
    });
  }

  // Optional fields
  const category = mapping.category !== undefined ? cleanText(row[mapping.category]) : undefined;
  const supplier = mapping.supplier !== undefined ? cleanText(row[mapping.supplier]) : undefined;
  const material = mapping.material !== undefined ? cleanText(row[mapping.material]) : undefined;
  const purity = mapping.purity !== undefined ? cleanText(row[mapping.purity]) : undefined;
  const description = mapping.description !== undefined ? cleanText(row[mapping.description]) : undefined;
  const location = mapping.location !== undefined ? cleanText(row[mapping.location]) : undefined;
  const barcode = mapping.barcode !== undefined ? cleanText(row[mapping.barcode]) : undefined;

  // Cost - try both variations
  let cost: number | null = null;
  if (mapping.cost !== undefined) {
    cost = parseNumber(row[mapping.cost]);
  }
  if (!cost && mapping.costPrice !== undefined) {
    cost = parseNumber(row[mapping.costPrice]);
  }

  // Weight
  const weight = mapping.weight !== undefined ? parseNumber(row[mapping.weight]) : undefined;

  // Threshold - try both variations
  let threshold: number | null = null;
  if (mapping.threshold !== undefined) {
    threshold = parseNumber(row[mapping.threshold]);
  }
  if (!threshold && mapping.minStock !== undefined) {
    threshold = parseNumber(row[mapping.minStock]);
  }

  // If errors exist, return null item
  if (errors.length > 0) {
    return { item: null, errors };
  }

  // Create validated item
  const item: ValidatedInventoryItem = {
    name: name!,
    sku: sku!,
    price: price!,
    quantity: quantity!,
    category,
    supplier,
    material,
    purity,
    weight: weight || undefined,
    cost: cost || undefined,
    threshold: threshold || undefined,
    description,
    location,
    barcode,
    _rowNumber: rowNumber,
    _warnings: warnings.length > 0 ? warnings : undefined
  };

  return { item, errors };
};

/**
 * Parse CSV content intelligently
 */
export const parseCSV = (csvContent: string): ParsedCSVData => {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());

  if (lines.length === 0) {
    return {
      headers: [],
      rows: [],
      detectedColumns: {},
      validRows: 0,
      invalidRows: 0,
      errors: [{ row: 0, field: 'file', value: '', error: 'CSV file is empty' }]
    };
  }

  // Parse CSV (handle quoted fields)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result.map(field => field.replace(/^"|"$/g, '').trim());
  };

  // Parse headers
  const headers = parseCSVLine(lines[0]);

  // Detect column mapping
  const detectedColumns = detectColumns(headers);

  // Check if we detected critical columns
  if (detectedColumns.name === undefined && detectedColumns.sku === undefined) {
    return {
      headers,
      rows: [],
      detectedColumns,
      validRows: 0,
      invalidRows: 0,
      errors: [{
        row: 0,
        field: 'headers',
        value: headers.join(', '),
        error: 'Could not detect required columns (name or sku). Please ensure your CSV has proper headers.'
      }]
    };
  }

  // Parse and validate data rows
  const validatedItems: ValidatedInventoryItem[] = [];
  const allErrors: ParseError[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);

    // Skip empty rows
    if (row.every(cell => !cell.trim())) continue;

    const { item, errors } = validateRow(row, detectedColumns, i + 1);

    if (item) {
      validatedItems.push(item);
      validCount++;
    } else {
      invalidCount++;
      allErrors.push(...errors);
    }
  }

  return {
    headers,
    rows: validatedItems,
    detectedColumns,
    validRows: validCount,
    invalidRows: invalidCount,
    errors: allErrors
  };
};

/**
 * Generate CSV template with all supported columns
 */
export const generateCSVTemplate = (): string => {
  const headers = [
    'name',
    'sku',
    'category',
    'supplier',
    'material',
    'purity',
    'weight',
    'price',
    'cost',
    'quantity',
    'threshold',
    'description',
    'location',
    'barcode'
  ];

  const exampleRow = [
    'Gold Diamond Ring',
    'JWL-RING-001',
    'Rings',
    'ABC Suppliers',
    'GOLD',
    '18K',
    '5.5',
    '1200.00',
    '500.00',
    '10',
    '3',
    'Beautiful 18K gold ring with diamonds',
    'Shelf A1',
    '1234567890123'
  ];

  return [headers.join(','), exampleRow.join(',')].join('\n');
};
