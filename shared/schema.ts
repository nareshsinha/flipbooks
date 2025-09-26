import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const insertDocumentSchema = createInsertSchema(documents).pick({
  title: true,
  filename: true,
  pageCount: true,
});

export const insertPageSchema = createInsertSchema(pages).pick({
  documentId: true,
  pageNumber: true,
  imageUrl: true,
  thumbnailUrl: true,
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;
