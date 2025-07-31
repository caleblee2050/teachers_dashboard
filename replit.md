# 해밀 AI Edu Assistant - Teacher's AI Educational Content Platform

## Overview

해밀 AI Edu Assistant is a full-stack web application designed to help teachers create and manage AI-generated educational content. The platform allows educators to upload educational materials (PDF, DOCX, PPTX, TXT) and automatically generate summaries, quizzes, and study guides using AI technology. The application supports multiple languages including Korean, English, Chinese, Thai, Vietnamese, and Filipino.

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

- January 11, 2025. Production deployment Google OAuth configuration guide
  - Created comprehensive GOOGLE_OAUTH_DEPLOYMENT_SETUP.md with step-by-step setup instructions
  - Documented required Google Cloud Console API activations and OAuth client setup
  - Listed all necessary environment variables for production deployment
  - Provided domain-specific redirect URI configurations for Replit Deployments
  - Included troubleshooting guide for common OAuth configuration issues
  - Added security considerations and best practices for production environment
- January 11, 2025. App name change to 해밀 AI Edu Assistant
  - Updated AppHeader component to display new Korean app name
  - Modified README.md title and description
  - Updated replit.md project title
  - Added page title to client/index.html for browser tab display
  - Maintained all existing functionality with new branding
- January 11, 2025. Complete deployment and update workflow documentation
  - Created comprehensive DEPLOYMENT_GUIDE.md with full deployment and update procedures
  - Documented Replit Deployments setup and configuration process
  - Added detailed update workflows for features, bug fixes, and hotfixes
  - Implemented semantic versioning strategy with proper tagging procedures
  - Created database migration guidelines and rollback procedures
  - Added CI/CD automation setup with GitHub Actions integration
  - Documented monitoring, logging, and troubleshooting procedures
  - Included comprehensive checklists for deployment verification
- January 11, 2025. GitHub repository setup and version control preparation
  - Created comprehensive .gitignore file with all necessary exclusions
  - Added detailed README.md with project overview, features, and technical documentation
  - Created GITHUB_SETUP.md guide for repository connection and Git workflow
  - Prepared project for version control with proper file structure documentation
  - Added commit message conventions and branch protection recommendations
  - Documented CI/CD setup guidelines for automated testing and deployment
- July 08, 2025. Comprehensive Google Classroom assignment management system
  - Enhanced ClassroomSyncDialog with full CRUD operations for classroom assignments
  - Added inline editing capability for assignment titles and descriptions
  - Implemented real-time assignment updates using Google Classroom API
  - Added refresh functionality for synchronizing latest assignment data
  - Enhanced UI with color-coded action buttons: orange for edit, green for save, red for delete
  - Integrated comprehensive assignment management workflow with proper error handling
  - Added proper state management for editing modes and data validation
  - Implemented seamless assignment viewing through direct Google Classroom links
- July 08, 2025. Gemini API key integration and TTS model fix
  - Added GEMINI_API_KEY environment variable for direct Gemini API access
  - Fixed TTS model selection to use correct preview models: gemini-2.5-pro-preview-tts and gemini-2.5-flash-preview-tts
  - Updated error handling to show clear quota exceeded messages without fallback actions
  - Resolved "Model does not support requested modality: AUDIO" error by using proper TTS-enabled models
  - Enhanced podcast generation workflow to handle API quota limits gracefully
- July 08, 2025. Gemini share link implementation and UI improvements
  - Investigated and documented Gemini Files API limitations for direct share link generation
  - Confirmed g.co/gemini/share links are only available through Gemini Apps web interface, not API
  - Enhanced Gemini file upload notifications with file ID display and detailed instructions
  - Improved user guidance for creating shareable links through AI Studio conversation workflow
  - Updated Google Classroom upload title format with proper date formatting and language prefixes
  - Maintained functional podcast audio playback while removing non-working download buttons
- July 07, 2025. Educational content upload formatting and podcast UI cleanup
  - Updated Google Classroom upload title format: 오늘날짜+파일명+예습자료 with language prefixes
  - Removed local podcast download buttons that were not working correctly
  - Simplified podcast UI to show only audio player when available, removed TTS buttons
  - Changed Gemini file buttons to redirect to Gemini Studio instead of direct download (due to 403 errors)
  - Enhanced classroom assignment titles with proper date formatting and language identification
  - Improved user guidance for accessing Gemini-hosted podcast files through AI Studio
- July 07, 2025. Podcast UI improvements and direct playback removal
  - Removed all direct playback buttons as they were not working properly
  - Replaced "직접 재생" buttons with "다운로드" buttons for local file download
  - Enhanced Gemini download/share buttons to use proper file download URLs with ?alt=media parameter
  - Fixed 413 error in Gemini file sharing by converting file URLs to download format
  - Improved button labels and functionality for better user experience
  - Maintained TTS (text-to-speech) functionality for script reading
- July 07, 2025. Gemini podcast sharing fix and batch classroom upload improvements
  - Fixed podcast sharing to use Gemini Files API URI instead of Google Drive links
  - Modified generatePodcastAudio to properly return geminiFileLink from Gemini Files API
  - Removed Google Drive upload override that was replacing Gemini file links
  - Enhanced BatchClassroomUploadDialog with improved error handling for 401/403 authentication errors
  - Added detailed error messages for failed uploads with specific error reasons
  - Implemented proper Content-Type headers for batch upload API requests
- July 07, 2025. Batch classroom upload feature and language-specific uploads
  - Created BatchClassroomUploadDialog component for bulk Google Classroom uploads
  - Added "선택된 항목 일괄 업로드" button for multiple content items at once
  - Implemented language-specific classroom upload labels in 7 languages (Korean, English, Japanese, Chinese, Thai, Vietnamese, Filipino)
  - Added language prefix to uploaded file names for non-Korean content ([EN], [JA], etc.)
  - Enhanced GoogleClassroomService with getLanguageLabels function for multilingual support
  - Enabled batch processing with individual item progress tracking and success/failure reporting
- July 07, 2025. Gemini Files API integration for direct podcast sharing
  - Integrated Gemini Files API to upload generated audio files directly to Gemini's file system
  - Added "제미나이에서 다운로드/공유" purple button to access Gemini-hosted audio files
  - Replaced Google Drive upload with Gemini's native file hosting and sharing system
  - Enhanced geminiFileLink property in PodcastContent interface for direct file access
  - Implemented fallback to local streaming URL when Gemini Files API is unavailable
  - Leveraged Gemini's built-in file management for seamless audio sharing experience
- July 07, 2025. Podcast streaming and classroom assignment-only upload implementation
  - Added direct audio streaming endpoint `/api/podcast/stream/:filename` for podcast playback
  - Implemented HTML5 audio player with streaming support for podcasts
  - Added direct playback buttons (green "직접 재생" and "새 탭에서 재생") for podcast content
  - Modified Google Classroom uploads to target assignments only (workType: 'ASSIGNMENT')
  - Added podcast audio player to full content dialog modal
  - Fixed Google Drive upload issues with proper ES module imports
  - Enhanced podcast UI with multiple playback options: download, stream, and Google Drive
- July 07, 2025. Complete content generation workflow restructure
  - Removed podcast generation checkbox from integrated content creation
  - Fixed "전체 내용 보기" dialog to properly display generated content with formatted JSX
  - Implemented automatic txt file creation and Google Drive storage for generated content  
  - Enhanced podcast generation to use structured content text instead of raw file content
  - Added convertContentToText function for proper content formatting in txt files
  - Updated Google Classroom upload to use simple text insertion method instead of file uploads
  - Removed all includePodcast references and created modular content generation approach
- July 07, 2025. UI cleanup and podcast download feature implementation
  - Removed AI content generation page as requested by user due to dashboard content mismatch
  - Removed Google Docs creation functionality and buttons (was causing 500 errors)
  - Removed PDF download buttons and generation functionality from UI
  - Added podcast audio download feature with purple download button for podcast content
  - Cleaned up duplicate Google Classroom upload buttons - kept only one per content item
  - Enhanced Google Classroom upload debugging with detailed assignment creation logs
  - Fixed TypeScript errors in ClassroomUploadResult interface
  - Confirmed podcast files are being generated successfully in uploads/ directory
- July 07, 2025. Google Docs API integration and PDF download cleanup
  - Fixed Google Docs creation by adding 'https://www.googleapis.com/auth/documents' scope to OAuth
  - Removed PDF download functionality from AI content page to simplify interface
  - Enhanced error logging for Google Docs creation debugging
  - Cleaned up unused PDF-related mutations and functions
- July 05, 2025. Critical bug fixes and infrastructure improvements
  - Fixed Google Classroom synchronization page undefined property errors with comprehensive null safety
  - Resolved PDF generation type errors in podcast script generation routes
  - Enhanced podcast button activation logic with optional chaining for better data safety
  - Added debugging information display for podcast content troubleshooting
  - Improved error handling across classroom sync and content generation workflows
  - Added new "Classroom 동기화" navigation menu item for better user access
- July 04, 2025. Integrated content generation workflow with PDF and audio upload to Google Classroom
  - Implemented complete 6-step workflow: content generation → PDF creation → Gemini upload → podcast generation → file collection → classroom upload
  - Enhanced Gemini integration to accept PDF files for high-quality audio generation using gemini-2.0-flash-exp model
  - Added comprehensive file upload system for Google Classroom (text, PDF, and audio files)
  - Improved podcast generation to use both script and PDF content for better quality
  - Added multi-file attachment support for Google Classroom assignments
  - Enhanced assignment descriptions to list all attached file types (text, PDF, audio)
  - Fixed audio generation using Gemini's AUDIO responseModalities with Aoede voice
  - Added comprehensive PDF export feature for individual and batch content download
  - Implemented jsPDF-based PDF generation with proper Korean text support
  - Created ZIP file packaging for batch downloads with archiver library
  - Enhanced PDF export UI with dedicated download controls in AI content page
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