export class BgremoverApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "BgremoverApiError";
  }
}

export function normalizeError(error: unknown) {
  if (error instanceof BgremoverApiError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: "request_failed",
        message: error.message,
      },
    };
  }

  return {
    success: false,
    error: {
      code: "request_failed",
      message: "BGRemover Video request failed.",
    },
  };
}
