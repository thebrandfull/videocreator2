import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { faceStore } from '../storage/faceStore.js';
import { FaceData } from '../types/face.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png) are allowed'));
    }
  }
});

// Get all faces
router.get('/', async (req: Request, res: Response) => {
  try {
    const faces = await faceStore.getAllFaces();
    res.json(faces);
  } catch (error) {
    console.error('Error getting faces:', error);
    res.status(500).json({ error: 'Failed to retrieve faces' });
  }
});

// Get a specific face
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'Face ID is required' });
    }
    const face = await faceStore.getFace(id);
    if (!face) {
      return res.status(404).json({ error: 'Face not found' });
    }
    res.json(face);
  } catch (error) {
    console.error('Error getting face:', error);
    res.status(500).json({ error: 'Failed to retrieve face' });
  }
});

// Add a new face
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { name, descriptor } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!descriptor) {
      return res.status(400).json({ error: 'Face descriptor is required' });
    }

    const faceData: FaceData = {
      id: uuidv4(),
      name,
      imageUrl: `/uploads/${req.file.filename}`,
      descriptor: JSON.parse(descriptor),
      createdAt: new Date()
    };

    const savedFace = await faceStore.addFace(faceData);
    res.status(201).json(savedFace);
  } catch (error) {
    console.error('Error adding face:', error);
    res.status(500).json({ error: 'Failed to add face' });
  }
});

// Update a face
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'Face ID is required' });
    }
    const { name } = req.body;
    const updated = await faceStore.updateFace(id, { name });

    if (!updated) {
      return res.status(404).json({ error: 'Face not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating face:', error);
    res.status(500).json({ error: 'Failed to update face' });
  }
});

// Delete a face
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'Face ID is required' });
    }
    const deleted = await faceStore.deleteFace(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Face not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting face:', error);
    res.status(500).json({ error: 'Failed to delete face' });
  }
});

export default router;
