import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Files uploaded by teachers
export const files = pgTable("files", {
  id: varchar("id").primaryKey().notNull(),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  extractedText: text("extracted_text"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Generated AI content
export const generatedContent = pgTable("generated_content", {
  id: varchar("id").primaryKey().notNull(),
  fileId: varchar("file_id").notNull().references(() => files.id),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  contentType: text("content_type").notNull(), // 'summary', 'quiz', 'study_guide'
  language: text("language").notNull(), // 'ko', 'en'
  title: text("title").notNull(),
  content: jsonb("content").notNull(),
  shareToken: varchar("share_token").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Students managed by teachers
export const students = pgTable("students", {
  id: varchar("id").primaryKey().notNull(),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
});
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export const insertGeneratedContentSchema = createInsertSchema(generatedContent).omit({
  id: true,
  createdAt: true,
});
export type InsertGeneratedContent = z.infer<typeof insertGeneratedContentSchema>;
export type GeneratedContent = typeof generatedContent.$inferSelect;

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
