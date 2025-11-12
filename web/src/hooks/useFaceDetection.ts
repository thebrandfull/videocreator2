import { useEffect, useState, useRef } from 'react';
import * as faceapi from 'face-api.js';

export const useFaceDetection = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const MODEL_URL = '/models';

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      ]);

      setModelsLoaded(true);
      setLoading(false);
    } catch (err) {
      console.error('Error loading models:', err);
      setError('Failed to load face detection models');
      setLoading(false);
    }
  };

  const detectFaces = async (input: HTMLVideoElement | HTMLImageElement) => {
    if (!modelsLoaded) return null;

    try {
      const detections = await faceapi
        .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      return detections;
    } catch (err) {
      console.error('Error detecting faces:', err);
      return null;
    }
  };

  const getSingleFaceDescriptor = async (input: HTMLImageElement) => {
    if (!modelsLoaded) return null;

    try {
      const detection = await faceapi
        .detectSingleFace(input)
        .withFaceLandmarks()
        .withFaceDescriptor();

      return detection?.descriptor;
    } catch (err) {
      console.error('Error getting face descriptor:', err);
      return null;
    }
  };

  return {
    modelsLoaded,
    loading,
    error,
    detectFaces,
    getSingleFaceDescriptor,
  };
};
