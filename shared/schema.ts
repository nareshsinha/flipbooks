import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { loginSchema, createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  //createdAt: integer("created_at", { mode: 'timestamp' }).notNull(),
});


export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  filename: text("filename").notNull(),
  pageCount: integer("page_count").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pages = pgTable("pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").references(() => documents.id).notNull(),
  pageNumber: integer("page_number").notNull(),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
});

// export const insertDocumentSchema = createInsertSchema(documents).pick({
//   title: true,
//   filename: true,
//   pageCount: true,
// });

// export const insertPageSchema = createInsertSchema(pages).pick({
//   documentId: true,
//   pageNumber: true,
//   imageUrl: true,
//   thumbnailUrl: true,
// });

export const insertDocumentSchema = z.object({
  title: z.string().min(1),
  filename: z.string().min(1),
  pageCount: z.number().int().positive(),
});
export const insertPageSchema = z.object({
  documentId: z.string(),
  pageNumber: z.number().int().positive(),
  imagePath: z.string(), // Store actual image path
  thumbnailPath: z.string(), // Store actual thumbnail path
});

// User Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
// User Login Schema
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginCredentials = z.infer<typeof loginSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;

export interface Document {
  id: string;
  title: string;
  filename: string;
  pageCount: number;
  createdAt: Date;
}
export interface Page {
  id: string;
  documentId: string;
  pageNumber: number;
  imagePath: string;
  thumbnailPath: string;
  createdAt: Date;
}