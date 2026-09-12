"""Services package for Face Recognition System."""

from backend.services.face_pipeline import FacePipeline, get_face_analyzer
from backend.services.face_detection import (
    detect_all_faces,
    validate_single_face,
    FaceDetectionError,
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    LowConfidenceError,
    DEFAULT_MIN_DETECTION_CONFIDENCE,
)
from backend.services.face_embedding import (
    extract_face_embedding,
    EMBEDDING_DIMENSION,
)
from backend.services.face_matching import (
    find_best_match,
    compute_cosine_similarity,
    DEFAULT_SIMILARITY_THRESHOLD,
)

__all__ = [
    "FacePipeline",
    "get_face_analyzer",
    "detect_all_faces",
    "validate_single_face",
    "FaceDetectionError",
    "NoFaceDetectedError",
    "MultipleFacesDetectedError",
    "LowConfidenceError",
    "DEFAULT_MIN_DETECTION_CONFIDENCE",
    "extract_face_embedding",
    "EMBEDDING_DIMENSION",
    "find_best_match",
    "compute_cosine_similarity",
    "DEFAULT_SIMILARITY_THRESHOLD",
]
