import { z } from "zod";

const backgroundOptions = {
  output_transparent: z
    .boolean()
    .optional()
    .describe(
      "If true, the removed background becomes transparent. Defaults to true unless background_color or background_image_url is given.",
    ),
  background_color: z
    .string()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex color like #00ff00.")
    .optional()
    .describe("Hex color (e.g. '#00ff00') to fill the background with instead of transparency."),
  background_image_url: z
    .string()
    .url()
    .optional()
    .describe(
      "Public URL of an image to use as the new background. Takes precedence over background_color.",
    ),
};

export const removeVideoBackgroundSchema = {
  media_file: z
    .string()
    .describe("Base64-encoded video or video data URI. Use this or video_url.")
    .optional(),
  video_url: z
    .string()
    .url()
    .describe("Public URL of the video to process. Use this or media_file.")
    .optional(),
  ...backgroundOptions,
  duration_seconds: z
    .number()
    .positive()
    .max(3600)
    .optional()
    .describe(
      "Length of the video in seconds (max 3600). Omit to have it measured automatically; it determines the credit cost.",
    ),
  is_watermark: z
    .boolean()
    .optional()
    .describe(
      "Whether the output carries the BGRemover watermark. Defaults to true. Watermark-free exports cost double for accounts that have never purchased credits.",
    ),
};

export const removeImageBackgroundSchema = {
  media_file: z
    .string()
    .describe("Base64-encoded image or image data URI. Use this or image_url.")
    .optional(),
  image_url: z
    .string()
    .url()
    .describe("Public URL of the image to process. Use this or media_file.")
    .optional(),
  ...backgroundOptions,
};

export const getJobStatusSchema = {
  job_id: z
    .string()
    .min(1)
    .describe("The job_id returned by remove_video_background."),
};

export const uploadImageSchema = {
  file_path: z
    .string()
    .min(1)
    .describe("Absolute local file path to the image to upload (e.g. '/Users/me/Downloads/photo.png')."),
};

export const uploadVideoSchema = {
  file_path: z
    .string()
    .min(1)
    .describe("Absolute local file path to the video to upload (e.g. '/Users/me/Downloads/clip.mp4')."),
};

export const emptySchema = {};
