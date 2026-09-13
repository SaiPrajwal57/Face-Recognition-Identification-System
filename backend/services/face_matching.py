"""Face matching service for similarity computation and threshold-based unknown rejection.

NOTE: The similarity threshold is a configurable development starting point,
not a universally fixed constant. It should be tuned against validation datasets
and target false-accept/false-reject trade-offs.
"""

import os
from typing import List, Optional, Tuple
import numpy as np

# Configurable starting development threshold (can be set via environment variable)
DEFAULT_SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.50"))
DEFAULT_DUPLICATE_THRESHOLD: float = float(
    os.getenv("DUPLICATE_THRESHOLD", str(DEFAULT_SIMILARITY_THRESHOLD))
)


def compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Calculate cosine similarity between two numeric vectors.

    Args:
        vec_a: First numeric embedding vector.
        vec_b: Second numeric embedding vector.

    Returns:
        Cosine similarity score as a float between 0.0 and 1.0.
    """
    a = np.array(vec_a, dtype=np.float64)
    b = np.array(vec_b, dtype=np.float64)

    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    similarity = float(np.dot(a, b) / (norm_a * norm_b))
    # Clamp to realistic bounds [0.0, 1.0] for API consistency
    return max(0.0, min(1.0, round(similarity, 4)))


def find_best_match(
    query_embedding: List[float],
    enrolled_records: List[dict],
    threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
) -> Tuple[bool, Optional[dict], float]:
    """Compare a query face embedding against all enrolled individual records.

    Responsible strictly for similarity comparison, best candidate selection,
    and threshold-based unknown rejection.

    Args:
        query_embedding: 512-D vector representing the face to identify.
        enrolled_records: List of enrolled person records (each containing 'embedding').
        threshold: Minimum similarity score required for positive identification.

    Returns:
        Tuple of (is_identified, matched_person_dict_without_embedding, similarity_score).
    """
    if not enrolled_records:
        return False, None, 0.0

    best_match: Optional[dict] = None
    highest_similarity: float = 0.0

    for record in enrolled_records:
        stored_embedding = record.get("embedding")
        if not stored_embedding:
            continue

        sim = compute_cosine_similarity(query_embedding, stored_embedding)
        if sim > highest_similarity:
            highest_similarity = sim
            best_match = record

    if best_match is not None and highest_similarity >= threshold:
        # Strip embedding and internal metadata from the public match dictionary
        public_person = dict(best_match)
        public_person.pop("embedding", None)
        public_person.pop("metadata", None)
        return True, public_person, highest_similarity

    return False, None, highest_similarity
