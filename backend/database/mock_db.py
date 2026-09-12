"""In-memory mock database for temporary face recognition storage.

Maintains interface parity with mongo_db.py for isolated unit testing.
"""

from datetime import datetime, timezone
import threading
from typing import Any, Dict, List, Optional
import uuid


class MockDatabase:
    """Thread-safe in-memory storage for enrolled individuals."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._people: Dict[str, dict] = {}

    def connect(self) -> None:
        """Mock connection initialization."""
        pass

    def close(self) -> None:
        """Mock connection close."""
        pass

    def check_connection(self) -> bool:
        """Mock database is always locally connected."""
        return True

    def add_person(
        self,
        name: str,
        embedding: List[float],
        person_id: Optional[str] = None,
        image_meta: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Store a new person record with embedding and metadata."""
        with self._lock:
            pid = person_id or str(uuid.uuid4())
            if pid in self._people:
                raise ValueError(f"Person with ID '{pid}' already exists.")
            timestamp = datetime.now(timezone.utc).isoformat()
            record = {
                "id": pid,
                "name": name.strip(),
                "embedding": list(embedding),
                "created_at": timestamp,
                "image_meta": image_meta or {},
            }
            self._people[pid] = record
            return self._strip_embedding(record)

    def get_all_people(self, include_embeddings: bool = False) -> List[Dict[str, Any]]:
        """Retrieve all enrolled individuals.

        Embeddings are excluded by default for security and API contract compliance.
        """
        with self._lock:
            records = list(self._people.values())
            if include_embeddings:
                return [dict(r) for r in records]
            return [self._strip_embedding(r) for r in records]

    def get_person_by_id(
        self, person_id: str, include_embeddings: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Retrieve a specific person by ID."""
        with self._lock:
            record = self._people.get(person_id)
            if not record:
                return None
            if include_embeddings:
                return dict(record)
            return self._strip_embedding(record)

    def get_enrolled_embeddings(self) -> List[Dict[str, Any]]:
        """Retrieve all enrolled records with embeddings for matching."""
        with self._lock:
            return [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "embedding": list(r["embedding"]),
                    "created_at": r["created_at"],
                }
                for r in self._people.values()
            ]

    def delete_person(self, person_id: str) -> bool:
        """Delete a person by ID. Returns True if deleted, False if not found."""
        with self._lock:
            if person_id in self._people:
                del self._people[person_id]
                return True
            return False

    def clear_db(self) -> None:
        """Clear all records from the mock database."""
        with self._lock:
            self._people.clear()

    @staticmethod
    def _strip_embedding(record: dict) -> dict:
        """Return a public-facing copy of the record with embedding removed."""
        copy_rec = dict(record)
        copy_rec.pop("embedding", None)
        copy_rec.pop("image_meta", None)
        return copy_rec


# Global singleton instance of MockDatabase
mock_db = MockDatabase()
