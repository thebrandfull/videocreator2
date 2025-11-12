export interface FaceData {
  id: string;
  name: string;
  imageUrl: string;
  descriptor: number[];
  createdAt: string;
}

export interface DetectedFace {
  name: string;
  confidence: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
