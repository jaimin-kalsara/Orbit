import logging

from django.db import IntegrityError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def api_exception_handler(exc, context):
    """DRF handler that also turns integrity errors and unexpected crashes into JSON."""
    response = exception_handler(exc, context)
    if response is not None:
        return response
    if isinstance(exc, IntegrityError):
        return Response(
            {"detail": "That conflicts with something that already exists."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    logger.exception("Unhandled API error", exc_info=exc)
    return Response(
        {"detail": "Something went wrong on our side. Please try again."},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
