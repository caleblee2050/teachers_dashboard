-- Teachers Dashboard Database Schema
-- Created for Supabase PostgreSQL
-- Execute this in Supabase SQL Editor

-- 1. Sessions table (for authentication)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions(expire);

-- 2. Users table (teachers)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY NOT NULL,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  access_token TEXT,
  refresh_token TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Files table (uploaded documents)
CREATE TABLE IF NOT EXISTS files (
  id VARCHAR PRIMARY KEY NOT NULL,
  teacher_id VARCHAR NOT NULL REFERENCES users(id),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  extracted_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Generated content table (AI-generated content)
CREATE TABLE IF NOT EXISTS generated_content (
  id VARCHAR PRIMARY KEY NOT NULL,
  file_id VARCHAR NOT NULL REFERENCES files(id),
  teacher_id VARCHAR NOT NULL REFERENCES users(id),
  content_type TEXT NOT NULL,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  share_token VARCHAR UNIQUE,
  folder_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Students table (students managed by teachers)
CREATE TABLE IF NOT EXISTS students (
  id VARCHAR PRIMARY KEY NOT NULL,
  teacher_id VARCHAR NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_files_teacher_id ON files(teacher_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_teacher_id ON generated_content(teacher_id);
CREATE INDEX IF NOT EXISTS idx_generated_content_file_id ON generated_content(file_id);
CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);

-- Verify tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
