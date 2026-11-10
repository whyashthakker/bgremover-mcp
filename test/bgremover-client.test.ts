import { describe, expect, it, vi } from "vitest";

import { BgremoverClient } from "../src/bgremover-client.js";

describe("BgremoverClient", () => {
  it("sends bearer auth without exposing the key in output", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new BgremoverClient({
      apiKey: "vbr_secret",
      apiBaseUrl: "https://www.bgremover.video/api/v1",
      timeoutMs: 1000,
      nodeEnv: "test",
      logLevel: "silent",
    });

    await client.post("/images/remove-background", {
      image_url: "https://example.com/image.jpg",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.bgremover.video/api/v1/images/remove-background",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer vbr_secret",
        }),
      }),
    );

    vi.unstubAllGlobals();
  });
});
