import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import facesRouter from './routes/faces.js';
import { faceStore } from './storage/faceStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve face-api.js models
app.use('/models', express.static(path.join(process.cwd(), 'models')));

// API routes
app.use('/api/faces', facesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'web', 'dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'web', 'dist', 'index.html'));
  });
}

// Initialize storage and start server
async function start() {
  await faceStore.init();

  app.listen(PORT, () => {
    console.log(`Face Recognition Server running on http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });
}

start().catch(console.error);
