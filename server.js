import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import API handlers
import analyzeHandler from './api/analyze.js';
import chatHandler from './api/chat.js';
import healthHandler from './api/health.js';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.post('/api/analyze', analyzeHandler);
app.post('/api/chat', chatHandler);
app.post('/api/health', healthHandler);

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`GROQ API Key configured: ${process.env.GROQ_API_KEY ? 'Yes' : 'No'}`);
});