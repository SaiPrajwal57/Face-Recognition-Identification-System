"""Pydantic models and schemas for face recognition API."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PersonResponse(BaseModel):
    """Schema representing an enrolled person's public details (excluding face embeddings)."""
    id: str = Field(..., description="Unique person identifier")
    name: str = Field(..., description="Full name of the enrolled person")
    created_at: str = Field(..., description="ISO 8601 timestamp of enrollment")


class EnrollResponse(BaseModel):
    """Schema for successful face enrollment response."""
    success: bool = Field(default=True, description="Indicates if the enrollment was successful")
    message: str = Field(default="Person enrolled successfully", description="Status message")
    person_id: str = Field(..., description="Assigned unique identifier for the enrolled person")
    name: str = Field(..., description="Enrolled person name")


class IdentifyResponse(BaseModel):
    """Schema for face identification response (known or unknown)."""
    success: bool = Field(default=True, description="Indicates if identification process completed successfully")
    identified: bool = Field(..., description="True if a known person was matched above threshold, False otherwise")
    person: Optional[PersonResponse] = Field(default=None, description="Matched person details, or null if unknown")
    similarity: float = Field(..., description="Similarity confidence score between 0.0 and 1.0")
    message: Optional[str] = Field(default=None, description="Additional status details (e.g. 'Unknown face')")


class HealthResponse(BaseModel):
    """Schema for backend health check response."""
    status: str = Field(default="healthy", description="Current operational status ('healthy' or 'degraded')")
    database: Optional[str] = Field(default=None, description="Database connection status ('connected' or 'disconnected')")
    database_mode: Optional[str] = Field(default=None, description="Active storage mode ('mongodb' or 'mock')")


class DeleteResponse(BaseModel):
    """Schema for person deletion response."""
    success: bool = Field(default=True, description="Indicates if the deletion was successful")
    message: str = Field(default="Person deleted successfully", description="Status message")
    person_id: str = Field(..., description="Identifier of the deleted person")


class ErrorResponse(BaseModel):
    """Standardized error response schema."""
    success: bool = Field(default=False, description="Indicates failure")
    error: str = Field(..., description="Error type or summary")
    detail: Optional[str] = Field(default=None, description="Detailed explanation of the error")
