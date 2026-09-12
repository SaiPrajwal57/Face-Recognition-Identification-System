"""InsightFace and ONNX Runtime pipeline manager.

Loads and maintains the singleton FaceAnalysis instance with SCRFD detection
and ArcFace embedding models.
"""

import threading
from typing import Optional
import cv2
import numpy as np
from insightface.app import FaceAnalysis


class FacePipeline:
    """Thread-safe singleton wrapper for InsightFace models."""

    _instance: Optional["FacePipeline"] = None
    _lock = threading.Lock()

    def __init__(self, model_name: str = "buffalo_sc") -> None:
        self.model_name = model_name
        self.app: Optional[FaceAnalysis] = None
        self._init_model()

    def _init_model(self) -> None:
        """Initialize and prepare InsightFace models on CPU."""
        self.app = FaceAnalysis(
            name=self.model_name,
            providers=["CPUExecutionProvider"],
        )
        self.app.prepare(ctx_id=0, det_size=(640, 640))

    @classmethod
    def get_instance(cls, model_name: str = "buffalo_sc") -> "FacePipeline":
        """Get or initialize singleton instance."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls(model_name=model_name)
            return cls._instance

    @staticmethod
    def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
        """Decode raw image bytes into an OpenCV BGR numpy array.

        Args:
            image_bytes: Raw bytes from uploaded file.

        Returns:
            Decoded numpy array in BGR format.

        Raises:
            ValueError: If bytes cannot be decoded into a valid image.
        """
        if not image_bytes or len(image_bytes) == 0:
            raise ValueError("Uploaded image file is empty.")

        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Failed to decode image. Invalid or corrupt image file.")

        return img


# Helper function to get initialized analyzer
def get_face_analyzer() -> FaceAnalysis:
    """Return the initialized FaceAnalysis application instance."""
    return FacePipeline.get_instance().app
