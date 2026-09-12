"""Database package for Face Recognition System."""

import os
from typing import Union
from backend.database.mock_db import MockDatabase, mock_db
from backend.database.mongo_db import MongoDBDatabase, mongo_db


def get_db() -> Union[MongoDBDatabase, MockDatabase]:
    """Return the active database repository instance based on DATABASE_MODE.

    Modes:
        - 'mongodb' (default): Connects to MongoDB Atlas cluster.
        - 'mock': Uses thread-safe in-memory storage for isolated automated unit tests.
    """
    mode = os.getenv("DATABASE_MODE", "mongodb").strip().lower()
    if mode == "mock":
        return mock_db
    return mongo_db


__all__ = ["MockDatabase", "mock_db", "MongoDBDatabase", "mongo_db", "get_db"]
