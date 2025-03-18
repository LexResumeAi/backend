# LexAI Resume Builder Backend Documentation

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Services](#services)
6. [Integration with React Native](#integration-with-react-native)
7. [Environment Configuration](#environment-configuration)
8. [Deployment Guide](#deployment-guide)
9. [Error Handling](#error-handling)
10. [Security Considerations](#security-considerations)

## Overview

The LexAI Resume Builder backend is a Node.js application built with Express.js and TypeScript. It provides a RESTful API for creating, managing, and generating professional resumes. The system integrates with a Prisma ORM for database operations and uses several services for PDF generation and email delivery.

### Key Features

- Resume creation and management
- PDF generation with customizable templates
- Email delivery of generated resumes
- Comprehensive error handling
- Stateless architecture for scalability

## System Architecture

The backend follows a modular architecture with clear separation of concerns:

```
├── controllers/        # Request handlers
├── models/             # Data models (via Prisma)
├── routes/             # API route definitions
├── services/           # Business logic and external services
│   ├── emailService.ts # Email sending functionality
│   └── pdfGenerator.ts # PDF generation using Puppeteer
├── resources/          # Templates and static resources
├── public/             # Public assets and generated files
│   └── generated/      # Generated PDF files
└── index.ts            # Application entry point
```

### Technology Stack

- **Node.js & Express.js**: Core server framework
- **TypeScript**: For type safety and better development experience
- **Prisma**: ORM for database operations
- **Puppeteer**: Headless browser for PDF generation
- **Handlebars**: Templating engine for resume HTML generation
- **Nodemailer**: Email service integration
- **UUID**: Unique identifier generation

## API Endpoints

All API routes are prefixed with `/api/resumes`.

| Method | Endpoint     | Description                 | Request Body                                                      | Response                                 |
| ------ | ------------ | --------------------------- | ----------------------------------------------------------------- | ---------------------------------------- |
| POST   | `/`          | Create a new resume         | Resume data (see [Resume Data Structure](#resume-data-structure)) | Created resume object with PDF URL       |
| GET    | `/`          | Get all resumes             | -                                                                 | Array of resume objects                  |
| GET    | `/:id`       | Get resume by ID            | -                                                                 | Single resume object with formatted data |
| GET    | `/:id/pdf`   | Download resume as PDF      | -                                                                 | PDF file                                 |
| POST   | `/:id/email` | Resend resume PDF via email | -                                                                 | Success/error message                    |
| PUT    | `/:id`       | Update a resume             | Resume data                                                       | Updated resume object                    |
| DELETE | `/:id`       | Delete a resume             | -                                                                 | Success message                          |

### Resume Data Structure

```typescript
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
```

## Data Models

The application uses Prisma ORM to interact with the database. The primary model is the `Resume` model, which stores all user resume data.

### Resume Model

The database schema includes the following fields:

- `id`: Unique identifier (UUID)
- `firstName`, `lastName`, `email`: Basic personal details
- `phone`, `location`, `portfolioUrl`, `linkedinUrl`: Optional contact information
- `objective`: Career objective statement
- `yearsExperience`: Optional years of experience
- `desiredRoles`: Comma-separated list of desired roles
- `educationJson`, `skillsJson`, `experienceJson`, `projectsJson`: Complex nested structures stored as JSON
- `extraCurricularJson`, `leadershipJson`: Optional sections stored as JSON
- `pdfFilename`: The generated PDF filename
- `createdAt`, `updatedAt`: Timestamps

## Services

### PDF Generator Service

The PDF generator service uses Puppeteer, a headless Chrome browser, to convert an HTML template into a professionally formatted PDF document.

Key functionality:

- HTML template processing with Handlebars
- Dynamic data binding
- Consistent PDF layout and styling
- Unique filename generation with UUID

### Email Service

The email service uses Nodemailer to send the generated resume PDF to the user's email address.

Key functionality:

- SMTP configuration from environment variables
- HTML email template
- PDF attachment handling
- Error handling and logging

## Integration with React Native

### API Communication

The React Native frontend communicates with the backend through RESTful API calls. Here's how to implement the integration:

```javascript
// Example API service in React Native
import axios from "axios";

const API_BASE_URL = "https://your-api-domain.com/api/resumes";

export const resumeService = {
  // Create a new resume
  createResume: async (resumeData) => {
    try {
      const response = await axios.post(API_BASE_URL, resumeData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get a resume by ID
  getResumeById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Download resume PDF (returns a URL)
  getResumePdfUrl: (id) => {
    return `${API_BASE_URL}/${id}/pdf`;
  },

  // Other API methods...
};
```

### Handling File Downloads

For PDF downloads in React Native, you'll need to use a library like `react-native-blob-util`:

```javascript
import RNBlobUtil from "react-native-blob-util";
import { Platform, PermissionsAndroid } from "react-native";

export const downloadResumePdf = async (resumeId, firstName, lastName) => {
  // Request storage permission on Android
  if (Platform.OS === "android") {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error("Storage permission denied");
    }
  }

  const fileName = `${firstName}_${lastName}_Resume.pdf`;
  const downloadPath =
    Platform.OS === "ios"
      ? RNBlobUtil.fs.dirs.DocumentDir
      : RNBlobUtil.fs.dirs.DownloadDir;

  return RNBlobUtil.config({
    fileCache: true,
    path: `${downloadPath}/${fileName}`,
    addAndroidDownloads: {
      useDownloadManager: true,
      notification: true,
      title: fileName,
      description: "Downloading resume PDF",
      mime: "application/pdf",
    },
  }).fetch("GET", `${API_BASE_URL}/${resumeId}/pdf`);
};
```

## Environment Configuration

The backend requires several environment variables to be configured. Create a `.env` file in the root directory with the following variables:

```
# Server Configuration
PORT=5000

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/resumebuilder"

# Email Configuration
SMTP_HOST=mail.example.com
SMTP_PORT=465
INFO_EMAIL=contact@example.com
INFO_MAIL_AUTH=your_password_here

# Other Configuration
NODE_ENV=development
```

## Deployment Guide

### Prerequisites

- Node.js 14+ installed
- PostgreSQL database
- SMTP email service

### Deployment Steps

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-repo/lexai-backend.git
   cd lexai-backend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file as described in the [Environment Configuration](#environment-configuration) section.

4. **Set up the database**:

   ```bash
   npx prisma migrate deploy
   ```

5. **Build the application**:

   ```bash
   npm run build
   ```

6. **Start the server**:
   ```bash
   npm start
   ```

### Docker Deployment

For containerized deployment, a Dockerfile is included:

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

Build and run the Docker container:

```bash
docker build -t lexai-backend .
docker run -p 5000:5000 --env-file .env lexai-backend
```

## Error Handling

The backend implements comprehensive error handling with detailed error messages and appropriate HTTP status codes:

- **400 Bad Request**: Invalid input data
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side errors

All errors include a descriptive message and, when appropriate, additional details to help debug the issue.

Example error response:

```json
{
  "error": "Failed to create resume",
  "details": "Personal details are required"
}
```

## Security Considerations

### Input Validation

All input data is validated before processing to prevent injection attacks and other security vulnerabilities.

### File Security

- Generated PDFs are stored with unique UUIDs to prevent filename guessing
- File access requires proper authentication and authorization
- Files are served with proper content-type headers

### Email Security

- SMTP connections use TLS/SSL encryption
- Email credentials are stored as environment variables, not in the codebase
- Email HTML is sanitized to prevent XSS attacks

### API Security Recommendations

When integrating with React Native:

1. Implement authentication (JWT recommended)
2. Use HTTPS for all API requests
3. Implement rate limiting to prevent abuse
4. Sanitize all user input on both client and server side
5. Consider implementing API key validation for mobile clients
