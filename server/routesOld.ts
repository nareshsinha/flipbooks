import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import pdf from "pdf-parse";
import express from "express";
import { insertDocumentSchema, insertPageSchema } from "@shared/schema";

// Configure multer with better error handling
const storageConfig = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create uploads directory if it doesn't exist
    const uploadDir = 'uploads/';
    fs.mkdir(uploadDir, { recursive: true }).then(() => {
      cb(null, uploadDir);
    }).catch(err => {
      cb(err, uploadDir);
    });
  },
  filename: function (req, file, cb) {
    // Use original name with timestamp to avoid conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storageConfig,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Only allow one file
  },
  fileFilter: (req, file, cb) => {
    // Check if the file is a PDF
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Function to get page count from PDF
async function getPdfPageCountMain(filePath: string): Promise<number> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.numpages;
  } catch (error) {
    console.error('Error reading PDF:', error);
    throw new Error('Failed to read PDF file');
  }
}


// Function to get page count from PDF
async function getPdfPageCount(filePath: string): Promise<number> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const dataString = dataBuffer.toString('binary');
    
    const countRegex = /\/Count\s+(\d+)/;
    const countMatch = dataString.match(countRegex);
    if (countMatch) {
      return parseInt(countMatch[1]);
    }
    
    const pageRegex = /\/Type\s*\/Page[^s]/g;
    const pageMatches = dataString.match(pageRegex);
    if (pageMatches) {
      return pageMatches.length;
    }
    
    throw new Error('Could not determine page count');
  } catch (error) {
    throw new Error('Failed to read PDF file');
  }
}

// Function to convert PDF pages to images using pdfjs-dist and canvas
async function convertPdfToImages(pdfPath: string, outputDir: string, documentId: string): Promise<{ images: string[], thumbnails: string[] }> {
  try {
    // Dynamic imports
    const pdfjsLib = await import('pdfjs-dist');
    const { createCanvas, loadImage } = await import('canvas');
    
    // Configure pdfjs
    pdfjsLib.GlobalWorkerOptions.workerSrc = await import('pdfjs-dist/build/pdf.worker.min.js?url').then(module => module.default);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(path.join('public', 'thumbnails', documentId), { recursive: true });

    const dataBuffer = await fs.readFile(pdfPath);
    const pdfDoc = await pdfjsLib.getDocument({ data: dataBuffer }).promise;
    
    const images: string[] = [];
    const thumbnails: string[] = [];
    
    console.log(`Converting ${pdfDoc.numPages} pages to images...`);

    for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
      try {
        console.log(`Converting page ${pageNumber}...`);
        
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
        
        // Create canvas for main image
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        // Save main image
        const imageBuffer = canvas.toBuffer('image/png', { compressionLevel: 6, filters: canvas.PNG_FILTER_NONE });
        const imagePath = path.join(outputDir, `page-${pageNumber}.png`);
        await fs.writeFile(imagePath, imageBuffer);
        
        // Create thumbnail (25% of original size)
        const thumbCanvas = createCanvas(Math.floor(viewport.width * 0.25), Math.floor(viewport.height * 0.25));
        const thumbContext = thumbCanvas.getContext('2d');
        
        // Draw scaled down version
        thumbContext.drawImage(canvas, 0, 0, viewport.width, viewport.height, 0, 0, thumbCanvas.width, thumbCanvas.height);
        
        const thumbBuffer = thumbCanvas.toBuffer('image/png', { compressionLevel: 6 });
        const thumbPath = path.join('public', 'thumbnails', documentId, `page-${pageNumber}.png`);
        await fs.writeFile(thumbPath, thumbBuffer);

        const imageUrl = `/api/images/${documentId}/${pageNumber}/image`;
        const thumbnailUrl = `/api/images/${documentId}/${pageNumber}/thumbnail`;
        
        images.push(imageUrl);
        thumbnails.push(thumbnailUrl);
        
        console.log(`✅ Successfully converted page ${pageNumber}`);
        
      } catch (pageError) {
        console.error(`❌ Error converting page ${pageNumber}:`, pageError);
        // Continue with other pages even if one fails
        const imageUrl = `/api/images/${documentId}/${pageNumber}/image`;
        const thumbnailUrl = `/api/images/${documentId}/${pageNumber}/thumbnail`;
        images.push(imageUrl);
        thumbnails.push(thumbnailUrl);
      }
    }

    await pdfDoc.destroy();
    return { images, thumbnails };
    
  } catch (error) {
    console.error('Error in PDF to image conversion:', error);
    throw new Error('Failed to convert PDF to images');
  }
}


export async function registerRoutes(app: Express): Promise<Server> {

  // Apply body parsing ONLY to non-file routes
  app.use('/api/documents/upload', express.urlencoded({ extended: true }));
  await fs.mkdir('public/images', { recursive: true });
  await fs.mkdir('public/thumbnails', { recursive: true });

  // Upload PDF and process pages - use manual multer error handling
  app.post("/api/documents/upload", (req, res) => {
    // Use multer manually to handle errors better
    upload.single('pdf')(req, res, async (err) => {
      try {
        // console.log('Upload request received:', {
        //   headers: req.headers,
        //   body: req.body || {}, // Handle undefined body
        //   file: req.file,
        //   files: req.files
        // });

        if (err) {
          //console.error('Multer error:', err);
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({ message: 'File size must be less than 50MB' });
            }
          }
          return res.status(400).json({ message: err.message });
        }

        if (!req.file) {
          // console.log('No file uploaded - checking request details:', {
          //   hasFile: !!req.file,
          //   bodyKeys: req.body ? Object.keys(req.body) : 'no body',
          //   contentType: req.get('Content-Type')
          // });
          return res.status(400).json({ message: "No file uploaded. Please select a PDF file." });
        }

        const { title } = req.body || {};
        if (!title) {
          // Clean up the uploaded file if title is missing
          // await fs.unlink(req.file.path).catch(console.error);
          return res.status(400).json({ message: "Title is required" });
        }

        console.log(`Processing PDF: ${req.file.originalname}, Title: ${title}`);

        // Get actual page count from PDF
        let pageCount: number;
        //try {
        pageCount = await getPdfPageCount(req.file.path);
        console.log(`PDF has ${pageCount} pages`);
        //} catch (error) {
        //   console.error('Failed to read PDF page count:', error);
        //   // Fallback to random page count if PDF reading fails
        //   pageCount = Math.floor(Math.random() * 15) + 10;
        //   console.log(`Using fallback page count: ${pageCount}`);
        // }

        // For now, simulate PDF processing with sample pages
        //const pageCount = Math.floor(Math.random() * 15) + 10; // 10-24 pages
        const document = await storage.createDocument({
          title,
          filename: req.file.originalname,
          pageCount
        });
        console.log(`Total Number of Page's: <<<< ${pageCount}>>>>`);


        // Convert PDF pages to images
        const outputDir = path.join('public', 'images', document.id);
        let imageUrls: string[] = [];
        let thumbnailUrls: string[] = [];
        
        try {
          console.log('Starting PDF to image conversion...');
          const conversionResult = await convertPdfToImages(req.file.path, outputDir, document.id);
          imageUrls = conversionResult.images;
          thumbnailUrls = conversionResult.thumbnails;
          console.log(`✅ Successfully converted ${imageUrls.length} pages`);
        } catch (conversionError) {
          console.error('PDF to image conversion failed:', conversionError);
          // Fallback: create placeholder images
          for (let i = 1; i <= pageCount; i++) {
            imageUrls.push(`/api/images/${document.id}/${i}/image`);
            thumbnailUrls.push(`/api/images/${document.id}/${i}/thumbnail`);
          }
        }



        // Create sample pages
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
        //await fs.unlink(req.file.path).catch(console.error);
        console.log(`✅ Successfully processed document: ${document.id} with ${pageCount} pages`);

        res.json({ document, pages });
      } catch (error) {
        console.error("Upload error:", error);

        // Clean up file if it was uploaded but processing failed
        if (req.file) {
          await fs.unlink(req.file.path).catch(console.error);
        }

        res.status(500).json({
          message: error instanceof Error ? error.message : "Failed to process PDF"
        });
      }
    });
  });

  // Apply JSON parsing to all other API routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
    const sampleImages = [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&h=800&fit=crop"
    ];

    const pageNumber = parseInt(req.params.pageNumber);
    const imageIndex = (pageNumber - 1) % sampleImages.length;
    res.redirect(sampleImages[imageIndex]);
  });

  // Serve page thumbnails (mock implementation)
  app.get("/api/pages/:documentId/:pageNumber/thumbnail", (req, res) => {
    const sampleImages = [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=200&fit=crop",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=150&h=200&fit=crop",
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=150&h=200&fit=crop",
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=150&h=200&fit=crop",
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=150&h=200&fit=crop"
    ];

    const pageNumber = parseInt(req.params.pageNumber);
    const imageIndex = (pageNumber - 1) % sampleImages.length;
    res.redirect(sampleImages[imageIndex]);
  });

  const httpServer = createServer(app);
  return httpServer;
}