import type { BgremoverConfig } from "./config.js";
import { BgremoverApiError } from "./errors.js";

export class BgremoverClient {
  constructor(private readonly config: BgremoverConfig) {}

  post(path: string, body: Record<string, unknown>) {
    return this.request(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  get(path: string) {
    return this.request(path, { method: "GET" });
  }

  async uploadLocalFile(
    kind: "image" | "video",
    file: {
      fileName: string;
      fileType: string;
      fileSize: number;
      data: Buffer;
    },
  ) {
    const presign = await this.post(`/uploads/${kind}`, {
      file_name: file.fileName,
      file_type: file.fileType,
      file_size: file.fileSize,
    });

    if (!presign?.upload_url || typeof presign.upload_url !== "string") {
      throw new BgremoverApiError("upload_failed", "BGRemover Video did not return an upload URL.");
    }

    const uploadResponse = await fetch(presign.upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": file.fileType,
      },
      body: file.data as unknown as BodyInit,
    });

    if (!uploadResponse.ok) {
      throw new BgremoverApiError("upload_failed", "Could not upload media to BGRemover Video.");
    }

    const mediaUrl =
      kind === "image"
        ? presign.image_url || presign.media_url
        : presign.video_url || presign.media_url;

    return {
      success: true,
      ...(kind === "image" ? { image_url: mediaUrl } : { video_url: mediaUrl }),
      media_url: mediaUrl,
    };
  }

  private async request(path: string, init: RequestInit) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.apiBaseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          ...init.headers,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data?.error?.message ||
          data?.message ||
          "BGRemover Video API request failed.";
        const code = data?.error?.code || "bgremover_api_error";
        throw new BgremoverApiError(code, message, response.status);
      }

      return data;
    } catch (error) {
      if (error instanceof BgremoverApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new BgremoverApiError("timeout", "BGRemover Video API request timed out.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
