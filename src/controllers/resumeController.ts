import { Request, Response } from 'express';
import { prisma } from '../index.js';
import { generateResumePDF } from '../services/pdfGenerator.js';
import { sendResumePDF } from '../services/emailService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory name (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ResumeData {
  personalDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    location?: string;
    portfolio?: string;
    linkedin?: string;
  };
  objective: {
    summary: string;
    yearsExperience?: string;
    desiredRoles?: string[];
  };
  education: Array<{
    degree: string;
    university: string;
    graduationYear: string;
    coursework?: string[];
  }>;
  skills: {
    technical: string[];
    soft?: string[];
    additional?: string[];
  };
  experience: Array<{
    jobTitle: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    achievements: string;
  }>;
  projects: Array<{
    title: string;
    description: string;
    link?: string;
  }>;
  extraCurricular?: {
    activities?: string;
    socialLinks?: string[];
  };
  leadership?: {
    role?: string;
    organization?: string;
    responsibilities?: string;
  };
}

export const createResume = async (req: Request, res: Response) => {
  try {
    console.log('📥 Received resume creation request');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    const resumeData: ResumeData = req.body;

    // Basic validation
    if (!resumeData.personalDetails || !resumeData.personalDetails.firstName || 
        !resumeData.personalDetails.lastName || !resumeData.personalDetails.email) {
      console.log('❌ Validation failed: Missing required personal details');
      return res.status(400).json({ error: 'Personal details are required' });
    }
    
    // Generate PDF from resume data
    console.log('🔄 Generating PDF from resume data...');
    let pdfFilename;
    try {
      pdfFilename = await generateResumePDF(resumeData);
    } catch (pdfError) {
      console.error('❌ Failed to generate PDF:', pdfError);
      // Continue with resume creation even if PDF generation fails
    }

    // Create resume record
    const resume = await prisma.resume.create({
      data: {
        firstName: resumeData.personalDetails.firstName,
        lastName: resumeData.personalDetails.lastName,
        email: resumeData.personalDetails.email,
        phone: resumeData.personalDetails.phone || null,
        location: resumeData.personalDetails.location || null,
        portfolioUrl: resumeData.personalDetails.portfolio || null,
        linkedinUrl: resumeData.personalDetails.linkedin || null,
        objective: resumeData.objective.summary,
        yearsExperience: resumeData.objective.yearsExperience || null,
        desiredRoles: resumeData.objective.desiredRoles ? resumeData.objective.desiredRoles.join(', ') : null,
        
        // Store JSON data for complex nested structures
        educationJson: resumeData.education as any,
        skillsJson: resumeData.skills as any,
        experienceJson: resumeData.experience as any,
        projectsJson: resumeData.projects as any,
        extraCurricularJson: resumeData.extraCurricular ? (resumeData.extraCurricular as any) : { dbgenerated: "null" },
        leadershipJson: resumeData.leadership ? (resumeData.leadership as any) : { dbgenerated: "null" },
        
        // Store PDF filename if generated
        pdfFilename: pdfFilename || null
      }
    });

    console.log('✅ Resume created successfully with ID:', resume.id);
    
    // If PDF was generated successfully, send it via email
    let emailSent = false;
    if (pdfFilename) {
      try {
        emailSent = await sendResumePDF(
          resumeData.personalDetails.email,
          resumeData.personalDetails.firstName,
          resumeData.personalDetails.lastName,
          pdfFilename
        );
        console.log(`📧 Email status: ${emailSent ? 'Sent' : 'Failed to send'}`);
      } catch (emailError) {
        console.error('❌ Error sending email:', emailError);
        // Continue even if email fails
      }
    }
    
    res.status(201).json({
      id: resume.id,
      message: 'Resume created successfully',
      data: resume,
      pdfUrl: pdfFilename ? `/generated/${pdfFilename}` : null,
      emailSent
    });
  } catch (error) {
    console.error('❌ Error creating resume:', error);
    res.status(500).json({
      error: 'Failed to create resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getAllResumes = async (req: Request, res: Response) => {
  try {
    console.log('📥 Received request to fetch all resumes');
    
    const resumes = await prisma.resume.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`✅ Successfully fetched ${resumes.length} resumes`);
    
    res.status(200).json(resumes);
  } catch (error) {
    console.error('❌ Error fetching resumes:', error);
    res.status(500).json({
      error: 'Failed to fetch resumes',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getResumeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const resume = await prisma.resume.findUnique({
      where: { id }
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Parse JSON fields
    const formattedResume = {
      ...resume,
      education: resume.educationJson ? JSON.parse(JSON.stringify(resume.educationJson)) : [],
      skills: resume.skillsJson ? JSON.parse(JSON.stringify(resume.skillsJson)) : {},
      experience: resume.experienceJson ? JSON.parse(JSON.stringify(resume.experienceJson)) : [],
      projects: resume.projectsJson ? JSON.parse(JSON.stringify(resume.projectsJson)) : [],
      extraCurricular: resume.extraCurricularJson ? JSON.parse(JSON.stringify(resume.extraCurricularJson)) : null,
      leadership: resume.leadershipJson ? JSON.parse(JSON.stringify(resume.leadershipJson)) : null,
      pdfUrl: resume.pdfFilename ? `/generated/${resume.pdfFilename}` : null
    };

    res.status(200).json(formattedResume);
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({
      error: 'Failed to fetch resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const downloadResumePDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Find the resume
    const resume = await prisma.resume.findUnique({
      where: { id }
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Check if PDF exists
    if (!resume.pdfFilename) {
      // If no PDF exists, generate one
      console.log('🔄 PDF not found, generating new PDF...');
      
      // Parse JSON fields to reconstruct resume data
      const resumeData = {
        personalDetails: {
          firstName: resume.firstName,
          lastName: resume.lastName,
          email: resume.email,
          phone: resume.phone,
          location: resume.location,
          portfolio: resume.portfolioUrl,
          linkedin: resume.linkedinUrl
        },
        objective: {
          summary: resume.objective,
          yearsExperience: resume.yearsExperience,
          desiredRoles: resume.desiredRoles ? resume.desiredRoles.split(', ') : []
        },
        education: resume.educationJson ? JSON.parse(JSON.stringify(resume.educationJson)) : [],
        skills: resume.skillsJson ? JSON.parse(JSON.stringify(resume.skillsJson)) : {},
        experience: resume.experienceJson ? JSON.parse(JSON.stringify(resume.experienceJson)) : [],
        projects: resume.projectsJson ? JSON.parse(JSON.stringify(resume.projectsJson)) : [],
        extraCurricular: resume.extraCurricularJson ? JSON.parse(JSON.stringify(resume.extraCurricularJson)) : null,
        leadership: resume.leadershipJson ? JSON.parse(JSON.stringify(resume.leadershipJson)) : null
      };
      
      // Generate PDF
      const pdfFilename = await generateResumePDF(resumeData);
      
      // Update resume record with PDF filename
      await prisma.resume.update({
        where: { id },
        data: { pdfFilename }
      });
      
      // Set the PDF filename for download
      resume.pdfFilename = pdfFilename;
    }
    
    // Check if the file exists
    const pdfPath = path.resolve(__dirname, '../../public/generated', resume.pdfFilename);
    
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ error: 'PDF file not found' });
    }
    
    // Set content disposition for download
    const fileName = `${resume.firstName}_${resume.lastName}_Resume.pdf`;
    
    // Send the file
    res.download(pdfPath, fileName, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        // Only respond if headers haven't been sent yet
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to download PDF' });
        }
      }
    });
  } catch (error) {
    console.error('Error downloading resume PDF:', error);
    res.status(500).json({
      error: 'Failed to download resume PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const resendResumeEmail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Find the resume
    const resume = await prisma.resume.findUnique({
      where: { id }
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Check if PDF exists
    if (!resume.pdfFilename) {
      return res.status(404).json({ error: 'PDF not generated for this resume' });
    }

    // Send the email
    const emailSent = await sendResumePDF(
      resume.email,
      resume.firstName,
      resume.lastName,
      resume.pdfFilename
    );

    if (emailSent) {
      res.status(200).json({ message: 'Resume PDF sent successfully to your email' });
    } else {
      res.status(500).json({ error: 'Failed to send resume PDF via email' });
    }
  } catch (error) {
    console.error('Error resending resume PDF:', error);
    res.status(500).json({
      error: 'Failed to resend resume PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateResume = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resumeData: ResumeData = req.body;

    // Check if resume exists
    const existingResume = await prisma.resume.findUnique({
      where: { id }
    });

    if (!existingResume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Update resume
    const updatedResume = await prisma.resume.update({
      where: { id },
      data: {
        firstName: resumeData.personalDetails.firstName,
        lastName: resumeData.personalDetails.lastName,
        email: resumeData.personalDetails.email,
        phone: resumeData.personalDetails.phone || null,
        location: resumeData.personalDetails.location || null,
        portfolioUrl: resumeData.personalDetails.portfolio || null,
        linkedinUrl: resumeData.personalDetails.linkedin || null,
        objective: resumeData.objective.summary,
        yearsExperience: resumeData.objective.yearsExperience || null,
        desiredRoles: resumeData.objective.desiredRoles ? resumeData.objective.desiredRoles.join(', ') : null,
        
        // Store JSON data for complex nested structures
        educationJson: resumeData.education as any,
        skillsJson: resumeData.skills as any,
        experienceJson: resumeData.experience as any,
        projectsJson: resumeData.projects as any,
        extraCurricularJson: resumeData.extraCurricular ? (resumeData.extraCurricular as any) : { dbgenerated: "null" },
        leadershipJson: resumeData.leadership ? (resumeData.leadership as any) : { dbgenerated: "null" }
      }
    });

    // Generate a new PDF since the resume has been updated
    let pdfFilename;
    try {
      pdfFilename = await generateResumePDF(resumeData);
      
      // Update the PDF filename in the database
      await prisma.resume.update({
        where: { id },
        data: { pdfFilename }
      });
      
      // Send the updated PDF via email
      const emailSent = await sendResumePDF(
        resumeData.personalDetails.email,
        resumeData.personalDetails.firstName,
        resumeData.personalDetails.lastName,
        pdfFilename
      );
      console.log(`📧 Updated resume email status: ${emailSent ? 'Sent' : 'Failed to send'}`);
    } catch (error) {
      console.error('❌ Error generating or sending updated PDF:', error);
    }

    res.status(200).json({
      message: 'Resume updated successfully',
      data: updatedResume,
      pdfUrl: pdfFilename ? `/generated/${pdfFilename}` : null
    });
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({
      error: 'Failed to update resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteResume = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if resume exists
    const existingResume = await prisma.resume.findUnique({
      where: { id }
    });

    if (!existingResume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Delete the PDF file if it exists
    if (existingResume.pdfFilename) {
      const pdfPath = path.resolve(__dirname, '../../public/generated', existingResume.pdfFilename);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
        console.log(`🗑️ Deleted PDF file: ${existingResume.pdfFilename}`);
      }
    }

    // Delete resume
    await prisma.resume.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({
      error: 'Failed to delete resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};