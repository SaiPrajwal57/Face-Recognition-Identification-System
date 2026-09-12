"""Automated test suite for the Face Recognition Identification System with real InsightFace pipeline."""

import io
import os
import unittest

# Ensure unit test suite uses isolated mock database
os.environ["DATABASE_MODE"] = "mock"

from fastapi.testclient import TestClient
from PIL import Image

from backend.database import get_db
from backend.main import app

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "test_assets")


class FaceRecognitionPipelineTestCase(unittest.TestCase):
    """Full integration test suite covering API contracts, real detection, and ArcFace embeddings."""

    @classmethod
    def setUpClass(cls):
        """Load test image assets."""
        cls.person1_path = os.path.join(ASSETS_DIR, "person1_a.jpg")
        cls.person2_path = os.path.join(ASSETS_DIR, "person2.jpg")
        cls.multi_face_path = os.path.join(ASSETS_DIR, "multi_faces.jpg")

        with open(cls.person1_path, "rb") as f:
            cls.person1_bytes = f.read()

        with open(cls.person2_path, "rb") as f:
            cls.person2_bytes = f.read()

        with open(cls.multi_face_path, "rb") as f:
            cls.multi_face_bytes = f.read()

    def setUp(self):
        """Reset the active database before each test."""
        self.db = get_db()
        self.db.clear_db()
        self.client = TestClient(app)

    def tearDown(self):
        """Clean up the active database after each test."""
        self.db.clear_db()

    @staticmethod
    def create_blank_image_bytes(color: str = "white", size: tuple = (200, 200)) -> bytes:
        """Create an image without any face to test no-face rejection."""
        img = Image.new("RGB", size, color=color)
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        return buf.getvalue()

    def test_01_health_check(self):
        """Test 1: GET /health returns status 200 and healthy."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["database"], "connected")

    def test_02_enroll_empty_name(self):
        """Test 2: POST /api/v1/faces/enroll rejects empty name with 400."""
        response = self.client.post(
            "/api/v1/faces/enroll",
            data={"name": "   "},
            files={"image": ("face.jpg", self.person1_bytes, "image/jpeg")},
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertIn("Person name cannot be empty", data["detail"])

    def test_03_enroll_invalid_file_type(self):
        """Test 3: POST /api/v1/faces/enroll rejects non-image upload with 400."""
        response = self.client.post(
            "/api/v1/faces/enroll",
            data={"name": "Alice"},
            files={"image": ("doc.txt", b"plain text", "text/plain")},
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertIn("Invalid file type", data["detail"])

    def test_04_enroll_no_face_detected(self):
        """Test 4: POST /api/v1/faces/enroll rejects image with no face with 400."""
        blank_image = self.create_blank_image_bytes()
        response = self.client.post(
            "/api/v1/faces/enroll",
            data={"name": "Ghost"},
            files={"image": ("blank.jpg", blank_image, "image/jpeg")},
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertIn("No face detected", data["detail"])

    def test_05_enroll_multiple_faces_detected(self):
        """Test 5: POST /api/v1/faces/enroll rejects image with >1 faces with 400."""
        response = self.client.post(
            "/api/v1/faces/enroll",
            data={"name": "Group Photo"},
            files={"image": ("multi.jpg", self.multi_face_bytes, "image/jpeg")},
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertIn("Multiple faces detected", data["detail"])

    def test_06_enroll_success(self):
        """Test 6: POST /api/v1/faces/enroll successfully enrolls a valid single face."""
        response = self.client.post(
            "/api/v1/faces/enroll",
            data={"name": "Alice Smith"},
            files={"image": ("alice.jpg", self.person1_bytes, "image/jpeg")},
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["name"], "Alice Smith")
        self.assertIn("person_id", data)
        self.assertTrue(len(data["person_id"]) > 0)

    def test_07_list_enrolled_people_omits_embeddings(self):
        """Test 7: GET /api/v1/faces lists enrolled people without exposing embeddings."""
        self.client.post(
            "/api/v1/faces/enroll",
            data={"name": "Alice Smith"},
            files={"image": ("alice.jpg", self.person1_bytes, "image/jpeg")},
        )
        self.client.post(
            "/api/v1/faces/enroll",
            data={"name": "Bob Jones"},
            files={"image": ("bob.jpg", self.person2_bytes, "image/jpeg")},
        )

        response = self.client.get("/api/v1/faces")
        self.assertEqual(response.status_code, 200)
        people = response.json()
        self.assertEqual(len(people), 2)

        for person in people:
            self.assertIn("id", person)
            self.assertIn("name", person)
            self.assertIn("created_at", person)
            self.assertNotIn("embedding", person)
            self.assertNotIn("image_meta", person)

    def test_08_get_enrolled_person_by_id(self):
        """Test 8: GET /api/v1/faces/{person_id} returns single person details."""
        enroll_resp = self.client.post(
            "/api/v1/faces/enroll",
            data={"name": "Alice Smith"},
            files={"image": ("alice.jpg", self.person1_bytes, "image/jpeg")},
        )
        person_id = enroll_resp.json()["person_id"]

        response = self.client.get(f"/api/v1/faces/{person_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], person_id)
        self.assertEqual(data["name"], "Alice Smith")
        self.assertNotIn("embedding", data)

    def test_09_get_nonexistent_person_returns_404(self):
        """Test 9: GET /api/v1/faces/{person_id} returns 404 for nonexistent ID."""
        response = self.client.get("/api/v1/faces/invalid-id-999")
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertIn("not found", data["detail"].lower())

    def test_10_identify_no_face_in_query(self):
        """Test 10: POST /api/v1/faces/identify rejects no-face query with 400."""
        blank_image = self.create_blank_image_bytes()
        response = self.client.post(
            "/api/v1/faces/identify",
            files={"image": ("blank.jpg", blank_image, "image/jpeg")},
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertIn("No face detected", data["detail"])

    def test_11_identify_multi_face_in_query(self):
        """Test 11: POST /api/v1/faces/identify rejects multi-face query with 400."""
        response = self.client.post(
            "/api/v1/faces/identify",
            files={"image": ("multi.jpg", self.multi_face_bytes, "image/jpeg")},
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertIn("Multiple faces detected", data["detail"])

    def test_12_identify_empty_database_returns_unknown(self):
        """Test 12: POST /api/v1/faces/identify returns unknown when DB has no enrolled people."""
        response = self.client.post(
            "/api/v1/faces/identify",
            files={"image": ("alice.jpg", self.person1_bytes, "image/jpeg")},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertFalse(data["identified"])
        self.assertIsNone(data["person"])
        self.assertEqual(data["message"], "Unknown face")

    def test_13_identify_known_face_match(self):
        """Test 13: POST /api/v1/faces/identify correctly matches enrolled person."""
        enroll_resp = self.client.post(
            "/api/v1/faces/enroll",
            data={"name": "Alice Smith"},
            files={"image": ("alice.jpg", self.person1_bytes, "image/jpeg")},
        )
        person_id = enroll_resp.json()["person_id"]

        identify_resp = self.client.post(
            "/api/v1/faces/identify",
            files={"image": ("alice_query.jpg", self.person1_bytes, "image/jpeg")},
        )
        self.assertEqual(identify_resp.status_code, 200)
        data = identify_resp.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["identified"])
        self.assertIsNotNone(data["person"])
        self.assertEqual(data["person"]["id"], person_id)
        self.assertEqual(data["person"]["name"], "Alice Smith")
        self.assertGreaterEqual(data["similarity"], 0.50)

    def test_14_identify_unknown_face_rejection(self):
        """Test 14: POST /api/v1/faces/identify rejects a non-enrolled identity as unknown."""
        # Enroll only Alice (Person 1)
        self.client.post(
            "/api/v1/faces/enroll",
            data={"name": "Alice Smith"},
            files={"image": ("alice.jpg", self.person1_bytes, "image/jpeg")},
        )

        # Query with Bob (Person 2)
        identify_resp = self.client.post(
            "/api/v1/faces/identify",
            files={"image": ("stranger.jpg", self.person2_bytes, "image/jpeg")},
        )
        self.assertEqual(identify_resp.status_code, 200)
        data = identify_resp.json()
        self.assertTrue(data["success"])
        self.assertFalse(data["identified"])
        self.assertIsNone(data["person"])
        self.assertEqual(data["message"], "Unknown face")
        self.assertLess(data["similarity"], 0.50)

    def test_15_delete_person_and_404_lifecycle(self):
        """Test 15: DELETE /api/v1/faces/{id} deletes person and subsequent requests return 404."""
        enroll_resp = self.client.post(
            "/api/v1/faces/enroll",
            data={"name": "Alice Smith"},
            files={"image": ("alice.jpg", self.person1_bytes, "image/jpeg")},
        )
        person_id = enroll_resp.json()["person_id"]

        # Delete person
        delete_resp = self.client.delete(f"/api/v1/faces/{person_id}")
        self.assertEqual(delete_resp.status_code, 200)
        del_data = delete_resp.json()
        self.assertTrue(del_data["success"])
        self.assertEqual(del_data["person_id"], person_id)

        # GET should return 404
        get_resp = self.client.get(f"/api/v1/faces/{person_id}")
        self.assertEqual(get_resp.status_code, 404)

        # Second DELETE should return 404
        delete_again = self.client.delete(f"/api/v1/faces/{person_id}")
        self.assertEqual(delete_again.status_code, 404)


if __name__ == "__main__":
    unittest.main()
