"""Integration tests for MongoDB Atlas database repository."""

import os
import unittest
import uuid
from backend.database.mongo_db import MongoDBDatabase


class MongoDBAtlasIntegrationTestCase(unittest.TestCase):
    """Verifies live operations against the configured MongoDB Atlas cluster."""

    @classmethod
    def setUpClass(cls):
        """Initialize MongoDB client and ensure connection."""
        cls.db = MongoDBDatabase()
        try:
            cls.db.connect()
            cls.connected = cls.db.check_connection()
        except Exception:
            cls.connected = False

    def setUp(self):
        """Skip if MongoDB Atlas connection cannot be established."""
        if not self.connected:
            self.skipTest("MongoDB Atlas connection not available.")
        self.test_pids = []

    def tearDown(self):
        """Clean up test records inserted during the test."""
        for pid in self.test_pids:
            try:
                self.db.delete_person(pid)
            except Exception:
                pass

    def test_atlas_connectivity(self):
        """Test that ping succeeds against the remote MongoDB Atlas cluster."""
        self.assertTrue(self.db.check_connection())

    def test_add_and_get_person(self):
        """Test inserting a document with 512-D embedding and retrieving it."""
        mock_embedding = [0.01] * 512
        meta = {
            "dimensions": [120, 140],
            "face_confidence": 0.99,
            "bounding_box": [10, 20, 130, 160],
        }

        record = self.db.add_person(
            name="Test User Atlas",
            embedding=mock_embedding,
            image_meta=meta,
        )
        pid = record["id"]
        self.test_pids.append(pid)

        self.assertEqual(record["name"], "Test User Atlas")
        self.assertIn("created_at", record)

        # Retrieve public details - embedding must not be exposed
        fetched = self.db.get_person_by_id(pid, include_embeddings=False)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched["id"], pid)
        self.assertEqual(fetched["name"], "Test User Atlas")
        self.assertNotIn("embedding", fetched)

        # Retrieve internal details for matching - embedding must be present
        with_emb = self.db.get_person_by_id(pid, include_embeddings=True)
        self.assertIsNotNone(with_emb)
        self.assertIn("embedding", with_emb)
        self.assertEqual(len(with_emb["embedding"]), 512)

    def test_enrolled_embeddings_list(self):
        """Test retrieving list of embeddings for matching service."""
        mock_embedding = [0.05] * 512
        record = self.db.add_person(
            name="Test Matching Candidate",
            embedding=mock_embedding,
        )
        pid = record["id"]
        self.test_pids.append(pid)

        embeddings_list = self.db.get_enrolled_embeddings()
        pids = [r["id"] for r in embeddings_list]
        self.assertIn(pid, pids)
        target = next(r for r in embeddings_list if r["id"] == pid)
        self.assertEqual(len(target["embedding"]), 512)

    def test_delete_person(self):
        """Test deleting an enrolled person from MongoDB Atlas."""
        mock_embedding = [0.02] * 512
        record = self.db.add_person(
            name="Temporary Person",
            embedding=mock_embedding,
        )
        pid = record["id"]

        # Delete record
        deleted = self.db.delete_person(pid)
        self.assertTrue(deleted)

        # Verify record no longer exists
        self.assertIsNone(self.db.get_person_by_id(pid))

        # Second deletion should return False
        self.assertFalse(self.db.delete_person(pid))


if __name__ == "__main__":
    unittest.main()
