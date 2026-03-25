from __future__ import annotations


class AppError(Exception):
    """Base class for expected application errors."""


class ValidationError(AppError):
    """Raised when user input fails application validation."""


class NotFoundError(AppError):
    """Raised when a requested entity or resource does not exist."""
