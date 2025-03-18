import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import resumeRoutes from './routes/resumeRoutes.js';
import { verifyEmailConfiguration } from './services/emailService.js';

// Configure environment variables
dotenv.config();

// Create Express application
const app = express();

// Initialize Prisma client
export const prisma = new PrismaClient();

// Define __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/resumes', resumeRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('LexAI API is running');
});

// Verify email configuration on server start
verifyEmailConfiguration().then((isConfigured) => {
  console.log(isConfigured 
    ? '📧 Email service is properly configured' 
    : '⚠️ Email service is not properly configured, emails may not be sent');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});