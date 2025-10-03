import Database from 'better-sqlite3';
import { randomUUID } from "crypto";
import { type Document, type InsertDocument, type Page, type InsertPage, type IStorage, type User, type InsertUser} from "./storage";

export class SQLiteStorage implements IStorage {
    private db: Database.Database;

    constructor(dbPath: string = 'flipbook.db') {
        this.db = new Database(dbPath);
        this.initDatabase();
    }

    private initDatabase(): void {
        // Create User table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                email TEXT,
                createdAtDATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Create documents table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                filename TEXT NOT NULL,
                pageCount INTEGER NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        // Create pages table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS pages (
                id TEXT PRIMARY KEY,
                documentId TEXT NOT NULL,
                pageNumber INTEGER NOT NULL,
                imagePath TEXT NOT NULL,
                thumbnailPath TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (documentId) REFERENCES documents (id) ON DELETE CASCADE,
                UNIQUE(documentId, pageNumber)
            )
        `);

        // Create indexes for better performance
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_pages_documentId ON pages (documentId);
            CREATE INDEX IF NOT EXISTS idx_pages_documentId_pageNumber ON pages (documentId, pageNumber);
        `);

        //console.log('✅ SQLite database initialized');
    }
    // User methods
    async getUser(id: string): Promise<User | undefined> {
        //const result = this.db.select().from(users).where(eq(users.id, id)).get();
        const result = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
        return result;
    }

    async getUserByUsername(email: string): Promise<User | undefined> {
        //const result = this.db.select().from(users).where(eq(users.username, username)).get();
        //console.log(email);
        const result = this.db.prepare('SELECT * FROM users WHERE email = ?').get( email ) as any;
        return result;
    }

    async createUser(insertUser: InsertUser): Promise<User> {
        const id = randomUUID();
        const user: User = {
            ...insertUser,
            email: insertUser.email ?? null,
            id,
            createdAt: new Date(),
        };
        //this.db.insert(users).values(user).run();
        const stmt = this.db.prepare(`INSERT INTO users (id, username, password, email, createdAt) VALUES (?, ?, ?, ?) `);
        stmt.run(id, insertUser.username, insertUser.password, insertUser.email);

        return user;
    }

    async createDocument(insertDocument: InsertDocument): Promise<Document> {
        const id = randomUUID();
        const stmt = this.db.prepare(`INSERT INTO documents (id, title, filename, pageCount) VALUES (?, ?, ?, ?) `);
        stmt.run(id, insertDocument.title, insertDocument.filename, insertDocument.pageCount);
        const document = this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
        return {
            ...document,
            createdAt: new Date(document.createdAt)
        };
    }

    async getDocument(id: string): Promise<Document | undefined> {
        const doc = this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
        if (!doc) return undefined;
        return {
            ...doc,
            createdAt: new Date(doc.createdAt)
        };
    }

    async createPage(insertPage: InsertPage): Promise<Page> {
        //console.log(`~~~~~~~~~~~~~~ I AM HERE ~~~~~~~~~~~  `)
        if (!insertPage.imagePath || !insertPage.thumbnailPath) {
            throw new Error(`Invalid paths: imagePath=${insertPage.imagePath}, thumbnailPath=${insertPage.thumbnailPath}`);
        }
        const id = randomUUID();
        const stmt = this.db.prepare(`INSERT INTO pages (id, documentId, pageNumber, imagePath, thumbnailPath) VALUES (?, ?, ?, ?, ?) `); 
        stmt.run(
            id,
            insertPage.documentId,
            insertPage.pageNumber,
            insertPage.imagePath,
            insertPage.thumbnailPath
        );
        //console.log(`${insertPage.documentId} - ${insertPage.pageNumber} - ${insertPage.imagePath} - ${insertPage.thumbnailPath} ~~~~~~~~~~~  `)

        const page = this.db.prepare('SELECT * FROM pages WHERE id = ?').get(id) as any;
        return {
            ...page,
            createdAt: new Date(page.createdAt)
        };
    }

    async getPagesByDocument(documentId: string): Promise<Page[]> {
        const pages = this.db.prepare(` SELECT * FROM pages  WHERE documentId = ?  ORDER BY pageNumber `).all(documentId) as any[];
        return pages.map(page => ({
            ...page,
            createdAt: new Date(page.createdAt)
        }));
    }

    async getDocuments(): Promise<Document[]> {
        const documents = this.db.prepare(` SELECT * FROM documents ORDER BY createdAt DESC `).all() as any[];
        return documents.map(doc => ({
            ...doc,
            createdAt: new Date(doc.createdAt)
        }));
    }

    // Additional method to get a specific page
    async getPage(documentId: string, pageNumber: number): Promise<Page | undefined> {
        const page = this.db.prepare(` SELECT * FROM pages  WHERE documentId = ? AND pageNumber = ? `).get(documentId, pageNumber) as any;
        if (!page) return undefined;
        return {
            ...page,
            createdAt: new Date(page.createdAt)
        };
    }

    // Close database connection
    close(): void {
        this.db.close();
    }
}

export const sqliteStorage = new SQLiteStorage();