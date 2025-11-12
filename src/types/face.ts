export interface FaceData {
  id: string;
  name: string;
  imageUrl: string;
  descriptor: number[];
  createdAt: Date;
}

export interface CreateFaceRequest {
  name: string;
  descriptor: number[];
}
