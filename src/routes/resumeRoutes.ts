import express from 'express';
import {
  createResume,
  getAllResumes,
  getResumeById,
  updateResume,
  deleteResume,
  downloadResumePDF,
  resendResumeEmail
} from '../controllers/resumeController.js';

const router = express.Router();

// Create a new resume
router.post('/', createResume);

// Get all resumes
router.get('/', getAllResumes);

// Get a specific resume by ID
router.get('/:id', getResumeById);

// Download resume PDF
router.get('/:id/pdf', downloadResumePDF);

// Resend resume PDF via email
router.post('/:id/email', resendResumeEmail);

// Update a resume
router.put('/:id', updateResume);

// Delete a resume
router.delete('/:id', deleteResume);

export default router;