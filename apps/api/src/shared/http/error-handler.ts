import type { ErrorRequestHandler } from "express";

function isMalformedJsonError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 400 &&
    "body" in error
  );
}

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (isMalformedJsonError(error)) {
    response.status(400).json({
      status: "error",
      error: {
        code: "INVALID_JSON",
        message: "Request body must contain valid JSON",
      },
    });
    return;
  }

  response.status(500).json({
    status: "error",
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};
