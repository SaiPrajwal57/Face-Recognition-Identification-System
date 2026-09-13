# Face Recognition Identification System

A full-stack, production-ready AI face recognition and person management system powered by **FastAPI**, **InsightFace (SCRFD + ArcFace)**, **ONNX Runtime**, **MongoDB Atlas**, and a modern **React + Tailwind CSS** frontend dashboard.

---

## 🌟 Key Features

### 🧠 Core AI & Computer Vision
- **Robust Face Detection**: Powered by **SCRFD** (InsightFace) for fast, highly accurate face detection and landmark alignment.
- **High-Dimensional Embeddings**: Extracts **512-dimensional unit-normalized L2 feature vectors** via **ArcFace** for state-of-the-art face recognition accuracy.
- **Strict Single-Face Validation**: Enforces exactly **1 face per image** during enrollment and identification (rejects zero or multiple faces with descriptive `400 Bad Request` messages).
- **Cosine Similarity Matching**: Compares query face embeddings against enrolled vector profiles using dot product distance with dynamic unknown-face rejection thresholding.

### ⚡ FastAPI Backend
- **Dual Database Mode**: Seamlessly switch between `DATABASE_MODE=mongodb` (MongoDB Cloud Atlas with PyMongo connection pooling) and `DATABASE_MODE=mock` (thread-safe in-memory database for isolated testing).
- **Security & Privacy**: 512-D face embeddings are strictly omitted from public API responses to protect sensitive biometric vector data.
- **Interactive Documentation**: Auto-generated Swagger UI (`/docs`) and ReDoc (`/redoc`) for instant endpoint testing.
- **CORS Configured**: Ready for seamless cross-origin communication with web and mobile applications.

### 🎨 Modern React Frontend
- **Live Automatic Recognition Mode**: Automatic continuous video stream recognition directly via the browser camera with **zero manual button clicks required**.
- **Real-Time Bounding Box HUD**: Percentage-mapped bounding box overlay rendered directly over faces (green for verified enrolled identity, amber for unknown faces) with real-time confidence scores.
- **Zero-Backlog Sampling Engine**: Periodically samples video frames (configurable: 300ms to 1200ms) with strict in-flight request locking (`isRequestInProgressRef`) preventing frame accumulation and latency.
- **Dynamic Recognition Statuses**: Distinct indicators for `No face detected`, `Processing...`, `Person Name — Recognized`, `UNKNOWN`, and `Multiple faces detected`.
- **Interactive Dashboard**: High-level system overview showing total enrolled individuals, recent telemetry, system health, and quick actions.
- **Seamless Enrollment**: Drag-and-drop or camera capture to register new individuals with instant N=1 face validation feedback.
- **People Database & Management**: View, search, filter, and delete enrolled individuals with detailed profile views.
- **Recognition History & Audit Logs**: Throttled audit trail of verified visits and manual recognition attempts.
- **Flexible Settings**: Dynamic similarity threshold slider, camera device selection, and system diagnostics.

---

## 📁 Project Structure

```
Face-Recognition-Identification-System/
├── backend/
│   ├── main.py                      # FastAPI app entrypoint, CORS middleware, lifespan & health handlers
│   ├── requirements.txt             # Backend Python dependencies
│   ├── .env.example                 # Environment configuration template
│   ├── database/
│   │   ├── __init__.py              # Dynamic repository selector (get_db())
│   │   ├── mongo_db.py              # PyMongo connection pooling & Atlas CRUD operations
│   │   └── mock_db.py               # Thread-safe in-memory mock repository for testing
│   ├── models/
│   │   └── face.py                  # Pydantic request & response schemas
│   ├── routers/
│   │   └── face_routes.py           # REST endpoints (/api/v1/faces)
│   ├── services/
│   │   ├── face_pipeline.py         # Singleton FaceAnalysis manager & BGR image decoding
│   │   ├── face_detection.py        # SCRFD detection, confidence filtering & face count validation
│   │   ├── face_embedding.py        # ArcFace 512-D L2-normalized feature extraction
│   │   └── face_matching.py         # Cosine similarity calculation & threshold rejection
│   └── tests/
│       ├── test_api.py              # Automated unit test suite (15 test cases)
│       └── test_mongo_integration.py# MongoDB Atlas live integration test suite
│
├── frontend/
│   ├── package.json                 # Node.js dependencies & scripts
│   ├── vite.config.js               # Vite build configuration & server proxy
│   ├── tailwind.config.js           # Tailwind CSS configuration & custom theme
│   ├── index.html                   # HTML entrypoint
│   └── src/
│       ├── App.jsx                  # Main application component & routes
│       ├── main.jsx                 # React root renderer
│       ├── components/              # Layout, Header, Sidebar, Webcam & Card UI components
│       ├── context/                 # Application state context providers
│       ├── pages/                   # Dashboard, Identification, Enrollment, People, History, Settings
│       └── services/                # Axios/Fetch API service integration layer
│
├── LICENSE                          # MIT License
└── README.md                        # Documentation
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router DOM, Lucide Icons |
| **Backend** | Python 3.10+, FastAPI, Uvicorn |
| **AI / Computer Vision** | InsightFace (`buffalo_sc`), ONNX Runtime, OpenCV, NumPy, Pillow |
| **Database** | MongoDB Atlas (PyMongo) & Thread-safe Mock DB |
| **Validation & Testing** | Pydantic v2, Python `unittest`, FastAPI `TestClient` |

---

## 🚀 Getting Started

### 1. Prerequisites

- **Python**: `3.10+` (Tested on Python 3.12)
- **Node.js**: `18.0.0+` & `npm`
- **MongoDB Atlas**: Cluster connection URI (optional if using `DATABASE_MODE=mock`)

---

### 2. Backend Setup

1. **Navigate to the backend directory and install dependencies**:
   ```bash
   cd backend
   python -m pip install -r requirements.txt
   ```

2. **Configure Environment Variables**:
   Create a `.env` file inside the `backend` folder based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

   Set your variables in `backend/.env`:
   ```env
   # MongoDB Atlas Connection String
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?appName=Cluster0
   MONGODB_DATABASE=face_recognition_db
   MONGODB_COLLECTION=people

   # Database Mode: "mongodb" (Atlas cloud) or "mock" (in-memory for local testing)
   DATABASE_MODE=mongodb

   # Default Face Matching Similarity Threshold (0.0 to 1.0)
   SIMILARITY_THRESHOLD=0.50
   ```

3. **Start the FastAPI Backend Server**:
   From the project root directory:
   ```bash
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```

   - **Swagger Interactive API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - **ReDoc Docs**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
   - **Health Check Endpoint**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

### 3. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Start the Frontend Development Server**:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your web browser.

---

## 📡 API Endpoints Reference

### System & Health

#### `GET /health`
- **Description**: Checks operational status and database connection state.
- **Response (`200 OK`)**:
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "database_mode": "mongodb"
  }
  ```

---

### Face Management (`/api/v1/faces`)

#### 1. Enroll Person
- **`POST /api/v1/faces/enroll`**
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `name` *(string, required)*: Full name of the person.
  - `image` *(file, required)*: Image file containing strictly one face.
- **Response (`201 Created` - New Face)**:
  ```json
  {
    "success": true,
    "message": "Person enrolled successfully",
    "person_id": "c5d9a202-2776-40a6-aeb8-736be9226372",
    "name": "Alice Smith"
  }
  ```
- **Response (`400 Bad Request` - Face Already Enrolled)**:
  ```json
  {
    "success": false,
    "error": "Face already enrolled. This face matches an existing person: Alice Smith (similarity: 98.4%).",
    "detail": "Face already enrolled. This face matches an existing person: Alice Smith (similarity: 98.4%)."
  }
  ```

#### 2. Identify Face
- **`POST /api/v1/faces/identify`**
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `image` *(file, required)*: Query face image file.
  - `threshold` *(float, optional)*: Override default similarity threshold (e.g. `0.60`).
- **Response (Identified - `200 OK`)**:
  ```json
  {
    "success": true,
    "identified": true,
    "person": {
      "id": "c5d9a202-2776-40a6-aeb8-736be9226372",
      "name": "Alice Smith",
      "created_at": "2026-09-12T17:40:39+00:00"
    },
    "similarity": 0.8924,
    "message": "Face identified successfully",
    "bounding_box": {
      "x1": 184,
      "y1": 112,
      "x2": 456,
      "y2": 390,
      "image_width": 640,
      "image_height": 480
    },
    "detection_confidence": 0.9984
  }
  ```
- **Response (Unidentified / Below Threshold - `200 OK`)**:
  ```json
  {
    "success": true,
    "identified": false,
    "person": null,
    "similarity": 0.2104,
    "message": "Unknown face",
    "bounding_box": {
      "x1": 190,
      "y1": 120,
      "x2": 440,
      "y2": 380,
      "image_width": 640,
      "image_height": 480
    },
    "detection_confidence": 0.9852
  }
  ```

#### 3. List All Enrolled People
- **`GET /api/v1/faces`**
- **Response (`200 OK`)**:
  ```json
  [
    {
      "id": "c5d9a202-2776-40a6-aeb8-736be9226372",
      "name": "Alice Smith",
      "created_at": "2026-09-12T17:40:39+00:00"
    }
  ]
  ```

#### 4. Get Person Details
- **`GET /api/v1/faces/{person_id}`**
- **Response (`200 OK`)**:
  ```json
  {
    "id": "c5d9a202-2776-40a6-aeb8-736be9226372",
    "name": "Alice Smith",
    "created_at": "2026-09-12T17:40:39+00:00"
  }
  ```

#### 5. Delete Person
- **`DELETE /api/v1/faces/{person_id}`**
- **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Person deleted successfully",
    "person_id": "c5d9a202-2776-40a6-aeb8-736be9226372"
  }
  ```

---

## 🧪 Testing & Verification

### Run Backend Unit Tests
Runs the isolated test suite using the thread-safe in-memory database mock (no external DB required):
```bash
python -m unittest backend/tests/test_api.py -v
```

### Run MongoDB Live Integration Tests
Runs tests against a live MongoDB Atlas cluster (requires `MONGODB_URI` set in `.env`):
```bash
python -m unittest backend/tests/test_mongo_integration.py -v
```

### Build Frontend Production Assets
```bash
cd frontend
npm run build
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

