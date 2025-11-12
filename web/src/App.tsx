import React, { useState, useEffect } from 'react';
import { FaceUpload } from './components/FaceUpload';
import { FaceRecognition } from './components/FaceRecognition';
import { FaceList } from './components/FaceList';
import { faceApi } from './services/api';
import { FaceData } from './types/face';
import './App.css';

function App() {
  const [faces, setFaces] = useState<FaceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFaces();
  }, []);

  const loadFaces = async () => {
    try {
      setLoading(true);
      const data = await faceApi.getAllFaces();
      setFaces(data);
      setError(null);
    } catch (err) {
      console.error('Error loading faces:', err);
      setError('Failed to load faces. Please make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceAdded = () => {
    loadFaces();
  };

  const handleDeleteFace = async (id: string) => {
    if (!confirm('Are you sure you want to delete this face?')) {
      return;
    }

    try {
      await faceApi.deleteFace(id);
      loadFaces();
    } catch (err) {
      console.error('Error deleting face:', err);
      alert('Failed to delete face');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Face Recognition App</h1>
        <p>Upload photos and recognize faces in real-time using your Mac camera</p>
      </header>

      <main className="main">
        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            <FaceUpload onFaceAdded={handleFaceAdded} />
            <FaceRecognition knownFaces={faces} />
            <FaceList faces={faces} onDelete={handleDeleteFace} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
