import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

// Get the directory name (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Handlebars helpers
Handlebars.registerHelper('formatDate', function(this: any, dateString: string) {
  if (!dateString) return '';
  
  try {
    // Handle different date formats (MM/YYYY or full date string)
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If it's not a valid date, return the original string (e.g., "Present")
      return dateString;
    }
    
    // Format as Month Year (e.g., "January 2023")
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
});

Handlebars.registerHelper('join', function(this: any, array: any[], separator: string) {
  if (!array || !Array.isArray(array)) return '';
  return array.join(separator || ', ');
});

Handlebars.registerHelper('ifEquals', function(this: any, arg1: any, arg2: any, options: Handlebars.HelperOptions) {
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifNotEmpty', function(this: any, value: any, options: Handlebars.HelperOptions) {
  if (value && (typeof value === 'string' && value.trim() !== '') || 
      (Array.isArray(value) && value.length > 0) || 
      (typeof value === 'object' && Object.keys(value).length > 0)) {
    return options.fn(this);
  }
  return options.inverse(this);
});

/**
 * Generate a PDF from resume data
 */
export const generateResumePDF = async (resumeData: any): Promise<string> => {
  try {
    // Load the HTML template
    const templatePath = path.resolve(__dirname, '../resources/resume-template.html');
    const templateHtml = fs.readFileSync(templatePath, 'utf8');
    
    // Compile the template
    const template = Handlebars.compile(templateHtml);
    
    // Prepare data for the template
    const formattedData = {
      ...resumeData,
      personalDetails: {
        ...resumeData.personalDetails,
        fullName: `${resumeData.personalDetails.firstName} ${resumeData.personalDetails.lastName}`
      }
    };
    
    // Generate HTML with the data
    const html = template(formattedData);
    
    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set the HTML content
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });
    
    // Generate a unique filename
    const pdfFilename = `resume_${uuidv4()}.pdf`;
    const pdfPath = path.resolve(__dirname, '../../public/generated', pdfFilename);
    
    // Ensure the directory exists
    const dir = path.dirname(pdfPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Generate PDF
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      printBackground: true,
      preferCSSPageSize: true
    });
    
    // Close the browser
    await browser.close();
    
    console.log(`✅ PDF generated successfully: ${pdfFilename}`);
    
    return pdfFilename;
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};