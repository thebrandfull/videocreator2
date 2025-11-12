# Face Recognition App for Mac

A customizable face recognition application that runs on macOS with real-time camera tracking. Upload photos of people, and the app will recognize them through your MacBook camera with bounding boxes and name labels.

## Features

- **Real-time Face Recognition**: Detect and recognize faces in real-time using your Mac's camera
- **Custom Face Database**: Upload photos and register people with their names
- **Visual Tracking**: Bounding boxes with name labels and confidence scores
- **Easy Management**: Add, view, and delete registered faces through an intuitive UI
- **Privacy-Focused**: All data stored locally, no cloud processing

## Technology Stack

- **Frontend**: React 19, TypeScript, face-api.js
- **Backend**: Node.js, Express, TypeScript
- **Face Detection**: face-api.js (TensorFlow.js-based)
- **Models**: TinyFaceDetector, FaceLandmark68Net, FaceRecognitionNet

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- macOS (for camera access)
- Modern web browser with camera permissions

### Installation

1. **Clone and install dependencies**

   ```bash
   # Install backend dependencies
   npm install

   # Install frontend dependencies
   npm --prefix web install
   ```

2. **Download face detection models**

   The models are already downloaded, but if you need to re-download them:

   ```bash
   ./download-models.sh
   ```

3. **Start the backend server**

   ```bash
   npm run dev
   ```

   The API server will start on http://localhost:3000

4. **In another terminal, start the frontend**

   ```bash
   npm run dev:web
   ```

   The web UI will be available at http://localhost:5173

## Usage

### Adding a New Face

1. Enter the person's name in the "Add New Face" section
2. Click "Choose File" and select a clear photo of their face
3. Click "Add Face" to register them in the system
4. The app will detect the face in the photo and save their facial features

### Starting Face Recognition

1. Click "Start Camera" in the Face Recognition section
2. Grant camera permissions when prompted
3. The app will automatically detect and recognize faces in real-time
4. Recognized faces will have green bounding boxes with names and confidence scores
5. Unknown faces will have red bounding boxes

### Managing Faces

- View all registered faces in the "Registered Faces" section
- Delete a face by clicking the "Delete" button on their card
- Edit names by clicking the name field (future feature)

## Project Structure

```
├── src/                    # Backend source code
│   ├── routes/            # API routes
│   │   └── faces.ts       # Face management endpoints
│   ├── storage/           # Data storage
│   │   └── faceStore.ts   # In-memory face database
│   ├── types/             # TypeScript types
│   │   └── face.ts        # Face data interfaces
│   └── server.ts          # Express server setup
│
├── web/                    # Frontend source code
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── FaceUpload.tsx       # Face registration form
│   │   │   ├── FaceRecognition.tsx  # Camera & recognition
│   │   │   └── FaceList.tsx         # Registered faces grid
│   │   ├── hooks/         # Custom React hooks
│   │   │   └── useFaceDetection.ts  # Face detection logic
│   │   ├── services/      # API client
│   │   │   └── api.ts     # Backend communication
│   │   ├── types/         # TypeScript types
│   │   │   └── face.ts    # Frontend type definitions
│   │   ├── App.tsx        # Main application component
│   │   └── main.tsx       # React entry point
│   └── public/
│       └── models/        # face-api.js model files
│
├── data/                   # Application data
│   └── faces.json         # Registered faces database
├── uploads/               # Uploaded face images
└── models/                # Symlink to web/public/models
```

## API Endpoints

### Face Management

- `GET /api/faces` - Get all registered faces
- `GET /api/faces/:id` - Get a specific face
- `POST /api/faces` - Add a new face (with image upload)
- `PUT /api/faces/:id` - Update face name
- `DELETE /api/faces/:id` - Delete a face

### Health Check

- `GET /api/health` - Server health status

## Configuration

### Environment Variables

Create a `.env` file in the root directory (optional):

```bash
PORT=3000
NODE_ENV=development
```

### Frontend Configuration

Create `web/.env` to override API URL:

```bash
VITE_API_URL=http://localhost:3000/api
```

## How It Works

1. **Face Registration**: When you upload a photo, face-api.js extracts a 128-dimensional face descriptor (mathematical representation of facial features)

2. **Face Detection**: The camera feed is analyzed in real-time using TinyFaceDetector for fast face detection

3. **Face Recognition**: Detected faces are compared against registered face descriptors using Euclidean distance

4. **Matching**: If the distance is below a threshold (0.6), the face is recognized and labeled with the person's name

5. **Visualization**: Bounding boxes and labels are drawn on a canvas overlay on top of the video stream

## Camera Permissions

When you first start the camera, your browser will ask for permission to access your webcam. You must grant this permission for the app to work.

### Troubleshooting Camera Access

- **macOS**: Go to System Preferences → Security & Privacy → Camera and ensure your browser has permission
- **Browser**: Check browser settings to ensure camera access is allowed for localhost

## Scripts

- `npm run dev` - Start backend server with hot reload
- `npm run start` - Start production backend server
- `npm run build` - Build backend TypeScript
- `npm run lint` - Type-check backend code
- `npm run dev:web` - Start frontend dev server (Vite)
- `npm run build:web` - Build frontend for production
- `npm run preview:web` - Preview production build

## Performance Tips

- Use clear, well-lit photos when registering faces
- Ensure faces are looking at the camera
- The TinyFaceDetector is optimized for speed but less accurate than SSD MobileNet
- For better accuracy, you can switch to SSD MobileNet in the code (slower but more accurate)

## Future Enhancements

- [ ] Multiple face images per person for better recognition
- [ ] Face recognition confidence threshold adjustment
- [ ] Export/import face database
- [ ] Face detection history and logging
- [ ] Support for different camera devices
- [ ] Mobile app version
- [ ] Database storage (SQLite/PostgreSQL)
- [ ] User authentication
- [ ] Facial expression detection
- [ ] Age and gender estimation

## Known Limitations

- Requires good lighting conditions for best results
- Recognition accuracy depends on photo quality
- Face angles and expressions can affect recognition
- Browser compatibility varies (best in Chrome/Edge)

## License

ISC

## Support

For issues or questions, please open an issue on the GitHub repository.

---

Built with face-api.js, React, and Express. Optimized for macOS.
