# EduAI Assistant - Teacher's AI Educational Content Platform

## Overview

EduAI Assistant is a full-stack web application designed to help teachers create and manage AI-generated educational content. The platform allows educators to upload educational materials (PDF, DOCX, PPTX, TXT) and automatically generate summaries, quizzes, and study guides using AI technology. The application supports multiple languages including Korean, English, Chinese, Thai, Vietnamese, and Filipino.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side navigation
- **State Management**: TanStack Query (React Query) for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite for development and production builds
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Replit Auth with OpenID Connect (OIDC)
- **Session Management**: Express sessions with PostgreSQL storage
- **File Processing**: Multer for file uploads with text extraction capabilities
- **AI Integration**: OpenAI API for content generation

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM
- **Session Storage**: PostgreSQL-backed session store
- **File Storage**: Local filesystem with configurable upload directory
- **Schema Management**: Drizzle Kit for migrations and schema evolution

## Key Components

### Authentication System
- **Provider**: Replit Auth integration for secure user authentication
- **Session Management**: Server-side sessions with PostgreSQL persistence
- **User Management**: Complete user profile storage with Google Workspace integration capability

### File Management System
- **Upload Processing**: Multi-format file support (PDF, DOCX, PPTX, TXT)
- **Text Extraction**: Automated content extraction from uploaded documents
- **File Organization**: Teacher-specific file libraries with metadata storage
- **Validation**: File type and size restrictions for security

### AI Content Generation
- **OpenAI Integration**: GPT-4o model for high-quality content generation
- **Content Types**: 
  - Automated summaries with key concepts extraction
  - Interactive quizzes with multiple question types
  - Comprehensive study guides with learning objectives
- **Multi-language Support**: Content generation in 6 languages
- **Customization**: Adjustable content complexity and focus areas

### Student Management
- **Manual Addition**: Direct student email-based registration
- **Google Classroom Integration**: Planned integration for automated student roster sync
- **Content Sharing**: Secure sharing links for generated educational materials

## Data Flow

1. **Authentication**: User authenticates via Replit Auth OIDC flow
2. **File Upload**: Teacher uploads educational materials through drag-and-drop interface
3. **Text Processing**: System extracts text content from uploaded files
4. **AI Generation**: User selects content type and language for AI processing
5. **Content Storage**: Generated content stored with sharing capabilities
6. **Distribution**: Teachers share content with students via secure links

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **openai**: AI content generation services
- **express**: Web server framework
- **@tanstack/react-query**: Client-side data fetching and caching

### UI Components
- **@radix-ui/react-***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **react-hook-form**: Form state management and validation

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **drizzle-kit**: Database schema management
- **@replit/vite-plugin-***: Replit-specific development enhancements

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with hot module replacement
- **Database**: PostgreSQL with environment-based connection string
- **File Storage**: Local filesystem with configurable upload directory
- **Environment Variables**: Secure configuration for API keys and database credentials

### Production Deployment
- **Build Process**: Vite production build with Express server compilation
- **Server Configuration**: Node.js runtime with ESM module support
- **Database Migrations**: Drizzle Kit for schema deployment
- **Static Assets**: Bundled client assets served by Express

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **OPENAI_API_KEY**: AI service authentication
- **SESSION_SECRET**: Secure session encryption key
- **REPL_ID**: Replit environment identification

## Changelog

- July 04, 2025. PDF export functionality and podcast audio generation improvements
  - Added comprehensive PDF export feature for individual and batch content download
  - Implemented jsPDF-based PDF generation with proper Korean text support
  - Created ZIP file packaging for batch downloads with archiver library
  - Enhanced PDF export UI with dedicated download controls in AI content page
  - Improved podcast audio generation with Gemini 2.5 Flash audio capabilities
  - Fixed batch classroom upload content ID processing errors
  - Added red-themed PDF download buttons across content management interfaces
- July 02, 2025. Google Classroom connection and synchronization issues resolved
  - Fixed Google OAuth token storage and retrieval from database
  - Modified user deserialization to include fresh Google tokens from database
  - Resolved 401 authentication errors in classroom sync endpoints
  - Enhanced sync result messaging for empty classrooms
  - Successfully implemented complete Google Classroom integration workflow
  - Removed redundant Google Classroom connection button from student management page to prevent duplicate logins
- July 02, 2025. Google Classroom student synchronization completed
  - Implemented complete Google Classroom student list synchronization
  - Added automatic student import with duplicate detection and prevention
  - Extended database schema to store Google OAuth tokens for Classroom API access
  - Created sync API endpoints with comprehensive error handling
  - Added green "Google 클래스룸 동기화" button to student management page
  - Implemented detailed sync reporting (added/skipped/errors) with user feedback
- July 02, 2025. Button UI improvements across all pages
  - Enhanced all button visibility with color-coded system (blue for primary, red for delete, green for sync)
  - Added clear text labels and icons to all interactive buttons
  - Improved student management page with better delete button styling
  - Standardized button colors and hover states across dashboard, library, and content generator
- July 02, 2025. File upload restrictions and button UI improvements
  - Restricted file uploads to DOCX and TXT files only for reliable text processing
  - Removed PDF support due to extraction reliability issues
  - Added mammoth library for stable DOCX text extraction
  - Improved button visibility with text labels and better colors
  - Enhanced user interface clarity across dashboard and library pages
- July 02, 2025. Google authentication and error handling improvements
  - Modified Google OAuth to show account selection screen instead of direct login
  - Enhanced error handling for Google Classroom API with detailed user guidance
  - Added step-by-step instructions for API activation in Google Cloud Console
  - Improved error messages with specific actions for API not enabled vs permission denied errors
- July 02, 2025. Google Classroom integration added
  - Added Google Classroom API integration for uploading AI-generated content
  - Updated OAuth scopes to include Classroom permissions
  - Created ClassroomUploadDialog component with course selection
  - Added server-side routes for classroom operations
- July 01, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.