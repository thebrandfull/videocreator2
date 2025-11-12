import React, { useState, useRef } from 'react';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { faceApi } from '../services/api';

interface FaceUploadProps {
  onFaceAdded: () => void;
}

export const FaceUpload: React.FC<FaceUploadProps> = ({ onFaceAdded }) => {
  const [name, setName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const { getSingleFaceDescriptor, modelsLoaded } = useFaceDetection();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !selectedFile || !imgRef.current) {
      setMessage({ type: 'error', text: 'Please provide a name and select an image' });
      return;
    }

    if (!modelsLoaded) {
      setMessage({ type: 'error', text: 'Face detection models are still loading...' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const descriptor = await getSingleFaceDescriptor(imgRef.current);

      if (!descriptor) {
        setMessage({ type: 'error', text: 'No face detected in the image. Please upload a clear photo with a visible face.' });
        setUploading(false);
        return;
      }

      await faceApi.addFace(name, selectedFile, Array.from(descriptor));

      setMessage({ type: 'success', text: `Successfully added ${name}!` });
      setName('');
      setSelectedFile(null);
      setPreview(null);
      onFaceAdded();
    } catch (error) {
      console.error('Error uploading face:', error);
      setMessage({ type: 'error', text: 'Failed to upload face. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Add New Face</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
            placeholder="Enter name..."
            disabled={uploading}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Photo:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={styles.fileInput}
            disabled={uploading}
          />
        </div>

        {preview && (
          <div style={styles.previewContainer}>
            <img
              ref={imgRef}
              src={preview}
              alt="Preview"
              style={styles.preview}
              crossOrigin="anonymous"
            />
          </div>
        )}

        {message && (
          <div style={{
            ...styles.message,
            ...(message.type === 'error' ? styles.errorMessage : styles.successMessage)
          }}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !modelsLoaded}
          style={{
            ...styles.button,
            ...(uploading || !modelsLoaded ? styles.buttonDisabled : {})
          }}
        >
          {uploading ? 'Uploading...' : !modelsLoaded ? 'Loading Models...' : 'Add Face'}
        </button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  title: {
    marginTop: 0,
    marginBottom: '20px',
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontWeight: 'bold',
    color: '#555',
  },
  input: {
    padding: '10px',
    fontSize: '16px',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
  fileInput: {
    padding: '10px',
    fontSize: '14px',
  },
  previewContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '10px',
  },
  preview: {
    maxWidth: '300px',
    maxHeight: '300px',
    borderRadius: '8px',
    border: '2px solid #ddd',
  },
  message: {
    padding: '10px',
    borderRadius: '4px',
    fontSize: '14px',
  },
  errorMessage: {
    backgroundColor: '#fee',
    color: '#c00',
    border: '1px solid #fcc',
  },
  successMessage: {
    backgroundColor: '#efe',
    color: '#0a0',
    border: '1px solid #cfc',
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
};
