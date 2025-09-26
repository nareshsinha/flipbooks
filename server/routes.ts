import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { insertDocumentSchema, insertPageSchema } from "@shared/schema";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Upload PDF and process pages
  app.post("/api/documents/upload", upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { title } = req.body;
      if (!title) {
        return res.status(400).json({ message: "Title is required" });
      }

      // For now, simulate PDF processing with sample pages
      // In production, this would use PDF2pic or similar library
      const pageCount = Math.floor(Math.random() * 15) + 10; // 10-24 pages

      const document = await storage.createDocument({
        title,
        filename: req.file.originalname,
        pageCount
      });

      // Create sample pages (in production, extract actual PDF pages)
      const pages = [];
      for (let i = 1; i <= pageCount; i++) {
        const page = await storage.createPage({
          documentId: document.id,
          pageNumber: i,
          imageUrl: `/api/pages/${document.id}/${i}/image`,
          thumbnailUrl: `/api/pages/${document.id}/${i}/thumbnail`
        });
        pages.push(page);
      }

      // Clean up uploaded file
      await fs.unlink(req.file.path);

      res.json({ document, pages });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Failed to process PDF" });
    }
  });

  // Get document by ID
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const pages = await storage.getPagesByDocument(document.id);
      res.json({ document, pages });
    } catch (error) {
      res.status(500).json({ message: "Failed to get document" });
    }
  });

  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to get documents" });
    }
  });

  // Serve page images (mock implementation)
  app.get("/api/pages/:documentId/:pageNumber/image", (req, res) => {
    // In production, serve actual processed page images
    const sampleImages = [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&h=600&fit=crop"
    ];
    
    const pageNumber = parseInt(req.params.pageNumber);
    const imageIndex = (pageNumber - 1) % sampleImages.length;
    res.redirect(sampleImages[imageIndex]);
  });

  // Serve page thumbnails (mock implementation)
  app.get("/api/pages/:documentId/:pageNumber/thumbnail", (req, res) => {
    const sampleImages = [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=150&fit=crop",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&h=150&fit=crop",
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&h=150&fit=crop",
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=200&h=150&fit=crop",
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=200&h=150&fit=crop"
    ];
    
    const pageNumber = parseInt(req.params.pageNumber);
    const imageIndex = (pageNumber - 1) % sampleImages.length;
    res.redirect(sampleImages[imageIndex]);
  });

  const httpServer = createServer(app);
  return httpServer;
}
