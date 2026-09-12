"""MongoDB Atlas database repository for the Face Recognition Identification System.

Handles connection pooling, CRUD operations, unique indexing, and data serialization
for enrolled person records and 512-D face embeddings.
"""

from datetime import datetime, timezone
import logging
import os
from typing import Any, Dict, List, Optional
import uuid

from dotenv import load_dotenv
import pymongo
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, DuplicateKeyError, PyMongoError

# Load environment variables from backend/.env if present
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

logger = logging.getLogger("face_recognition.database")


class MongoDBDatabase:
    """Reusable MongoDB connection and repository client."""

    def __init__(self) -> None:
        self._client: Optional[pymongo.MongoClient] = None
        self._db: Optional[Database] = None
        self._collection: Optional[Collection] = None
        self._connected: bool = False

    def _get_config(self) -> tuple[str, str, str]:
        """Fetch database configuration from environment variables."""
        uri = os.getenv("MONGODB_URI")
        if not uri:
            raise ValueError("MONGODB_URI environment variable is not configured.")
        database_name = os.getenv("MONGODB_DATABASE", "face_recognition_db")
        collection_name = os.getenv("MONGODB_COLLECTION", "people")
        return uri, database_name, collection_name

    def connect(self) -> None:
        """Initialize MongoDB client and ensure indexes. Reuses existing client if active."""
        if self._client is not None and self._connected:
            return

        try:
            uri, db_name, coll_name = self._get_config()
            self._client = pymongo.MongoClient(
                uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                maxPoolSize=50,
                minPoolSize=5,
                retryWrites=True,
            )
            # Verify connectivity
            self._client.admin.command("ping")
            self._db = self._client[db_name]
            self._collection = self._db[coll_name]

            # Ensure unique index on person_id
            self._collection.create_index("person_id", unique=True)
            self._connected = True
            logger.info("Successfully connected to MongoDB Atlas.")
        except ConnectionFailure as exc:
            self._connected = False
            logger.error("Failed to connect to MongoDB Atlas: ConnectionFailure")
            raise ConnectionError("Unable to establish connection to MongoDB Atlas.") from exc
        except PyMongoError as exc:
            self._connected = False
            logger.error("MongoDB Atlas initialization error: %s", type(exc).__name__)
            raise ConnectionError("MongoDB Atlas initialization failed.") from exc

    def close(self) -> None:
        """Close the MongoDB client connection."""
        if self._client:
            self._client.close()
            self._client = None
            self._db = None
            self._collection = None
            self._connected = False
            logger.info("MongoDB client connection closed.")

    def check_connection(self) -> bool:
        """Check if MongoDB is reachable. Returns True if healthy, False otherwise."""
        try:
            if self._client is None:
                self.connect()
            if self._client is not None:
                self._client.admin.command("ping")
                return True
            return False
        except Exception:
            return False

    @property
    def collection(self) -> Collection:
        """Get the active collection, connecting if not already connected."""
        if self._collection is None or not self._connected:
            self.connect()
        assert self._collection is not None
        return self._collection

    def add_person(
        self,
        name: str,
        embedding: List[float],
        person_id: Optional[str] = None,
        image_meta: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Insert a newly enrolled person record with ArcFace embedding.

        Args:
            name: Full name of the individual.
            embedding: 512-D L2-normalized floating point vector.
            person_id: Optional unique identifier (generated if omitted).
            image_meta: Metadata describing image dimensions, bounding box, confidence.

        Returns:
            Dictionary with public-facing fields (id, name, created_at).
        """
        pid = person_id or str(uuid.uuid4())
        now_utc = datetime.now(timezone.utc).isoformat()

        doc = {
            "person_id": pid,
            "name": name.strip(),
            "embedding": [float(v) for v in embedding],
            "image_meta": image_meta or {},
            "created_at": now_utc,
            "updated_at": now_utc,
        }

        try:
            self.collection.insert_one(doc)
            return {
                "id": pid,
                "name": doc["name"],
                "created_at": now_utc,
            }
        except DuplicateKeyError as exc:
            logger.error("Duplicate person_id encountered: %s", pid)
            raise ValueError(f"Person with ID '{pid}' already exists.") from exc
        except PyMongoError as exc:
            logger.error("Database error inserting person: %s", type(exc).__name__)
            raise RuntimeError("Database error occurred while enrolling person.") from exc

    def get_all_people(self, include_embeddings: bool = False) -> List[Dict[str, Any]]:
        """Retrieve all enrolled individuals.

        Embeddings are strictly excluded by default for security and contract compliance.
        """
        try:
            projection = {
                "person_id": 1,
                "name": 1,
                "created_at": 1,
                "_id": 0,
            }
            if include_embeddings:
                projection["embedding"] = 1
                projection["image_meta"] = 1

            cursor = self.collection.find({}, projection).sort("created_at", -1)
            results = []
            for doc in cursor:
                record = {
                    "id": doc["person_id"],
                    "name": doc["name"],
                    "created_at": doc.get("created_at", ""),
                }
                if include_embeddings:
                    record["embedding"] = doc.get("embedding", [])
                    record["image_meta"] = doc.get("image_meta", {})
                results.append(record)
            return results
        except PyMongoError as exc:
            logger.error("Database error fetching all people: %s", type(exc).__name__)
            raise RuntimeError("Database error occurred while retrieving enrolled individuals.") from exc

    def get_person_by_id(
        self, person_id: str, include_embeddings: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Retrieve details of a specific enrolled person by ID.

        Returns None if person does not exist.
        """
        try:
            projection = {
                "person_id": 1,
                "name": 1,
                "created_at": 1,
                "_id": 0,
            }
            if include_embeddings:
                projection["embedding"] = 1
                projection["image_meta"] = 1

            doc = self.collection.find_one({"person_id": person_id}, projection)
            if not doc:
                return None

            record = {
                "id": doc["person_id"],
                "name": doc["name"],
                "created_at": doc.get("created_at", ""),
            }
            if include_embeddings:
                record["embedding"] = doc.get("embedding", [])
                record["image_meta"] = doc.get("image_meta", {})
            return record
        except PyMongoError as exc:
            logger.error("Database error fetching person %s: %s", person_id, type(exc).__name__)
            raise RuntimeError("Database error occurred while retrieving person details.") from exc

    def get_enrolled_embeddings(self) -> List[Dict[str, Any]]:
        """Retrieve all enrolled embeddings with IDs for similarity matching.

        Returns:
            List of dicts formatted with 'id', 'name', 'embedding', 'created_at'.
        """
        try:
            projection = {
                "person_id": 1,
                "name": 1,
                "embedding": 1,
                "created_at": 1,
                "_id": 0,
            }
            cursor = self.collection.find({}, projection)
            return [
                {
                    "id": doc["person_id"],
                    "name": doc["name"],
                    "embedding": doc.get("embedding", []),
                    "created_at": doc.get("created_at", ""),
                }
                for doc in cursor
            ]
        except PyMongoError as exc:
            logger.error("Database error retrieving enrolled embeddings: %s", type(exc).__name__)
            raise RuntimeError("Database error occurred while fetching embeddings for matching.") from exc

    def delete_person(self, person_id: str) -> bool:
        """Delete an enrolled person by ID. Returns True if deleted, False if not found."""
        try:
            result = self.collection.delete_one({"person_id": person_id})
            return result.deleted_count > 0
        except PyMongoError as exc:
            logger.error("Database error deleting person %s: %s", person_id, type(exc).__name__)
            raise RuntimeError("Database error occurred while deleting person.") from exc

    def clear_db(self) -> None:
        """Delete all documents in the collection (for testing or reset purposes)."""
        try:
            self.collection.delete_many({})
        except PyMongoError as exc:
            logger.error("Database error clearing collection: %s", type(exc).__name__)
            raise RuntimeError("Database error occurred while clearing database.") from exc


# Singleton instance
mongo_db = MongoDBDatabase()
