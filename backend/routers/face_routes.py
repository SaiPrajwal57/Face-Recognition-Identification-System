"""API router for face enrollment, identification, and profile management."""

import logging
from typing import List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from backend.database import get_db
from backend.models.face import (
    BoundingBox,
    DeleteResponse,
    EnrollResponse,
    IdentifyResponse,
    PersonResponse,
)
from backend.services.face_detection import (
    FaceDetectionError,
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    LowConfidenceError,
    validate_single_face,
)
from backend.services.face_embedding import extract_face_embedding
from backend.services.face_matching import (
    DEFAULT_DUPLICATE_THRESHOLD,
    DEFAULT_SIMILARITY_THRESHOLD,
    find_best_match,
)

logger = logging.getLogger("face_recognition.router")
router = APIRouter(prefix="/api/v1/faces", tags=["Faces"])


@router.post(
    "/enroll",
    response_model=EnrollResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll an individual with a face image",
    description="Validates exactly one face, extracts 512-D ArcFace embedding, and saves record to MongoDB Atlas.",
)
async def enroll_face(
    name: str = Form(..., description="Full name of the person being enrolled"),
    image: UploadFile = File(..., description="Face image file (JPEG, PNG, etc.)"),
) -> EnrollResponse:
    """Enroll a new individual into MongoDB Atlas."""
    clean_name = name.strip()
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Person name cannot be empty or whitespace.",
        )

    # Validate file presence and content type
    if not image.filename or not image.content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid image file must be provided.",
        )

    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{image.content_type}'. Please upload an image.",
        )

    image_bytes = await image.read()

    # Step 1: Detect and validate single face presence
    try:
        face_obj, face_meta = validate_single_face(image_bytes)
    except (NoFaceDetectedError, MultipleFacesDetectedError, LowConfidenceError, FaceDetectionError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process face image: {str(exc)}",
        ) from exc

    # Step 2: Extract 512-D ArcFace normalized embedding
    try:
        embedding = extract_face_embedding(face_obj)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to extract face embedding: {str(exc)}",
        ) from exc

    # Step 3: Check for existing duplicate enrolled face
    db = get_db()
    try:
        existing_records = db.get_enrolled_embeddings()
    except Exception as exc:
        logger.error("Failed to retrieve enrolled embeddings for duplicate check: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify existing face records from database.",
        ) from exc

    if existing_records:
        duplicate_threshold = DEFAULT_DUPLICATE_THRESHOLD
        is_duplicate, matched_person, similarity = find_best_match(
            query_embedding=embedding,
            enrolled_records=existing_records,
            threshold=duplicate_threshold,
        )
        if is_duplicate and matched_person:
            matched_name = matched_person.get("name", "Unknown")
            logger.warning(
                "Duplicate face enrollment rejected. Matches existing person '%s' with similarity %.4f",
                matched_name,
                similarity,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Face already enrolled. This face matches an existing person: {matched_name} (similarity: {similarity * 100:.1f}%).",
            )

    # Step 4: Save record in database (MongoDB Atlas or active DB)
    try:
        bbox = face_meta.get("bounding_box", {})
        image_meta = {
            "dimensions": [
                abs(bbox.get("x2", 0) - bbox.get("x1", 0)),
                abs(bbox.get("y2", 0) - bbox.get("y1", 0)),
            ],
            "face_confidence": face_meta.get("confidence", 0.0),
            "bounding_box": [
                bbox.get("x1", 0),
                bbox.get("y1", 0),
                bbox.get("x2", 0),
                bbox.get("y2", 0),
            ],
        }

        enrolled_record = db.add_person(
            name=clean_name,
            embedding=embedding,
            image_meta=image_meta,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.error("Failed to enroll person in database: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist person record to database.",
        ) from exc

    return EnrollResponse(
        success=True,
        message="Person enrolled successfully",
        person_id=enrolled_record["id"],
        name=enrolled_record["name"],
    )


@router.post(
    "/identify",
    response_model=IdentifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Identify a face from an uploaded query image",
    description="Detects single face in query image, extracts 512-D ArcFace embedding, and compares against enrolled identities.",
)
async def identify_face(
    image: UploadFile = File(..., description="Query face image to identify"),
    threshold: Optional[float] = None,
) -> IdentifyResponse:
    """Identify a person from a query face image using similarity matching."""
    if not image.filename or not image.content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid image file must be provided for identification.",
        )

    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{image.content_type}'. Please upload an image.",
        )

    image_bytes = await image.read()

    # Step 1: Detect and validate that exactly one face is present
    try:
        face_obj, face_meta = validate_single_face(image_bytes)
    except (NoFaceDetectedError, MultipleFacesDetectedError, LowConfidenceError, FaceDetectionError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process query image: {str(exc)}",
        ) from exc

    # Step 2: Extract query face embedding
    try:
        query_embedding = extract_face_embedding(face_obj)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to extract face embedding: {str(exc)}",
        ) from exc

    # Step 3: Retrieve enrolled identities from database
    try:
        db = get_db()
        enrolled_records = db.get_enrolled_embeddings()
    except Exception as exc:
        logger.error("Failed to retrieve enrolled embeddings from database: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve face embeddings from database.",
        ) from exc

    # Step 4: Perform cosine similarity matching
    target_threshold = threshold if threshold is not None else DEFAULT_SIMILARITY_THRESHOLD
    is_identified, matched_person, similarity = find_best_match(
        query_embedding=query_embedding,
        enrolled_records=enrolled_records,
        threshold=target_threshold,
    )

    bbox_meta = face_meta.get("bounding_box") if face_meta else None
    bbox_obj = BoundingBox(**bbox_meta) if bbox_meta else None
    confidence_val = face_meta.get("confidence") if face_meta else None

    if is_identified and matched_person:
        return IdentifyResponse(
            success=True,
            identified=True,
            person=PersonResponse(
                id=matched_person["id"],
                name=matched_person["name"],
                created_at=matched_person["created_at"],
            ),
            similarity=similarity,
            message="Face identified successfully",
            bounding_box=bbox_obj,
            detection_confidence=confidence_val,
        )

    return IdentifyResponse(
        success=True,
        identified=False,
        person=None,
        similarity=similarity,
        message="Unknown face",
        bounding_box=bbox_obj,
        detection_confidence=confidence_val,
    )


@router.get(
    "",
    response_model=List[PersonResponse],
    status_code=status.HTTP_200_OK,
    summary="List all enrolled people",
    description="Returns a list of all enrolled individuals. Embeddings are strictly omitted from response.",
)
async def list_enrolled_people() -> List[PersonResponse]:
    """Retrieve all enrolled persons without exposing embeddings."""
    try:
        db = get_db()
        records = db.get_all_people(include_embeddings=False)
        return [
            PersonResponse(
                id=rec["id"],
                name=rec["name"],
                created_at=rec["created_at"],
            )
            for rec in records
        ]
    except Exception as exc:
        logger.error("Failed to list enrolled people from database: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve enrolled people from database.",
        ) from exc


@router.get(
    "/{person_id}",
    response_model=PersonResponse,
    status_code=status.HTTP_200_OK,
    summary="Get enrolled person details",
    description="Returns the details of a single enrolled person by ID. Returns 404 if not found.",
)
async def get_enrolled_person(person_id: str) -> PersonResponse:
    """Retrieve details of a specific enrolled person."""
    try:
        db = get_db()
        record = db.get_person_by_id(person_id=person_id, include_embeddings=False)
    except Exception as exc:
        logger.error("Failed to retrieve person %s from database: %s", person_id, type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve person details from database.",
        ) from exc

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person with ID '{person_id}' was not found.",
        )

    return PersonResponse(
        id=record["id"],
        name=record["name"],
        created_at=record["created_at"],
    )


@router.delete(
    "/{person_id}",
    response_model=DeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete an enrolled person",
    description="Removes an enrolled person from the database. Returns 404 if the person is not found.",
)
async def delete_enrolled_person(person_id: str) -> DeleteResponse:
    """Delete a person from the database."""
    try:
        db = get_db()
        deleted = db.delete_person(person_id=person_id)
    except Exception as exc:
        logger.error("Failed to delete person %s from database: %s", person_id, type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete person from database.",
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Person with ID '{person_id}' was not found.",
        )

    return DeleteResponse(
        success=True,
        message="Person deleted successfully",
        person_id=person_id,
    )
