# Atlas Resume Analyzer - Project Documentation

## Overview
Atlas is a React + TypeScript + Vite single-page application for resume analysis. It helps recruiters analyze resumes with AI-powered scoring, suggestions, and task planning capabilities.

## Recent Changes
- **Sep 19, 2025**: Imported GitHub project and configured for Replit environment
- Set up Node.js dependencies and TypeScript configuration
- Configured Vite dev server for Replit proxy (host: 0.0.0.0, port: 5000)
- Set up environment variables for GROQ API integration
- Configured deployment settings for autoscale deployment

## Project Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite 5
- **Styling**: Tailwind CSS, Framer Motion
- **AI Integration**: Groq SDK (OpenAI OSS 120B model)
- **PDF Processing**: pdf-parse for client-side PDF text extraction
- **Build Tool**: Vite with custom middleware for API endpoints

### Key Features
- Resume analysis with AI-powered scoring across multiple sections
- PDF and text upload support
- Task planning and management
- Atlas Assistant chatbot
- Interview guide

### Environment Setup
- **Required**: GROQ_API_KEY for AI functionality
- **Optional**: SLACK_WEBHOOK_URL, email domain restrictions
- All environment variables configured in .env.local (git-ignored)

### Development Workflow
- **Development Server**: `npm run dev` on port 5000
- **Build**: `npm run build` creates static files in `dist/`
- **Deployment**: Configured for autoscale deployment using serve

### File Structure
- `src/`: React components, hooks, and utilities
- `api/`: Node.js handlers that mirror dev middleware
- `public/`: Static assets and logos
- `docs/`: Product documentation and AI system prompts

## Configuration Notes
- Vite dev server configured to allow all hosts for Replit proxy
- API endpoints handled by middleware in vite.config.ts during development
- TypeScript configured with strict settings
- Deployment uses static file serving with `serve`