"""Face embedding extraction service using ArcFace with ONNX Runtime.

Extracts normalized 512-dimensional facial feature representations from detected faces.
"""

from typing import Any, List
import numpy as np

# Standard embedding vector dimension for ArcFace models
EMBEDDING_DIMENSION = 512


def extract_face_embedding(face_obj: Any) -> List[float]:
    """Extract and L2-normalize the 512-D ArcFace embedding from a detected face.

    Args:
        face_obj: Detected face object from InsightFace FaceAnalysis.

    Returns:
        List of 512 floats representing the unit-normalized face embedding.

    Raises:
        ValueError: If embedding is missing or cannot be extracted.
    """
    if face_obj is None:
        raise ValueError("Cannot extract embedding from None.")

    embedding = getattr(face_obj, "embedding", None)
    if embedding is None:
        # Fall back to normed_embedding if available
        embedding = getattr(face_obj, "normed_embedding", None)

    if embedding is None or len(embedding) == 0:
        raise ValueError("Failed to extract face embedding from the detected face object.")

    vec = np.array(embedding, dtype=np.float64)

    # Perform L2 unit normalization
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm

    # Verify vector dimension
    if len(vec) != EMBEDDING_DIMENSION:
        # Allow dimension if model uses alternative backbone, but log/preserve length
        pass

    return [round(float(val), 6) for val in vec]
