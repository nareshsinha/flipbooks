// server/sqlite-storage.ts
 
import { type Document, type InsertDocument, type Page, type InsertPage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  createPage(page: InsertPage): Promise<Page>;
  getPagesByDocument(documentId: string): Promise<Page[]>;
  getDocuments(): Promise<Document[]>;
  getPage?(documentId: string, pageNumber: number): Promise<Page | undefined>;
}

export class MemStorage implements IStorage {
  private documents: Map<string, Document>;
  private pages: Map<string, Page>;

  constructor() {
    this.documents = new Map();
    this.pages = new Map();
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = { 
      ...insertDocument, 
      id, 
      createdAt: new Date() 
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createPage(insertPage: InsertPage): Promise<Page> {
    const id = randomUUID();
    const page: Page = { ...insertPage, id };
    this.pages.set(id, page);
    return page;
  }

  async getPagesByDocument(documentId: string): Promise<Page[]> {
    return Array.from(this.pages.values())
      .filter(page => page.documentId === documentId)
      .sort((a, b) => a.pageNumber - b.pageNumber);
  }

  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const storage = new MemStorage();
