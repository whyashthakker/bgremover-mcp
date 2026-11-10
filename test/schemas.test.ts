import { describe, expect, it } from "vitest";
import { z } from "zod";

import { removeImageBackgroundSchema, removeVideoBackgroundSchema } from "../src/schemas.js";

describe("tool schemas", () => {
  it("accepts a bare video URL and leaves background options unset", () => {
    const parsed = z.object(removeVideoBackgroundSchema).parse({
      video_url: "https://example.com/video.mp4",
    });

    expect(parsed.output_transparent).toBeUndefined();
    expect(parsed.duration_seconds).toBeUndefined();
  });

  it("rejects durations over the one-hour limit", () => {
    expect(() =>
      z.object(removeVideoBackgroundSchema).parse({
        video_url: "https://example.com/video.mp4",
        duration_seconds: 3601,
      }),
    ).toThrow();
  });

  it("rejects malformed background colors", () => {
    expect(() =>
      z.object(removeImageBackgroundSchema).parse({
        image_url: "https://example.com/image.jpg",
        background_color: "green",
      }),
    ).toThrow();
    expect(
      z.object(removeImageBackgroundSchema).parse({
        image_url: "https://example.com/image.jpg",
        background_color: "#0f0",
      }).background_color,
    ).toBe("#0f0");
  });
});
