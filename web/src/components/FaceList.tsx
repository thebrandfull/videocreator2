import React from 'react';
import { FaceData } from '../types/face';

interface FaceListProps {
  faces: FaceData[];
  onDelete: (id: string) => void;
}

export const FaceList: React.FC<FaceListProps> = ({ faces, onDelete }) => {
  if (faces.length === 0) {
    return (
      <div style={styles.emptyState}>
        No faces registered yet. Add your first face above!
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Registered Faces ({faces.length})</h2>
      <div style={styles.grid}>
        {faces.map((face) => (
          <div key={face.id} style={styles.card}>
            <img
              src={`http://localhost:3000${face.imageUrl}`}
              alt={face.name}
              style={styles.image}
            />
            <div style={styles.cardContent}>
              <h3 style={styles.name}>{face.name}</h3>
              <p style={styles.date}>
                Added: {new Date(face.createdAt).toLocaleDateString()}
              </p>
              <button
                onClick={() => onDelete(face.id)}
                style={styles.deleteButton}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    marginTop: '20px',
  },
  title: {
    marginTop: 0,
    marginBottom: '20px',
    color: '#333',
  },
  emptyState: {
    padding: '40px',
    textAlign: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    color: '#666',
    fontSize: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  image: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
  },
  cardContent: {
    padding: '15px',
  },
  name: {
    margin: '0 0 10px 0',
    fontSize: '18px',
    color: '#333',
  },
  date: {
    margin: '0 0 15px 0',
    fontSize: '12px',
    color: '#666',
  },
  deleteButton: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};
