// /src/features/datasets/schemaDetector.js

const csv = require('csv-parser');
const xlsx = require('node-xlsx');
const { Readable } = require('stream');
const logger = require('../../core/logger');
const { AppError } = require('../../core/errorHandler');

/**
 * Schema detector for CSV and Excel files
 */
class SchemaDetector {
  /**
   * Detect schema from file buffer
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} originalName - Original file name
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} Detected schema with columns and sample data
   */
  async detectSchema(fileBuffer, originalName, options = {}) {
    try {
      const fileExtension = originalName.split('.').pop().toLowerCase();

      if (fileExtension === 'csv') {
        return this.detectCsvSchema(fileBuffer, options);
      } else if (['xlsx', 'xls'].includes(fileExtension)) {
        return this.detectExcelSchema(fileBuffer, options);
      } else {
        throw new AppError('Unsupported file format', 400, 'UNSUPPORTED_FORMAT');
      }
    } catch (error) {
      logger.error(`Schema detection error: ${error.message}`);
      throw error instanceof AppError ? error : new AppError('Schema detection failed', 500, 'SCHEMA_DETECTION_FAILED');
    }
  }

  /**
   * Detect schema from CSV file buffer
   * @param {Buffer} fileBuffer - CSV file buffer
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} Detected schema
   */
  async detectCsvSchema(fileBuffer, options = {}) {
    return new Promise((resolve, reject) => {
      const rows = [];
      const columns = [];
      let rowCount = 0;
      const maxSampleRows = options.maxSampleRows || 10;

      // Create a readable stream from buffer
      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null);

      bufferStream
        .pipe(csv({
          skipLines: options.skipLines || 0,
          headers: options.hasHeaders !== false, // Default to true
          trim: true
        }))
        .on('headers', (headers) => {
          // Process headers to create initial column structures
          headers.forEach(header => {
            columns.push({
              name: header,
              type: 'unknown',
              description: '',
              examples: []
            });
          });
        })
        .on('data', (row) => {
          rowCount++;

          // Only collect sample rows up to maxSampleRows
          if (rows.length < maxSampleRows) {
            rows.push(row);
          }

          // Update column types and examples
          this._updateColumnInfo(columns, row);
        })
        .on('end', () => {
          resolve({
            columns,
            rowCount,
            sampleData: rows
          });
        })
        .on('error', (error) => {
          logger.error(`CSV parsing error: ${error.message}`);
          reject(new AppError('CSV parsing failed', 500, 'CSV_PARSE_ERROR'));
        });
    });
  }

  /**
   * Detect schema from Excel file buffer
   * @param {Buffer} fileBuffer - Excel file buffer
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} Detected schema
   */
  async detectExcelSchema(fileBuffer, options = {}) {
    try {
      // Parse Excel file
      const sheets = xlsx.parse(fileBuffer, {
        cellDates: true,
        sheetStubs: true
      });

      // Get the first sheet or the specified sheet
      const sheetIndex = options.sheetIndex || 0;
      if (!sheets[sheetIndex]) {
        throw new AppError('Sheet not found', 400, 'SHEET_NOT_FOUND');
      }

      const sheet = sheets[sheetIndex];
      const { data } = sheet;

      if (!data || data.length === 0) {
        throw new AppError('Empty sheet', 400, 'EMPTY_SHEET');
      }

      const hasHeaders = options.hasHeaders !== false; // Default to true
      const startRow = (hasHeaders ? 1 : 0) + (options.skipLines || 0);
      const maxSampleRows = options.maxSampleRows || 10;

      // Get headers
      const headerRow = data[hasHeaders ? 0 : 0];
      const columns = headerRow.map((header, index) => ({
        name: header?.toString() || `Column ${index + 1}`,
        type: 'unknown',
        description: '',
        examples: []
      }));

      // Process rows
      const rows = [];

      for (let i = startRow; i < data.length && rows.length < maxSampleRows; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        // Create row object
        const rowObj = {};
        headerRow.forEach((header, index) => {
          const columnName = header?.toString() || `Column ${index + 1}`;
          rowObj[columnName] = row[index];
        });

        rows.push(rowObj);

        // Update column info
        this._updateColumnInfo(columns, rowObj);
      }

      return {
        columns,
        rowCount: data.length - (hasHeaders ? 1 : 0),
        sampleData: rows,
        sheets: sheets.map(s => s.name) // Include sheet names
      };
    } catch (error) {
      logger.error(`Excel parsing error: ${error.message}`);
      throw error instanceof AppError ? error : new AppError('Excel parsing failed', 500, 'EXCEL_PARSE_ERROR');
    }
  }

  /**
   * Update column information based on row data
   * @param {Array} columns - Column array to update
   * @param {Object} row - Row data
   * @private
   */
  _updateColumnInfo(columns, row) {
    columns.forEach(column => {
      const value = row[column.name];

      // Skip null or undefined values
      if (value === null || value === undefined) return;

      // Add example if not already present (max 3 examples)
      if (column.examples.length < 3 && value !== '' && !column.examples.includes(value)) {
        column.examples.push(value);
      }

      // Update column type if currently unknown
      if (column.type === 'unknown') {
        column.type = this._detectValueType(value);
      } else if (column.type !== 'string') {
        // If current value doesn't match the detected type, default to string
        const currentType = this._detectValueType(value);
        if (currentType !== column.type && value !== '') {
          column.type = 'string';
        }
      }
    });
  }

  /**
   * Detect data type of a value
   * @param {any} value - Value to detect type
   * @returns {string} Detected type ('string', 'number', 'boolean', 'date', or 'unknown')
   * @private
   */
  _detectValueType(value) {
    if (value === null || value === undefined || value === '') {
      return 'unknown';
    }

    // Check if date
    if (value instanceof Date) {
      return 'date';
    }

    // Check if string that looks like a date
    if (typeof value === 'string') {
      // Simple date pattern check (can be expanded for more formats)
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
        /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/DD/YYYY or DD/MM/YYYY
        /^\d{1,2}-\d{1,2}-\d{4}$/, // MM-DD-YYYY or DD-MM-YYYY
        /^\d{1,2}\.\d{1,2}\.\d{4}$/ // MM.DD.YYYY or DD.MM.YYYY
      ];

      for (const pattern of datePatterns) {
        if (pattern.test(value)) {
          // Validate it's actually a valid date
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return 'date';
          }
        }
      }
    }

    // Check if boolean
    if (typeof value === 'boolean' ||
        (typeof value === 'string' && ['true', 'false', 'yes', 'no'].includes(value.toLowerCase()))) {
      return 'boolean';
    }

    // Check if number
    if (typeof value === 'number' ||
        (typeof value === 'string' && !isNaN(value) && !isNaN(parseFloat(value)))) {
      return 'number';
    }

    // Default to string
    return 'string';
  }
}

// Export a singleton instance
module.exports = new SchemaDetector();