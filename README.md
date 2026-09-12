# Face Recognition Identification System

A production-ready FastAPI backend for face enrollment, face identification, and person management using **InsightFace (SCRFD + ArcFace)**, **ONNX Runtime**, and **MongoDB Atlas**.

---

## 🌟 Key Features

- **Robust Face Detection**: Powered by **SCRFD** (InsightFace) for fast, accurate face detection and landmark extraction.
- **High-Dimensional ArcFace Embeddings**: Generates **512-dimensional unit-normalized L2 feature vectors** for state-of-the-art face recognition performance.
- **Strict Face Count Validation**: Enforces **strictly exactly 1 face** per image during enrollment and identification (rejects images with 0 or $>1$ faces with clear `400 Bad Request` messages).
- **Cosine Similarity Matching & Threshold Rejection**: Compares query face embeddings against enrolled identities using vector dot product with configurable unknown-face rejection (`SIMILARITY_THRESHOLD`).
- **MongoDB Atlas Integration**: Persists enrolled individuals, 512-D embeddings, and face metadata (`dimensions`, `confidence`, `bounding_box`) in MongoDB Cloud using PyMongo connection pooling and unique indexing on `person_id`.
- **Security & Privacy**: Face embeddings are strictly omitted from all public API outputs (`GET /api/v1/faces`, `GET /api/v1/faces/{person_id}`).
- **Interactive Documentation**: Built-in Swagger UI (`/docs`) and ReDoc (`/redoc`) for easy endpoint testing.
- **Dual Database Mode Support**: Seamlessly switch between `DATABASE_MODE=mongodb` for production/development and `DATABASE_MODE=mock` for isolated unit testing.

---

## 📁 Project Structure

```
backend/
├── main.py                      # FastAPI app entrypoint, CORS middleware, lifespan & health handlers
├── requirements.txt             # Python dependencies
├── .env.example                 # Example configuration template with placeholders
├── database/
│   ├── __init__.py              # Dynamic repository selector (get_db())
│   ├── mongo_db.py              # PyMongo connection pooling & Atlas CRUD operations
│   └── mock_db.py               # Thread-safe in-memory mock repository for unit testing
├── models/
│   ├── __init__.py
│   └── face.py                  # Pydantic request & response schemas
├── routers/
│   ├── __init__.py
│   └── face_routes.py           # REST endpoints (/api/v1/faces)
├── services/
│   ├── __init__.py
│   ├── face_pipeline.py        # Singleton FaceAnalysis manager & BGR image decoding
│   ├── face_detection.py        # SCRFD detection, confidence filtering & single-face validation
│   ├── face_embedding.py        # ArcFace 512-D L2-normalized feature extraction
│   └── face_matching.py         # Cosine similarity calculation & threshold rejection
└── tests/
    ├── __init__.py
    ├── test_api.py              # Automated unit test suite (15 test cases)
    └── test_mongo_integration.py# MongoDB Atlas live integration test suite
```

---

## 🛠️ Technology Stack

- **Framework**: FastAPI, Uvicorn
- **Computer Vision / AI**: InsightFace (`buffalo_sc` model pack), ONNX Runtime, OpenCV, Pillow, NumPy
- **Database**: MongoDB Atlas via PyMongo
- **Validation & Serialization**: Pydantic v2
- **Testing**: Python `unittest`, FastAPI `TestClient`

---

## 🚀 Getting Started

### 1. Prerequisites

- Python **3.10+** (Tested on Python 3.12)
- MongoDB Atlas cluster connection string

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/SaiPrajwal57/Face-Recognition-Identification-System.git
cd Face-Recognition-Identification-System

# Install required backend dependencies
python -m pip install -r backend/requirements.txt
```

### 3. Environment Configuration

Create a `backend/.env` file based on `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

Configure your `backend/.env` file:

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?appName=Cluster0
MONGODB_DATABASE=face_recognition_db
MONGODB_COLLECTION=people

# Database Mode: "mongodb" (Atlas) or "mock" (in-memory for unit tests)
DATABASE_MODE=mongodb

# Face Matching Similarity Threshold (default: 0.50)
SIMILARITY_THRESHOLD=0.50
```

> ⚠️ **Note**: `backend/.env` is ignored by Git and should never be committed.

---

## 🏃 Running the Application

Make sure your terminal is in the project root directory (`Face-Recognition-Identification-System`).

If your terminal is currently inside the `backend` folder, navigate back to root first:

```powershell
cd ..
```

Then start the Uvicorn development server:

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Once running, access:
- **Interactive API Documentation (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check Endpoint**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 📡 API Endpoints

### 1. Health Check
- **`GET /health`**
  - Checks server status and database connection.
  - **Response**:
    ```json
    {
      "status": "healthy",
      "database": "connected",
      "database_mode": "mongodb"
    }
    ```

### 2. Enroll Person
- **`POST /api/v1/faces/enroll`**
  - **Content-Type**: `multipart/form-data`
  - **Form Fields**:
    - `name` (string, required): Full name of the person.
    - `image` (file, required): Image file containing exactly one face.
  - **Response (`201 Created`)**:
    ```json
    {
      "success": true,
      "message": "Person enrolled successfully",
      "person_id": "c5d9a202-2776-40a6-aeb8-736be9226372",
      "name": "Alice Smith"
    }
    ```

### 3. Identify Face
- **`POST /api/v1/faces/identify`**
  - **Content-Type**: `multipart/form-data`
  - **Form Fields**:
    - `image` (file, required): Query image containing exactly one face.
  - **Response (Known Person - `200 OK`)**:
    ```json
    {
      "success": true,
      "identified": true,
      "person": {
        "id": "c5d9a202-2776-40a6-aeb8-736be9226372",
        "name": "Alice Smith",
        "created_at": "2026-09-12T17:40:39+00:00"
      },
      "similarity": 1.0,
      "message": "Face identified successfully"
    }
    ```
  - **Response (Unknown Person - `200 OK`)**:
    ```json
    {
      "success": true,
      "identified": false,
      "person": null,
      "similarity": 0.0184,
      "message": "Unknown face"
    }
    ```

### 4. List All Enrolled People
- **`GET /api/v1/faces`**
  - Returns a list of all enrolled individuals (embeddings omitted).
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

### 5. Get Person Details
- **`GET /api/v1/faces/{person_id}`**
  - **Response (`200 OK`)**:
    ```json
    {
      "id": "c5d9a202-2776-40a6-aeb8-736be9226372",
      "name": "Alice Smith",
      "created_at": "2026-09-12T17:40:39+00:00"
    }
    ```

### 6. Delete Person
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

## 🧪 Running Automated Tests

Run the full automated test suites using `unittest`:

```bash
# Run unit test suite (isolated mock database)
python -m unittest backend/tests/test_api.py -v

# Run MongoDB Atlas integration test suite (live MongoDB connection required)
python -m unittest backend/tests/test_mongo_integration.py -v
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
