import type { Express , Request, Response} from "express";
import { createServer, type Server } from "http";
import bcrypt from 'bcryptjs';
//import { storage } from "./storage";
import { sqliteStorage as storage } from "./sqlite-storage";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { authenticateUser, registerUser } from "./auth";
import { loginSchema, insertDocumentSchema, insertPageSchema } from "@shared/schema";
//import { Request, Response } from 'express';


// Simple session storage - in production, use Redis or database
const activeSessions = new Map<string, { userId: number; username: string; expires: number }>();
// Session configuration (24 hours)
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Authentication middleware for upload route only
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const sessionId = req.headers.authorization;
  if (!sessionId || !activeSessions.has(sessionId)) {
    return res.status(401).json({ message: 'Authentication required for uploads' });
  }
  const session = activeSessions.get(sessionId)!;
  // Check session expiration
  if (Date.now() > session.expires) {
    activeSessions.delete(sessionId);
    return res.status(401).json({ message: 'Session expired' });
  }
  // Extend session
  session.expires = Date.now() + SESSION_DURATION;
  req.user = session;
  next();
};

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

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

// Placeholder image creation function
async function createPlaceholderImages(pageCount: number, outputDir: string, documentId: string): Promise<{ images: string[], thumbnails: string[] }> {
  const { createCanvas } = await import('canvas');

  const absoluteImageDir = path.resolve(outputDir);
  const absoluteThumbDir = path.resolve('public', 'thumbnails', documentId);

  await fs.mkdir(absoluteImageDir, { recursive: true });
  await fs.mkdir(absoluteThumbDir, { recursive: true });

  const images: string[] = [];
  const thumbnails: string[] = [];

  for (let i = 1; i <= pageCount; i++) {
    try {
      // Create main image
      const canvas = createCanvas(800, 1000);
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Page ${i}`, canvas.width / 2, canvas.height / 2 - 20);

      ctx.font = '20px Arial';
      ctx.fillText('PDF content will appear here', canvas.width / 2, canvas.height / 2 + 30);

      const imagePath = path.join(absoluteImageDir, `page-${i}.png`);
      await fs.writeFile(imagePath, canvas.toBuffer('image/png'));

      // Create thumbnail
      const thumbCanvas = createCanvas(200, 250);
      const thumbCtx = thumbCanvas.getContext('2d');

      thumbCtx.fillStyle = '#ffffff';
      thumbCtx.fillRect(0, 0, thumbCanvas.width, thumbCanvas.height);

      thumbCtx.fillStyle = '#374151';
      thumbCtx.font = 'bold 16px Arial';
      thumbCtx.textAlign = 'center';
      thumbCtx.fillText(`Page ${i}`, thumbCanvas.width / 2, thumbCanvas.height / 2);

      const thumbPath = path.join(absoluteThumbDir, `page-${i}.png`);
      await fs.writeFile(thumbPath, thumbCanvas.toBuffer('image/png'));

      images.push(`/api/images/${documentId}/${i}/image`);
      thumbnails.push(`/api/images/${documentId}/${i}/thumbnail`);

      console.log(`✅ Created placeholder for page ${i}`);
    } catch (error) {
      console.error(`❌ Error creating placeholder for page ${i}:`, error);
      images.push(`/api/images/${documentId}/${i}/image`);
      thumbnails.push(`/api/images/${documentId}/${i}/thumbnail`);
    }
  }

  return { images, thumbnails };
}

// Function to convert PDF pages to images using pdfjs-dist legacy build
async function convertPdfToImages1(pdfPath: string, outputDir: string, documentId: string): Promise<{ images: string[], thumbnails: string[] }> {
  try {
    // Use the legacy build for Node.js
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
    const { createCanvas } = await import('canvas');

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(path.join('public', 'thumbnails', documentId), { recursive: true });

    const dataBuffer = await fs.readFile(pdfPath);

    // Initialize PDF.js
    const pdfDoc = await pdfjsLib.getDocument({ data: dataBuffer }).promise;

    const images: string[] = [];
    const thumbnails: string[] = [];

    console.log(`Converting ${pdfDoc.numPages} pages to images...`);

    for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
      try {
        console.log(`Converting page ${pageNumber}...`);

        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });

        // Create canvas for main image
        const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
        const context = canvas.getContext('2d');

        // Prepare canvas for rendering
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Render PDF page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        await page.render(renderContext).promise;

        // Save main image
        const imagePath = path.join(outputDir, `page-${pageNumber}.png`);
        const imageBuffer = canvas.toBuffer('image/png');
        await fs.writeFile(imagePath, imageBuffer);

        // Create thumbnail (25% of original size)
        const thumbWidth = Math.floor(viewport.width * 0.25);
        const thumbHeight = Math.floor(viewport.height * 0.25);
        const thumbCanvas = createCanvas(thumbWidth, thumbHeight);
        const thumbContext = thumbCanvas.getContext('2d');

        // Draw scaled down version
        thumbContext.drawImage(canvas, 0, 0, viewport.width, viewport.height, 0, 0, thumbWidth, thumbHeight);

        const thumbPath = path.join('public', 'thumbnails', documentId, `page-${pageNumber}.png`);
        await fs.writeFile(thumbPath, thumbCanvas.toBuffer('image/png'));

        const imageUrl = `/api/images/${documentId}/${pageNumber}/image`;
        const thumbnailUrl = `/api/images/${documentId}/${pageNumber}/thumbnail`;

        images.push(imageUrl);
        thumbnails.push(thumbnailUrl);

        //console.log(`✅ Successfully converted page ${pageNumber}`);

        // Clean up page resources
        page.cleanup();

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

async function convertPdfToImages22(pdfPath: string, outputDir: string, documentId: string): Promise<{ images: string[], thumbnails: string[] }> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const { createCanvas } = await import('canvas');

    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const images: string[] = [];
    const thumbnails: string[] = [];

    //console.log(`Converting ${pdfDoc.getPageCount()} pages to images...`);

    for (let pageNumber = 0; pageNumber < pdfDoc.getPageCount(); pageNumber++) {
      try {
        //console.log(`Converting page ${pageNumber + 1}...`);

        // For pdf-lib, you'd need to extract images from each page
        // This is a simplified version - you might need more complex image extraction
        const page = pdfDoc.getPage(pageNumber);
        const { width, height } = page.getSize();

        // Create a canvas representation
        const canvas = createCanvas(width, height);
        const context = canvas.getContext('2d');

        // Fill background
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, width, height);

        // Draw page number (as placeholder since pdf-lib doesn't render like pdfjs)
        context.fillStyle = '#000000';
        context.font = '48px Arial';
        context.textAlign = 'center';
        context.fillText(`Page ${pageNumber + 1}`, width / 2, height / 2);

        //console.log("here is outputDir: ", outputDir, " --- documentId --- ", documentId)
        await fs.mkdir(`public/images/${documentId}`, { recursive: true });
        await fs.mkdir(`public/thumbnails/${documentId}`, { recursive: true });

        // Save image
        const imagePath = path.join(outputDir, `page-${pageNumber + 1}.png`);
        await fs.writeFile(imagePath, canvas.toBuffer('image/png'));

        // console.log(`Converted Image path: ${imagePath}`);

        images.push(`/api/images/${documentId}/${pageNumber + 1}/image`);
        thumbnails.push(`/api/images/${documentId}/${pageNumber + 1}/thumbnail`);

        // console.log(`✅ Page ${pageNumber + 1} converted`);

      } catch (pageError) {
        console.error(`❌ Page ${pageNumber + 1} failed:`, pageError);
        images.push(`/api/images/${documentId}/${pageNumber + 1}/image`);
        thumbnails.push(`/api/images/${documentId}/${pageNumber + 1}/thumbnail`);
      }
    }

    return { images, thumbnails };

  } catch (error) {
    console.error('PDF conversion error with pdf-lib:', error);
    throw error;
  }
}

// Function to convert PDF pages to images using pdfjs-dist legacy build
async function convertPdfToImages(pdfPath: string, outputDir: string, documentId: string): Promise<{ images: string[], thumbnails: string[] }> {
  try {
    // Use the legacy build for Node.js
    //const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js?v=2.16.105');
    const { createCanvas } = await import('canvas');

    // Ensure output directories exist with proper path resolution
    const absoluteImageDir = path.resolve(outputDir);
    const absoluteThumbDir = path.resolve('public', 'thumbnails', documentId);

    await fs.mkdir(absoluteImageDir, { recursive: true });
    await fs.mkdir(absoluteThumbDir, { recursive: true });

    // console.log(`Image directory: ${absoluteImageDir}`);
    // console.log(`Thumbnail directory: ${absoluteThumbDir}`);

    const dataBuffer = await fs.readFile(pdfPath);

    // Initialize PDF.js
    const pdfDoc = await pdfjsLib.getDocument({ data: dataBuffer }).promise;

    const images: string[] = [];
    const thumbnails: string[] = [];

    // console.log(`Converting ${pdfDoc.numPages} pages to images...`);

    for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
      try {
        // console.log(`Converting page ${pageNumber}...`);

        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });

        // Create canvas for main image
        const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
        const context = canvas.getContext('2d');

        // Prepare canvas for rendering
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Render PDF page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas, // ← This was missing
          transform: null,
          background: null
        };

        await page.render(renderContext).promise;

        // Save main image with absolute path
        const imagePath = path.join(absoluteImageDir, `page-${pageNumber}.png`);
        const imageBuffer = canvas.toBuffer('image/png');
        await fs.writeFile(imagePath, imageBuffer);

        // Create thumbnail (25% of original size)
        const thumbWidth = Math.floor(viewport.width * 0.25);
        const thumbHeight = Math.floor(viewport.height * 0.25);
        const thumbCanvas = createCanvas(thumbWidth, thumbHeight);
        const thumbContext = thumbCanvas.getContext('2d');

        // Draw scaled down version
        thumbContext.drawImage(canvas, 0, 0, viewport.width, viewport.height, 0, 0, thumbWidth, thumbHeight);

        const thumbPath = path.join(absoluteThumbDir, `page-${pageNumber}.png`);
        await fs.writeFile(thumbPath, thumbCanvas.toBuffer('image/png'));

        const imageUrl = `/api/images/${documentId}/${pageNumber}/image`;
        const thumbnailUrl = `/api/images/${documentId}/${pageNumber}/thumbnail`;

        images.push(imageUrl);
        thumbnails.push(thumbnailUrl);

        // console.log(`✅ Successfully converted page ${pageNumber}`);
        // console.log(`✅ Image saved to: ${imagePath}`);
        // console.log(`✅ Thumbnail saved to: ${thumbPath}`);

        // Clean up page resources
        page.cleanup();

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

// Helper functions
function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

//async function validateUserCredentials(username: string, password: string): Promise<boolean> {
  // Replace this with your actual user validation logic
  // Example implementation with your SQLite database:

  // const user = await storage.getUserByUsername(username);
  // if (!user) return false;
  // return await bcrypt.compare(password, user.passwordHash);

  // Temporary implementation - replace with database check
  //return username === 'admin' && password === 'password';
//}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        expires: number;
      };
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {

  // Create directories for images
  await fs.mkdir('public/images', { recursive: true });
  await fs.mkdir('public/thumbnails', { recursive: true });

  // ===== AUTHENTICATION ROUTES =====
  // User login 

  app.post("/api/user/login", async (req: Request, res: Response) => {
    //console.log("Login attempt body:", req.body);
    try {
      const credentials = loginSchema.parse(req.body);
      console.log("Login attempt body:", credentials.email);
      const user = await storage.getUserByUsername(credentials.email);
 
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      if(credentials.password !==user.password){
        return res.status(401).json({ message: "Invalid credentials" });
      } 
      // Create session ID and store session
      const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      activeSessions.set(sessionId, {
        userId: user.id,
        username: user.username,
        expires: Date.now() + SESSION_DURATION,
      });
      
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, sessionId });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // User logout
  app.post('/api/auth/logout', (req, res) => {
    const sessionId = req.body.sessionId;

    if (sessionId) {
      activeSessions.delete(sessionId);
    }

    res.json({ message: 'Logout successful' });
  });

  // Check session validity
  app.get('/api/auth/session', (req, res) => {
    const sessionId = req.query.sessionId as string;

    if (!sessionId || !activeSessions.has(sessionId)) {
      return res.json({ valid: false });
    }

    const session = activeSessions.get(sessionId)!;

    if (Date.now() > session.expires) {
      activeSessions.delete(sessionId);
      return res.json({ valid: false });
    }

    res.json({ valid: true, user: session });
  });

  // NEW 

  // Auth routes 
  // app.post("/api/user/login", async (req, res) => {
  //   console.log("1111", JSON.stringify(req.body));
  //   console.log("22Request Body:", req.body);
  //   res.json(req.body)
  // });

  

  app.post("/api/auth/login", async (req, res) => {
    //console.log("AAAAAAAAAAAA");
    console.log("AAAAAAAAAAAA", JSON.stringify(req.body));
    console.log("Request Body:", req.body);
    return;
    try {
      const credentials = loginSchema.parse(req.body);
      console.log('REQ:: ', JSON.stringify(credentials))
      const user = await authenticateUser(credentials);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = req.body;
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await registerUser(userData);
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ===== PROTECTED UPLOAD ROUTE =====

  app.post("/api/documents/upload", upload.single('pdf'), async (req, res) => {
    // console.log('>>>UPLOAD>>>');
    let tempPdfPath: string | null = req.file?.path || null;

    try {
      // console.log('Upload request received:', {
      //   body: req.body,
      //   file: req.file
      // });

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { title } = req.body;
      if (!title) {
        await fs.unlink(req.file.path);
        return res.status(400).json({ message: "Title is required" });
      }

      // Get actual page count from PDF
      let pageCount: number;
      try {
        pageCount = await getPdfPageCount(req.file.path);
        // console.log(`PDF has ${pageCount} pages`);
      } catch (error) {
        // console.error('Failed to read PDF page count:', error);
        await fs.unlink(req.file.path);
        return res.status(400).json({ message: "Invalid PDF file" });
      }

      // Create document record
      const document = await storage.createDocument({
        title,
        filename: req.file.originalname,
        pageCount
      });

      // Convert PDF pages to images
      // const outputDir = path.join('public', 'images', document.id);
      // let imageUrls: string[] = [];
      // let thumbnailUrls: string[] = [];

      // try {
      //   console.log('Starting PDF to image conversion...');
      //   const conversionResult = await convertPdfToImages(req.file.path, outputDir, document.id);
      //   imageUrls = conversionResult.images;
      //   thumbnailUrls = conversionResult.thumbnails;
      //   console.log(`✅ Successfully converted ${imageUrls.length} pages`);
      // } catch (conversionError) {
      //   console.error('PDF to image conversion failed:', conversionError);
      //   // Fallback: create placeholder images
      //   for (let i = 1; i <= pageCount; i++) {
      //     imageUrls.push(`/api/images/${document.id}/${i}/image`);
      //     thumbnailUrls.push(`/api/images/${document.id}/${i}/thumbnail`);
      //   }
      // }
      // Convert PDF pages to images - use absolute path
      const outputDir = path.resolve('public', 'images', document.id);
      let imageUrls: string[] = [];
      let thumbnailUrls: string[] = [];
      let imagePaths: string[] = [];
      let thumbnailPaths: string[] = [];

      try {
        // console.log('Starting PDF to image conversion...');
        // console.log(`Output directory: ${outputDir}`);

        const conversionResult = await convertPdfToImages(req.file.path, outputDir, document.id);
        imageUrls = conversionResult.images;
        thumbnailUrls = conversionResult.thumbnails;
        // console.log(`✅ Successfully converted ${imageUrls.length} pages`);
        if (conversionResult.images.length === pageCount && conversionResult.thumbnails.length === pageCount) {
          imagePaths = conversionResult.images;
          thumbnailPaths = conversionResult.thumbnails;
          console.log(`✅ Successfully converted ${imagePaths.length} pages`);
        } else {
          throw new Error('PDF conversion returned incomplete results');
        }

      } catch (conversionError) {
        console.error('PDF to image conversion failed:', conversionError);
        // Fallback: create placeholder images
        console.log('Creating placeholder images as fallback...');
        const placeholderResult = await createPlaceholderImages(pageCount, outputDir, document.id);
        imageUrls = placeholderResult.images;
        thumbnailUrls = placeholderResult.thumbnails;
        imagePaths = placeholderResult.images;
        thumbnailPaths = placeholderResult.thumbnails;
      }

      // Validate paths before database insertion
      if (imagePaths.length !== pageCount || thumbnailPaths.length !== pageCount) {
        throw new Error(`Path arrays don't match page count. Images: ${imagePaths.length}, Thumbs: ${thumbnailPaths.length}, Pages: ${pageCount}`);
      }

      // Create page records
      // const pages = [];
      // for (let i = 1; i <= pageCount; i++) { 
      //   const page = await storage.createPage({
      //     documentId: document.id,
      //     pageNumber: i,
      //     imageUrl: imageUrls[i - 1],
      //     thumbnailUrl: thumbnailUrls[i - 1]
      //   });

      //   pages.push(page);
      // }

      // Create page records in SQLite with actual image paths
      const pages = [];
      for (let i = 1; i <= pageCount; i++) {
        const imagePath = imagePaths[i - 1];
        const thumbnailPath = thumbnailPaths[i - 1];

        // Validate that paths are not empty
        if (!imagePath || !thumbnailPath) {
          throw new Error(`Invalid paths for page ${i}: imagePath=${imagePath}, thumbnailPath=${thumbnailPath}`);
        }

        const page = await storage.createPage({
          documentId: document.id,
          pageNumber: i,
          imagePath: imagePath,
          thumbnailPath: thumbnailPath
        });
        pages.push(page);
      }

      // Clean up uploaded PDF file
      await fs.unlink(req.file.path);
      tempPdfPath = null;

      // console.log(`✅ Successfully processed document: ${document.id} with ${pageCount} pages`);

      res.json({ document, pages });
    } catch (error) {
      console.error("Upload error:", error);

      // Clean up files on error
      if (tempPdfPath) {
        await fs.unlink(tempPdfPath).catch(console.error);
      }

      res.status(500).json({ message: "Failed to process PDF" });
    }
  });

  // Serve actual PDF page images
  app.get("/api/images/:documentId/:pageNumber/image", async (req, res) => {
    // console.log('>>>III>>>', JSON.stringify(req.params));
    try {
      const { documentId, pageNumber } = req.params;
      const imagePath = path.join('public', 'images', documentId, `page-${pageNumber}.png`);

      // Check if image exists
      try {
        await fs.access(imagePath);
        res.sendFile(path.resolve(imagePath));
      } catch {
        // Fallback to a generated placeholder image
        const { createCanvas } = await import('canvas');
        //const canvas = createCanvas(800, 1000);
        const canvas = createCanvas(775, 1050);
        const ctx = canvas.getContext('2d');

        // Create a nice placeholder
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#6b7280';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Page ${pageNumber}`, canvas.width / 2, canvas.height / 2);

        ctx.font = '20px Arial';
        ctx.fillText(`Document: ${documentId}`, canvas.width / 2, canvas.height / 2 + 40);

        res.setHeader('Content-Type', 'image/png');
        res.send(canvas.toBuffer('image/png'));
      }
    } catch (error) {
      console.error('Error serving image:', error);
      res.status(404).json({ message: "Image not found" });
    }
  });

  // Serve thumbnail images
  app.get("/api/images/:documentId/:pageNumber/thumbnail", async (req, res) => {
    // console.log('>>>PPP>>>', JSON.stringify(req.params));
    try {
      const { documentId, pageNumber } = req.params;
      const thumbnailPath = path.join('public', 'thumbnails', documentId, `page-${pageNumber}.png`);

      try {
        await fs.access(thumbnailPath);
        res.sendFile(path.resolve(thumbnailPath));
      } catch {
        // Fallback to main image
        const mainImagePath = path.join('public', 'images', documentId, `page-${pageNumber}.png`);
        try {
          await fs.access(mainImagePath);
          res.sendFile(path.resolve(mainImagePath));
        } catch {
          // Final fallback - generated thumbnail
          const { createCanvas } = await import('canvas');
          const canvas = createCanvas(200, 250);
          const ctx = canvas.getContext('2d');

          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = '#6b7280';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`Page ${pageNumber}`, canvas.width / 2, canvas.height / 2);

          res.setHeader('Content-Type', 'image/png');
          res.send(canvas.toBuffer('image/png'));
        }
      }
    } catch (error) {
      console.error('Error serving thumbnail:', error);
      res.status(404).json({ message: "Thumbnail not found" });
    }
  });

  // Redirect old routes to new ones
  app.get("/api/pages/:documentId/:pageNumber/image", async (req, res) => {
    // console.log('>>>P>>>', JSON.stringify(req.params));
    const { documentId, pageNumber } = req.params;
    res.redirect(`/api/images/${documentId}/${pageNumber}/image`);
  });

  app.get("/api/pages/:documentId/:pageNumber/thumbnail", async (req, res) => {
    // console.log('>>>T>>>', JSON.stringify(req.params));
    const { documentId, pageNumber } = req.params;
    res.redirect(`/api/images/${documentId}/${pageNumber}/thumbnail`);
  });

  // ... rest of your existing routes
  // Get document by ID with pages
  app.get("/api/documents/:id", async (req, res) => {
    // console.log('>>>G>>>', JSON.stringify(req.params));
    try {


      const hostUrl = `${req.protocol}://${req.get('host')}`;

      //const imagePath = path.join('public', 'images', req.params.id, `page-1.png`);
      //console.log("Current Document ID is >>>> ", imagePath)
      //console.log("Current Document ID is >>>> ", req.params.id);
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const pages = await storage.getPagesByDocument(document.id);
      // console.log(JSON.stringify(pages));
      // [
      //   {
      //     "id": "cdaa0728-7c2b-4350-a028-2a19a122e823",
      //     "documentId": "2dfc8bed-a94f-49e1-91f3-6d92d30e7480",
      //     "pageNumber": 1,
      //     "imagePath": "/api/images/2dfc8bed-a94f-49e1-91f3-6d92d30e7480/1/image",
      //     "thumbnailPath": "/api/images/2dfc8bed-a94f-49e1-91f3-6d92d30e7480/1/thumbnail",
      //     "createdAt": "2025-09-27T23:10:16.000Z"
      //   },
      //   {
      //     "id": "3272610a-1486-4380-8024-bc1656b629a4",
      //     "documentId": "2dfc8bed-a94f-49e1-91f3-6d92d30e7480",
      //     "pageNumber": 2,
      //     "imagePath": "/api/images/2dfc8bed-a94f-49e1-91f3-6d92d30e7480/2/image",
      //     "thumbnailPath": "/api/images/2dfc8bed-a94f-49e1-91f3-6d92d30e7480/2/thumbnail",
      //     "createdAt": "2025-09-27T23:10:16.000Z"
      //   }]
      // Check if files actually exist
      const pagesWithFileCheck = await Promise.all(
        pages.map(async (page) => {
          const imageExists = await fs.access(path.resolve('public', page.imagePath)).then(() => true).catch(() => false);
          const thumbExists = await fs.access(path.resolve('public', page.thumbnailPath)).then(() => true).catch(() => false);

          return {
            ...page,
            imageExists,
            thumbExists,
            absoluteImagePath: path.resolve('public', page.imagePath),
            absoluteThumbPath: path.resolve('public', page.thumbnailPath),
            hostUrl: hostUrl
          };
        })
      );
      res.json({
        document,
        pages: pagesWithFileCheck,
        publicDir: path.resolve('public')
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get document" });
    }
  });

  // Get all documents
  app.get("/api/documents", async (req, res) => {
    // console.log('>>>!>>>', JSON.stringify(req.params));
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to get documents" });
    }
  });

  // Serve images from database paths
  app.get("/api/images/:documentId/:pageNumber", async (req, res) => {
    // console.log('>>>@>>>', JSON.stringify(req.params));

    try {
      const { documentId, pageNumber } = req.params;
      const pageNum = parseInt(pageNumber);

      const page = await storage.getPage?.(documentId, pageNum);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      const imagePath = path.resolve('public', page.imagePath);
      try {
        await fs.access(imagePath);
        res.setHeader('Content-Type', 'image/png');
        res.sendFile(imagePath);
      } catch {
        res.status(404).json({ message: "Image file not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get image" });
    }
  });

  // Serve thumbnails from database paths
  app.get("/api/thumbnails/:documentId/:pageNumber", async (req, res) => {
    // console.log('<<<@>>>', JSON.stringify(req.params));
    try {
      const { documentId, pageNumber } = req.params;
      const pageNum = parseInt(pageNumber);

      const page = await storage.getPage?.(documentId, pageNum);
      if (!page) {
        return res.status(404).json({ message: "Page not found" });
      }

      const thumbPath = path.resolve('public', page.thumbnailPath);
      try {
        await fs.access(thumbPath);
        res.sendFile(thumbPath);
      } catch {
        // Fallback to main image if thumbnail doesn't exist
        const imagePath = path.resolve('public', page.imagePath);
        try {
          await fs.access(imagePath);
          res.sendFile(imagePath);
        } catch {
          res.status(404).json({ message: "Thumbnail not found" });
        }
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get thumbnail" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}