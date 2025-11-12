import { FaceData } from '../types/face.js';
import { promises as fs } from 'fs';
import path from 'path';

const STORAGE_FILE = path.join(process.cwd(), 'data', 'faces.json');

class FaceStore {
  private faces: Map<string, FaceData> = new Map();

  async init() {
    try {
      await fs.mkdir(path.dirname(STORAGE_FILE), { recursive: true });
      const data = await fs.readFile(STORAGE_FILE, 'utf-8');
      const faces = JSON.parse(data) as FaceData[];
      faces.forEach(face => {
        face.createdAt = new Date(face.createdAt);
        this.faces.set(face.id, face);
      });
      console.log(`Loaded ${faces.length} faces from storage`);
    } catch (error) {
      console.log('No existing face data found, starting fresh');
    }
  }

  async save() {
    try {
      const faces = Array.from(this.faces.values());
      await fs.writeFile(STORAGE_FILE, JSON.stringify(faces, null, 2));
    } catch (error) {
      console.error('Error saving faces:', error);
    }
  }

  async addFace(face: FaceData): Promise<FaceData> {
    this.faces.set(face.id, face);
    await this.save();
    return face;
  }

  async getFace(id: string): Promise<FaceData | undefined> {
    return this.faces.get(id);
  }

  async getAllFaces(): Promise<FaceData[]> {
    return Array.from(this.faces.values());
  }

  async deleteFace(id: string): Promise<boolean> {
    const deleted = this.faces.delete(id);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  async updateFace(id: string, updates: Partial<FaceData>): Promise<FaceData | undefined> {
    const face = this.faces.get(id);
    if (!face) return undefined;

    const updated = { ...face, ...updates };
    this.faces.set(id, updated);
    await this.save();
    return updated;
  }
}

export const faceStore = new FaceStore();
