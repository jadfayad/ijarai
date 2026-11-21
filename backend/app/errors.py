"""Unified error envelope: every error response is {code, message, retryable[, detail]}."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.city_config import UnknownCityError

logger = logging.getLogger(__name__)

_CODES: dict[int, tuple[str, bool]] = {
    400: ("bad_request", False),
    404: ("not_found", False),
    408: ("timeout", True),
    422: ("invalid_request", False),
    429: ("busy", True),
    499: ("cancelled", True),
    502: ("upstream_error", True),
    503: ("unavailable", True),
    504: ("timeout", True),
}


def error_body(status: int, message: str, code: str | None = None, detail=None) -> dict:
    default_code, retryable = _CODES.get(status, ("server_error" if status >= 500 else "error", status >= 500))
    body = {"code": code or default_code, "message": message, "retryable": retryable}
    if detail is not None:
        body["detail"] = detail
    return body


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(UnknownCityError)
    async def _unknown_city(_request: Request, exc: UnknownCityError):
        return JSONResponse(status_code=404, content=error_body(404, str(exc), code="unknown_city"))

    @app.exception_handler(StarletteHTTPException)
    async def _http(_request: Request, exc: StarletteHTTPException):
        message = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return JSONResponse(
            status_code=exc.status_code,
            content=error_body(exc.status_code, message),
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(_request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content=error_body(422, "Some request fields were invalid", detail=exc.errors()),
        )

    @app.exception_handler(Exception)
    async def _unhandled(_request: Request, exc: Exception):
        logger.exception("Unhandled error", exc_info=exc)
        return JSONResponse(status_code=500, content=error_body(500, "Something went wrong on our side"))
