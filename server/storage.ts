import {
  users,
  files,
  generatedContent,
  students,
  type User,
  type UpsertUser,
  type File,
  type InsertFile,
  type GeneratedContent,
  type InsertGeneratedContent,
  type Student,
  type InsertStudent,
} from "@shared/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // File operations
  createFile(file: InsertFile): Promise<File>;
  getFilesByTeacher(teacherId: string): Promise<File[]>;
  getFile(id: string): Promise<File | undefined>;
  updateFileText(id: string, extractedText: string): Promise<File | undefined>;
  deleteFile(id: string): Promise<boolean>;
  
  // Generated content operations
  createGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent>;
  getGeneratedContentByFile(fileId: string): Promise<GeneratedContent[]>;
  getGeneratedContentByTeacher(teacherId: string): Promise<GeneratedContent[]>;
  getGeneratedContentByShare(shareToken: string): Promise<GeneratedContent | undefined>;
  
  // Student operations
  createStudent(student: InsertStudent): Promise<Student>;
  getStudentsByTeacher(teacherId: string): Promise<Student[]>;
  deleteStudent(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private files: Map<string, File> = new Map();
  private generatedContent: Map<string, GeneratedContent> = new Map();
  private students: Map<string, Student> = new Map();

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id);
    const user: User = existingUser 
      ? { ...existingUser, ...userData, updatedAt: new Date() }
      : { ...userData, createdAt: new Date(), updatedAt: new Date() } as User;
    
    this.users.set(user.id, user);
    return user;
  }

  // File operations
  async createFile(fileData: InsertFile): Promise<File> {
    const id = nanoid();
    const file: File = {
      ...fileData,
      id,
      createdAt: null,
      extractedText: fileData.extractedText ?? null,
    };
    this.files.set(id, file);
    return file;
  }

  async getFilesByTeacher(teacherId: string): Promise<File[]> {
    return Array.from(this.files.values())
      .filter(file => file.teacherId === teacherId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getFile(id: string): Promise<File | undefined> {
    return this.files.get(id);
  }

  async updateFileText(id: string, extractedText: string): Promise<File | undefined> {
    const file = this.files.get(id);
    if (file) {
      const updatedFile = { ...file, extractedText };
      this.files.set(id, updatedFile);
      return updatedFile;
    }
    return undefined;
  }

  async deleteFile(id: string): Promise<boolean> {
    return this.files.delete(id);
  }

  // Generated content operations
  async createGeneratedContent(contentData: InsertGeneratedContent): Promise<GeneratedContent> {
    const id = nanoid();
    const shareToken = nanoid(16);
    const content: GeneratedContent = {
      ...contentData,
      id,
      shareToken,
      createdAt: new Date(),
    };
    this.generatedContent.set(id, content);
    return content;
  }

  async getGeneratedContentByFile(fileId: string): Promise<GeneratedContent[]> {
    return Array.from(this.generatedContent.values())
      .filter(content => content.fileId === fileId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getGeneratedContentByTeacher(teacherId: string): Promise<GeneratedContent[]> {
    return Array.from(this.generatedContent.values())
      .filter(content => content.teacherId === teacherId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getGeneratedContentByShare(shareToken: string): Promise<GeneratedContent | undefined> {
    return Array.from(this.generatedContent.values())
      .find(content => content.shareToken === shareToken);
  }

  // Student operations
  async createStudent(studentData: InsertStudent): Promise<Student> {
    const id = nanoid();
    const student: Student = {
      ...studentData,
      id,
      createdAt: new Date(),
    };
    this.students.set(id, student);
    return student;
  }

  async getStudentsByTeacher(teacherId: string): Promise<Student[]> {
    return Array.from(this.students.values())
      .filter(student => student.teacherId === teacherId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async deleteStudent(id: string): Promise<boolean> {
    return this.students.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // File operations
  async createFile(fileData: InsertFile): Promise<File> {
    const id = nanoid();
    const [file] = await db
      .insert(files)
      .values({
        ...fileData,
        id,
      })
      .returning();
    return file;
  }

  async getFilesByTeacher(teacherId: string): Promise<File[]> {
    return await db.select().from(files).where(eq(files.teacherId, teacherId));
  }

  async getFile(id: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async updateFileText(id: string, extractedText: string): Promise<File | undefined> {
    const [file] = await db
      .update(files)
      .set({ extractedText })
      .where(eq(files.id, id))
      .returning();
    return file;
  }

  async deleteFile(id: string): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, id));
    return result.rowCount > 0;
  }

  // Generated content operations
  async createGeneratedContent(contentData: InsertGeneratedContent): Promise<GeneratedContent> {
    const id = nanoid();
    const [content] = await db
      .insert(generatedContent)
      .values({
        ...contentData,
        id,
      })
      .returning();
    return content;
  }

  async getGeneratedContentByFile(fileId: string): Promise<GeneratedContent[]> {
    return await db.select().from(generatedContent).where(eq(generatedContent.fileId, fileId));
  }

  async getGeneratedContentByTeacher(teacherId: string): Promise<GeneratedContent[]> {
    return await db.select().from(generatedContent).where(eq(generatedContent.teacherId, teacherId));
  }

  async getGeneratedContentByShare(shareToken: string): Promise<GeneratedContent | undefined> {
    const [content] = await db.select().from(generatedContent).where(eq(generatedContent.shareToken, shareToken));
    return content;
  }

  // Student operations
  async createStudent(studentData: InsertStudent): Promise<Student> {
    const id = nanoid();
    const [student] = await db
      .insert(students)
      .values({
        ...studentData,
        id,
      })
      .returning();
    return student;
  }

  async getStudentsByTeacher(teacherId: string): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.teacherId, teacherId));
  }

  async deleteStudent(id: string): Promise<boolean> {
    const result = await db.delete(students).where(eq(students.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
