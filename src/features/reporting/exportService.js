// /src/features/reporting/exportService.js

const puppeteer = require('puppeteer');
const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');
const config = require('../../core/config');
const logger = require('../../core/logger');
const { AppError } = require('../../core/errorHandler');

/**
 * Service for exporting reports to PDF and image formats
 */
class ExportService {
  constructor() {
    this.initializeStorage();
  }

  /**
   * Initialize Google Cloud Storage client
   */
  initializeStorage() {
    try {
      const options = {};

      if (config.storage.keyFilename) {
        options.keyFilename = config.storage.keyFilename;
      }

      if (config.storage.projectId) {
        options.projectId = config.storage.projectId;
      }

      this.storage = new Storage(options);
      this.bucketName = config.storage.bucketName;
      logger.info('Google Cloud Storage initialized for report exports');
    } catch (error) {
      logger.error(`Failed to initialize storage for exports: ${error.message}`);
    }
  }

  /**
   * Export report to PDF or image format
   * @param {Object} reportData - Report data to export
   * @param {string} format - Export format (pdf, png, jpg)
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result with URL
   */
  async exportReport(reportData, format = 'pdf', options = {}) {
    try {
      // Generate HTML content for report
      const htmlContent = this.generateReportHtml(reportData, options);

      // Launch puppeteer
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
      });

      const page = await browser.newPage();

      // Set content
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
      });

      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: options.quality === 'high' ? 2 : 1
      });

      // Create filename and path
      const fileName = `exports/${reportData.ownerId}/${uuidv4()}.${format}`;

      // Export based on format
      let buffer;

      if (format === 'pdf') {
        buffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
          }
        });
      } else {
        buffer = await page.screenshot({
          type: format,
          fullPage: true,
          quality: format === 'jpg' ? (options.quality === 'high' ? 90 : options.quality === 'low' ? 60 : 80) : undefined
        });
      }

      await browser.close();

      // Upload to cloud storage
      const fileUrl = await this.uploadExport(buffer, fileName, format);

      return {
        fileUrl,
        format,
        exportedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };
    } catch (error) {
      logger.error(`Export error: ${error.message}`);
      throw new AppError('Failed to export report', 500, 'EXPORT_FAILED');
    }
  }

  /**
   * Upload export file to cloud storage
   * @param {Buffer} buffer - File buffer
   * @param {string} fileName - File name
   * @param {string} format - File format
   * @returns {Promise<string>} Public URL of uploaded file
   */
  async uploadExport(buffer, fileName, format) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      // Set appropriate content type
      const contentType = format === 'pdf'
        ? 'application/pdf'
        : format === 'png'
          ? 'image/png'
          : 'image/jpeg';

      // Create write stream with metadata
      const stream = file.createWriteStream({
        metadata: {
          contentType,
          cacheControl: 'public, max-age=31536000'
        },
        resumable: false
      });

      // Upload buffer
      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          logger.error(`Error uploading export: ${error.message}`);
          reject(new AppError('Export upload failed', 500, 'UPLOAD_FAILED'));
        });

        stream.on('finish', async () => {
          // Generate signed URL that expires in 7 days
          const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
          });

          resolve(url);
        });

        stream.end(buffer);
      });
    } catch (error) {
      logger.error(`Export upload error: ${error.message}`);
      throw new AppError('Failed to upload export', 500, 'UPLOAD_FAILED');
    }
  }

  /**
   * Generate HTML content for report
   * @param {Object} reportData - Report data
   * @param {Object} options - Export options
   * @returns {string} HTML content
   */
  generateReportHtml(reportData, options) {
    const { name, description, visualizations = [], insights = [], created } = reportData;
    const { includeInsights = true } = options;

    // Using template literals to create an HTML template for the report
    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${name} - NeuroLedger Report</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
          }
          .report-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
          }
          .report-title {
            font-size: 26px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .report-description {
            font-size: 16px;
            color: #666;
            margin-bottom: 15px;
          }
          .report-date {
            font-size: 14px;
            color: #888;
          }
          .visualization-section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .visualization-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .visualization-description {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
          }
          .visualization-container {
            border: 1px solid #eee;
            border-radius: 5px;
            padding: 15px;
            background-color: #f9f9f9;
            text-align: center;
          }
          .visualization-placeholder {
            height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #888;
            font-style: italic;
          }
          .insights-section {
            margin-top: 40px;
            page-break-before: always;
          }
          .insights-title {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .insight-card {
            background-color: #f5f5f5;
            border-left: 4px solid #4285f4;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 0 4px 4px 0;
          }
          .insight-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
          }
          .insight-content {
            font-size: 14px;
            color: #555;
          }
          .high-importance {
            border-left-color: #ea4335;
          }
          .medium-importance {
            border-left-color: #fbbc05;
          }
          .low-importance {
            border-left-color: #34a853;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #999;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div class="report-title">${name}</div>
          ${description ? `<div class="report-description">${description}</div>` : ''}
          <div class="report-date">Generated on ${new Date(created).toLocaleDateString()} at ${new Date(created).toLocaleTimeString()}</div>
        </div>
    `;

    // Add visualizations
    if (visualizations.length > 0) {
      html += `<div class="visualizations-section">`;

      visualizations.forEach(viz => {
        html += `
          <div class="visualization-section">
            <div class="visualization-title">${viz.title}</div>
            ${viz.description ? `<div class="visualization-description">${viz.description}</div>` : ''}
            <div class="visualization-container">
              <div class="visualization-placeholder">
                [Visualization: ${viz.type}]

                <!-- In a real implementation, we would convert each visualization to an image
                     and embed it directly. For this implementation, we're using placeholders. -->
              </div>
            </div>
          </div>
        `;
      });

      html += `</div>`;
    }

    // Add insights if requested
    if (includeInsights && insights.length > 0) {
      html += `
        <div class="insights-section">
          <div class="insights-title">Key Insights</div>
      `;

      insights.forEach(insight => {
        const importanceClass =
          insight.importance >= 4 ? 'high-importance' :
          insight.importance >= 2 ? 'medium-importance' :
          'low-importance';

        html += `
          <div class="insight-card ${importanceClass}">
            <div class="insight-title">${insight.title}</div>
            <div class="insight-content">${insight.content}</div>
          </div>
        `;
      });

      html += `</div>`;
    }

    // Add footer
    html += `
        <div class="footer">
          <p>Generated by NeuroLedger AI Financial Analytics Platform</p>
        </div>
      </body>
      </html>
    `;

    return html;
  }
}

// Export a singleton instance
module.exports = new ExportService();