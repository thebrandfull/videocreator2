import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { FaceData, DetectedFace } from '../types/face';

interface FaceRecognitionProps {
  knownFaces: FaceData[];
}

export const FaceRecognition: React.FC<FaceRecognitionProps> = ({ knownFaces }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const { modelsLoaded, detectFaces } = useFaceDetection();
  const animationFrameRef = useRef<number>();
  const faceMatcher = useRef<faceapi.FaceMatcher | null>(null);

  useEffect(() => {
    if (modelsLoaded && knownFaces.length > 0) {
      createFaceMatcher();
    }
  }, [modelsLoaded, knownFaces]);

  const createFaceMatcher = () => {
    try {
      const labeledDescriptors = knownFaces.map(face => {
        const descriptor = new Float32Array(face.descriptor);
        return new faceapi.LabeledFaceDescriptors(face.name, [descriptor]);
      });

      faceMatcher.current = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    } catch (err) {
      console.error('Error creating face matcher:', err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsStreaming(true);
          detectFacesLoop();
        };
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Failed to access camera. Please ensure you have granted camera permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      setDetectedFaces([]);
    }
  };

  const detectFacesLoop = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded || !isStreaming) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === 4) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const detections = await detectFaces(video);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detections && detections.length > 0) {
          const detected: DetectedFace[] = [];

          detections.forEach((detection) => {
            const box = detection.detection.box;
            let name = 'Unknown';
            let confidence = 0;

            if (faceMatcher.current && detection.descriptor) {
              const match = faceMatcher.current.findBestMatch(detection.descriptor);
              name = match.label;
              confidence = 1 - match.distance;
            }

            detected.push({
              name,
              confidence,
              box: {
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
              },
            });

            // Draw bounding box
            ctx.strokeStyle = name === 'Unknown' ? '#ff0000' : '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Draw label background
            const label = name === 'Unknown' ? name : `${name} (${Math.round(confidence * 100)}%)`;
            ctx.font = '18px Arial';
            const textWidth = ctx.measureText(label).width;
            const textHeight = 24;

            ctx.fillStyle = name === 'Unknown' ? '#ff0000' : '#00ff00';
            ctx.fillRect(box.x, box.y - textHeight - 4, textWidth + 10, textHeight + 4);

            // Draw label text
            ctx.fillStyle = '#000000';
            ctx.fillText(label, box.x + 5, box.y - 8);
          });

          setDetectedFaces(detected);
        } else {
          setDetectedFaces([]);
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectFacesLoop);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Face Recognition Camera</h2>

      {error && <div style={styles.error}>{error}</div>}

      {!modelsLoaded && (
        <div style={styles.loading}>Loading face detection models...</div>
      )}

      {knownFaces.length === 0 && modelsLoaded && (
        <div style={styles.warning}>
          No faces registered yet. Please add at least one face to enable recognition.
        </div>
      )}

      <div style={styles.controls}>
        <button
          onClick={startCamera}
          disabled={isStreaming || !modelsLoaded}
          style={{
            ...styles.button,
            ...(isStreaming || !modelsLoaded ? styles.buttonDisabled : styles.startButton)
          }}
        >
          Start Camera
        </button>
        <button
          onClick={stopCamera}
          disabled={!isStreaming}
          style={{
            ...styles.button,
            ...(!isStreaming ? styles.buttonDisabled : styles.stopButton)
          }}
        >
          Stop Camera
        </button>
      </div>

      <div style={styles.videoContainer}>
        <video
          ref={videoRef}
          style={styles.video}
          autoPlay
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          style={styles.canvas}
        />
      </div>

      {detectedFaces.length > 0 && (
        <div style={styles.detectionInfo}>
          <h3>Detected Faces:</h3>
          <ul>
            {detectedFaces.map((face, idx) => (
              <li key={idx}>
                {face.name} {face.name !== 'Unknown' && `- ${Math.round(face.confidence * 100)}% match`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  title: {
    marginTop: 0,
    marginBottom: '20px',
    color: '#333',
  },
  error: {
    padding: '10px',
    backgroundColor: '#fee',
    color: '#c00',
    border: '1px solid #fcc',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  loading: {
    padding: '10px',
    backgroundColor: '#fff3cd',
    color: '#856404',
    border: '1px solid #ffeaa7',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  warning: {
    padding: '10px',
    backgroundColor: '#fff3cd',
    color: '#856404',
    border: '1px solid #ffeaa7',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  controls: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  startButton: {
    backgroundColor: '#28a745',
    color: 'white',
  },
  stopButton: {
    backgroundColor: '#dc3545',
    color: 'white',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    color: '#666',
    cursor: 'not-allowed',
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    backgroundColor: '#000',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  detectionInfo: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '4px',
    border: '1px solid #ddd',
  },
};
