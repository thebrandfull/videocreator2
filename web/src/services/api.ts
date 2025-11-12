import { FaceData } from '../types/face';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const faceApi = {
  async getAllFaces(): Promise<FaceData[]> {
    const response = await fetch(`${API_BASE}/faces`);
    if (!response.ok) throw new Error('Failed to fetch faces');
    return response.json();
  },

  async addFace(name: string, image: File, descriptor: number[]): Promise<FaceData> {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('image', image);
    formData.append('descriptor', JSON.stringify(descriptor));

    const response = await fetch(`${API_BASE}/faces`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Failed to add face');
    return response.json();
  },

  async deleteFace(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/faces/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete face');
  },

  async updateFace(id: string, name: string): Promise<FaceData> {
    const response = await fetch(`${API_BASE}/faces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) throw new Error('Failed to update face');
    return response.json();
  },
};
