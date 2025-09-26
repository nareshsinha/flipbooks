# Overview

This is a modern full-stack web application for creating interactive flipbook experiences from PDF documents. Users can upload PDF files, which are processed into page images and presented in an engaging flipbook interface with features like zooming, autoplay, thumbnails navigation, and fullscreen mode. The application uses a monorepo structure with shared TypeScript schemas and provides both development and production build configurations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React with TypeScript**: Component-based UI using functional components and hooks
- **Vite Build System**: Fast development server with Hot Module Replacement (HMR)
- **TailwindCSS + shadcn/ui**: Utility-first styling with pre-built accessible components
- **Wouter**: Lightweight client-side routing for single-page application navigation
- **TanStack Query**: Server state management with caching, background updates, and optimistic updates
- **Framer Motion**: Animation library for smooth page transitions and interactive elements

## Backend Architecture
- **Express.js**: RESTful API server with middleware support
- **In-Memory Storage**: Simple storage implementation for documents and pages (easily replaceable with database)
- **File Upload Processing**: Multer for handling PDF file uploads with size limits
- **Development/Production Modes**: Conditional Vite integration for development with static file serving in production

## Data Layer
- **Drizzle ORM**: Type-safe database toolkit configured for PostgreSQL
- **Zod Validation**: Runtime type checking and schema validation
- **Shared Schema**: Common TypeScript types between frontend and backend ensuring type safety

## Key Features
- **PDF Upload & Processing**: File upload with progress tracking and error handling
- **Interactive Flipbook**: Page navigation with keyboard controls, zoom functionality, and autoplay
- **Responsive Design**: Mobile-first approach with touch-friendly controls
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support

## Development Experience
- **TypeScript**: Full type safety across the entire stack
- **ESLint/Prettier**: Code formatting and linting (implied by project structure)
- **Hot Reload**: Fast development iteration with Vite HMR
- **Path Aliases**: Simplified imports with @ prefixes for better developer experience

# External Dependencies

## Core Framework Dependencies
- **React 18**: Frontend framework with concurrent features
- **Express.js**: Node.js web application framework
- **Vite**: Build tool and development server
- **TypeScript**: Static type checking

## Database & ORM
- **Drizzle ORM**: Type-safe database operations
- **@neondatabase/serverless**: PostgreSQL database adapter for serverless environments
- **Drizzle Kit**: Database migration and introspection tools

## UI & Styling
- **TailwindCSS**: Utility-first CSS framework
- **Radix UI**: Headless UI components for accessibility
- **shadcn/ui**: Pre-built component library built on Radix UI
- **Framer Motion**: Animation and gesture library
- **Lucide React**: Icon library

## State Management & Data Fetching
- **TanStack React Query**: Server state management and caching
- **React Hook Form**: Form state management and validation
- **Zod**: Schema validation library

## File Processing
- **Multer**: Middleware for handling multipart/form-data file uploads
- **File System APIs**: Native Node.js file operations for temporary file handling

## Development Tools
- **tsx**: TypeScript execution engine for development
- **esbuild**: Fast bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer
- **Wouter**: Lightweight router for React applications

## Session & Storage
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **In-memory storage**: Current implementation uses Map-based storage (development/demo purposes)

## Utility Libraries
- **date-fns**: Date manipulation and formatting
- **clsx**: Conditional CSS class composition
- **class-variance-authority**: Utility for creating variant-based component APIs