// src/services/emailService.ts
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the directory name (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'mail.robertkibet.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const INFO_EMAIL = process.env.INFO_EMAIL || 'contact@robertkibet.com';
const INFO_MAIL_AUTH = process.env.INFO_MAIL_AUTH || '_c!c2NCZ4S[x';

// Create a transporter object
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true, // true for port 465, false for other ports
  auth: {
    user: INFO_EMAIL,
    pass: INFO_MAIL_AUTH,
  },
});

/**
 * Sends the resume PDF to the user's email address
 * @param {string} email - The recipient's email address
 * @param {string} firstName - The recipient's first name
 * @param {string} lastName - The recipient's last name
 * @param {string} pdfPath - The path to the PDF file
 * @returns {Promise<boolean>} - Returns true if email was sent successfully
 */
export const sendResumePDF = async (
  email: string,
  firstName: string,
  lastName: string,
  pdfPath: string
): Promise<boolean> => {
  try {
    // Check if the file exists
    const fullPath = path.resolve(__dirname, '../../public/generated', pdfPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found at path: ${fullPath}`);
      return false;
    }

    // Prepare email content
    const mailOptions = {
      from: `"LexAI Resume Builder" <${INFO_EMAIL}>`,
      to: email,
      subject: `Your Resume is Ready, ${firstName}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${firstName} ${lastName},</h2>
          <p>Thank you for using LexAI Resume Builder! Your resume has been successfully generated.</p>
          <p>Please find your resume attached to this email.</p>
          <p>If you need to make any changes to your resume, you can do so by logging back into our platform.</p>
          <p>Best regards,<br>The LexAI Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `${firstName}_${lastName}_Resume.pdf`,
          path: fullPath,
        },
      ],
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
};

// Verify connection configuration
export const verifyEmailConfiguration = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready to send messages');
    return true;
  } catch (error) {
    console.error('❌ Error verifying email configuration:', error);
    return false;
  }
};