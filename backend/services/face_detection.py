"""Face detection service using SCRFD (InsightFace) with ONNX Runtime.

Handles face detection, count validation, confidence thresholds, and landmark extraction.
"""

from typing import Any, Dict, List, Tuple
from backend.services.face_pipeline import FacePipeline, get_face_analyzer


class FaceDetectionError(Exception):
    """Base exception for face detection and image processing errors."""
    pass


class NoFaceDetectedError(FaceDetectionError):
    """Raised when no face is found in the input image."""
    pass


class MultipleFacesDetectedError(FaceDetectionError):
    """Raised when more than one face is detected in an image."""
    pass


class LowConfidenceError(FaceDetectionError):
    """Raised when detected face confidence is below acceptable threshold."""
    pass


# Configurable default minimum detection confidence threshold
DEFAULT_MIN_DETECTION_CONFIDENCE: float = 0.50


def detect_all_faces(
    image_bytes: bytes,
    min_confidence: float = DEFAULT_MIN_DETECTION_CONFIDENCE,
) -> List[Any]:
    """Detect all faces in the provided image bytes.

    Args:
        image_bytes: Raw bytes from the uploaded image.
        min_confidence: Minimum detection score (0.0 to 1.0).

    Returns:
        List of detected face objects with landmarks and embeddings.

    Raises:
        FaceDetectionError: If image bytes are invalid or cannot be decoded.
    """
    try:
        bgr_image = FacePipeline.decode_image_bytes(image_bytes)
    except ValueError as exc:
        raise FaceDetectionError(str(exc)) from exc

    analyzer = get_face_analyzer()
    faces = analyzer.get(bgr_image)

    # Filter by confidence threshold
    valid_faces = [f for f in faces if getattr(f, "det_score", 0.0) >= min_confidence]
    return valid_faces


def validate_single_face(
    image_bytes: bytes,
    min_confidence: float = DEFAULT_MIN_DETECTION_CONFIDENCE,
) -> Tuple[Any, Dict[str, Any]]:
    """Validate that the image contains exactly one detectable face with sufficient confidence.

    Args:
        image_bytes: Raw bytes from the uploaded image.
        min_confidence: Minimum detection score required.

    Returns:
        Tuple of (face_object, face_metadata_dictionary).

    Raises:
        NoFaceDetectedError: If zero faces are found.
        MultipleFacesDetectedError: If more than one face is found.
        LowConfidenceError: If the detected face is below the confidence threshold.
        FaceDetectionError: If the image cannot be decoded.
    """
    try:
        bgr_image = FacePipeline.decode_image_bytes(image_bytes)
    except ValueError as exc:
        raise FaceDetectionError(str(exc)) from exc

    analyzer = get_face_analyzer()
    raw_faces = analyzer.get(bgr_image)

    if len(raw_faces) == 0:
        raise NoFaceDetectedError("No face detected in the provided image. Please provide a clear, front-facing photo.")

    if len(raw_faces) > 1:
        # Check how many pass the confidence threshold
        confident_faces = [f for f in raw_faces if getattr(f, "det_score", 0.0) >= min_confidence]
        if len(confident_faces) > 1:
            raise MultipleFacesDetectedError(
                f"Multiple faces detected (found {len(confident_faces)}). Exactly one face is required."
            )
        if len(confident_faces) == 0:
            raise LowConfidenceError(
                "Detected faces did not meet the minimum confidence threshold. Please provide a clearer photo."
            )
        face = confident_faces[0]
    else:
        face = raw_faces[0]
        confidence = float(getattr(face, "det_score", 0.0))
        if confidence < min_confidence:
            raise LowConfidenceError(
                f"Face detection confidence too low ({confidence:.2f} < {min_confidence:.2f}). Please provide a clearer photo."
            )

    bbox = [int(v) for v in face.bbox.tolist()] if hasattr(face, "bbox") else []
    confidence = float(getattr(face, "det_score", 0.0))

    metadata = {
        "bounding_box": {
            "x1": bbox[0] if len(bbox) > 0 else 0,
            "y1": bbox[1] if len(bbox) > 1 else 0,
            "x2": bbox[2] if len(bbox) > 2 else 0,
            "y2": bbox[3] if len(bbox) > 3 else 0,
            "image_width": int(bgr_image.shape[1]),
            "image_height": int(bgr_image.shape[0]),
        },
        "confidence": round(confidence, 4),
        "landmarks_count": len(face.kps) if hasattr(face, "kps") and face.kps is not None else 0,
    }

    return face, metadata
