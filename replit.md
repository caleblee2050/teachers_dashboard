# 해밀 AI Edu Assistant - Teacher's AI Educational Content Platform

## Overview
해밀 AI Edu Assistant is a full-stack web application designed to empower teachers in creating and managing AI-generated educational content. The platform allows educators to upload diverse educational materials (PDF, DOCX, PPTX, TXT) and automatically generate summaries, quizzes, and study guides using advanced AI technology. It supports a comprehensive set of languages including Korean, English, Chinese, Thai, Vietnamese, and Filipino, aiming to provide a versatile tool for global educators. The project envisions streamlining content creation for teachers, enhancing learning experiences for students, and offering a significant market potential by leveraging AI in education.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with **React** and **TypeScript**, utilizing **Wouter** for client-side routing and **TanStack Query (React Query)** for efficient server state management. Styling is handled by **Tailwind CSS** with **shadcn/ui** components, based on **Radix UI** primitives. **Vite** serves as the build tool for both development and production.

### Backend
The backend runs on **Node.js** with the **Express.js** framework, written in **TypeScript** using ES modules. Authentication is managed via **Replit Auth** (OpenID Connect), with sessions persisted in **PostgreSQL**. File uploads are processed using **Multer**, capable of extracting text from various document formats. **OpenAI API** is integrated for all AI content generation.

### Data Storage
**PostgreSQL** is the primary database, managed with **Drizzle ORM** for type-safe operations and **Drizzle Kit** for schema migrations. Session data is also stored in PostgreSQL. Uploaded files are stored on the local filesystem.

### Key Features and Design Decisions
- **Authentication**: Secure user authentication via Replit Auth, supporting Google Workspace integration.
- **File Management**: Multi-format file upload (PDF, DOCX, PPTX, TXT) with automated text extraction, organized into teacher-specific libraries. Includes file type and size validation.
- **AI Content Generation**: Leverages GPT-4o for high-quality content, including summaries, interactive quizzes, and study guides in 6 languages. Content complexity and focus are customizable.
- **Student Management**: Supports manual student addition and planned integration with Google Classroom for roster syncing. Secure sharing links for generated content.
- **Content Workflow**: A streamlined flow from user authentication, file upload, text processing, AI generation, to content storage and distribution.
- **UI/UX**: Focus on clear, intuitive interfaces with color-coded buttons (e.g., blue for primary, red for delete, green for sync) and standardized styling.
- **Content Creation Workflow**: AI-generated content can be exported as PDFs, streamed as podcasts, and integrated with Google Classroom, supporting batch uploads and language-specific content.

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm**: ORM for database interactions.
- **openai**: AI content generation services.
- **express**: Web server framework.
- **@tanstack/react-query**: Client-side data fetching and caching.

### UI Libraries
- **@radix-ui/react-***: Accessible UI primitives.
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Component variant management.
- **react-hook-form**: Form state management and validation.

### Development & Utilities
- **vite**: Build tool and development server.
- **typescript**: Static type checking.
- **drizzle-kit**: Database schema management.
- **@replit/vite-plugin-***: Replit-specific development enhancements.
- **mammoth**: DOCX text extraction.
- **jsPDF**: PDF generation.
- **archiver**: ZIP file creation.

## Deployment Configuration

### Environment Variables Management
- **Replit Secrets**: Primary storage for all sensitive environment variables in development
- **deployment-config/**: Secure folder containing environment variable files for external deployment
  - `.env.current`: Extracted actual values from Replit Secrets
  - `.env.example`: Template file for new deployments
  - `.env.production`: Production environment template
  - `export-secrets.js`: Script to extract current environment variables
  - Protected by `.gitignore` to prevent GitHub upload

### Required Environment Variables
- **GOOGLE_CLIENT_ID**: Google OAuth client identification
- **GOOGLE_CLIENT_SECRET**: Google OAuth client secret key
- **OPENAI_API_KEY**: AI service authentication
- **GEMINI_API_KEY**: Google Gemini API authentication
- **DATABASE_URL**: PostgreSQL database connection string
- **SESSION_SECRET**: Secure session encryption key
- **NODE_ENV**: Environment mode (development/production)
- **REPL_ID**: Replit environment identification

## Changelog

- January 11, 2025. External deployment environment variables setup
  - Created deployment-config/ folder with complete environment variable files
  - Generated .env.current with actual Replit Secrets values for external deployment
  - Added .env.example and .env.production templates for different environments
  - Implemented export-secrets.js script to extract current environment variables
  - Added deployment-config/ to .gitignore for security (won't be uploaded to GitHub)
  - Created comprehensive deployment instructions for various cloud platforms
  - Included domain-specific configuration guides for external hosting