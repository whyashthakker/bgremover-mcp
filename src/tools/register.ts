import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";

import type { BgremoverClient } from "../bgremover-client.js";
import {
  emptySchema,
  getJobStatusSchema,
  removeImageBackgroundSchema,
  removeVideoBackgroundSchema,
  uploadImageSchema,
  uploadVideoSchema,
} from "../schemas.js";
import { readLocalUpload } from "../utils/local-file.js";
import { resolveMediaInput } from "../utils/media-resolver.js";
import { errorText, jsonText } from "../utils/response.js";

type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;
type ClientProvider = (extra: ToolExtra) => BgremoverClient;

type ToolMeta = { title: string; annotations: ToolAnnotations };

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} satisfies ToolAnnotations;

// Processing tools create outputs and spend credits. Claude must ask before
// invoking them, even though the source media is left unchanged.
const PROCESS = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} satisfies ToolAnnotations;

const TOOL_META: Record<string, ToolMeta> = {
  upload_image: { title: "Upload Image", annotations: PROCESS },
  upload_video: { title: "Upload Video", annotations: PROCESS },
  check_credits: { title: "Check Credits", annotations: READ_ONLY },
  list_features: { title: "List Features", annotations: READ_ONLY },
  remove_video_background: { title: "Remove Video Background", annotations: PROCESS },
  remove_image_background: { title: "Remove Image Background", annotations: PROCESS },
  get_job_status: { title: "Get Job Status", annotations: READ_ONLY },
};

type RegisterToolOptions = {
  enableLocalUploads?: boolean;
};

export function registerTools(
  server: McpServer,
  getClient: ClientProvider,
  options: RegisterToolOptions = {},
) {
  const resolveInput = (
    client: BgremoverClient,
    input: Parameters<typeof resolveMediaInput>[1],
  ) => resolveMediaInput(client, input, { allowLocalFilePath: options.enableLocalUploads === true });

  const defineTool = (
    name: string,
    meta: ToolMeta,
    description: string,
    inputSchema: any,
    cb: (input: any, extra: ToolExtra) => Promise<any>,
  ) =>
    server.registerTool(
      name,
      { title: meta.title, description, inputSchema, annotations: meta.annotations },
      cb as any,
    );

  if (options.enableLocalUploads) {
    defineTool(
      "upload_image",
      TOOL_META["upload_image"],
      "This tool will upload a local image file to BGRemover Video and return a CDN URL that can be passed as image_url or media_url to another BGRemover Video tool. " +
        "It takes one argument: " +
        "- file_path (str, required): Absolute local path to the image file.",
      uploadImageSchema,
      async (input, extra) =>
        callTool(async () => {
          const file = await readLocalUpload(input.file_path);
          if (!file.fileType.startsWith("image/")) {
            throw new Error("file_path must point to a supported image file.");
          }
          return getClient(extra).uploadLocalFile("image", file);
        }),
    );

    defineTool(
      "upload_video",
      TOOL_META["upload_video"],
      "This tool will upload a local video file to BGRemover Video and return a CDN URL that can be passed as video_url or media_url to another BGRemover Video tool. " +
        "It takes one argument: " +
        "- file_path (str, required): Absolute local path to the video file.",
      uploadVideoSchema,
      async (input, extra) =>
        callTool(async () => {
          const file = await readLocalUpload(input.file_path);
          if (!file.fileType.startsWith("video/")) {
            throw new Error("file_path must point to a supported video file.");
          }
          return getClient(extra).uploadLocalFile("video", file);
        }),
    );
  }

  defineTool(
    "check_credits",
    TOOL_META["check_credits"],
    "This tool will check the remaining BGRemover Video credits and account usage information for the calling API key. It takes no arguments.",
    emptySchema,
    async (_input, extra) => callTool(() => getClient(extra).get("/me/credits")),
  );

  defineTool(
    "list_features",
    TOOL_META["list_features"],
    "This tool will list every available BGRemover Video tool, its endpoint, input schema, and credit cost. It takes no arguments.",
    emptySchema,
    async (_input, extra) => callTool(() => getClient(extra).get("/features")),
  );

  defineTool(
    "remove_video_background",
    TOOL_META["remove_video_background"],
    "This tool will remove or replace the background of a video, producing a transparent, solid-color, or custom-image background. " +
      "This is an asynchronous operation and spends credits; use get_job_status with the returned job_id to retrieve the result. " +
      "It takes the following arguments: " +
      "- media_file or video_url (one required): The video to process, either an uploaded file or a public URL. " +
      "- output_transparent (bool, optional): Make the background transparent. Defaults to true unless a color or image background is given. " +
      "- background_color (str, optional): Hex color to fill the background with. " +
      "- background_image_url (str, optional): Public URL of an image to use as the new background. " +
      "- duration_seconds (number, optional): Video length in seconds (max 3600). Measured automatically when omitted. " +
      "- is_watermark (bool, optional): Defaults to true. Watermark-free exports cost double for accounts that have never purchased credits.",
    removeVideoBackgroundSchema,
    async (input, extra) =>
      callTool(async () => {
        const video_url = await resolveInput(getClient(extra), {
          media_url: input.video_url,
          media_file: input.media_file,
          media_type: "video",
        });
        return getClient(extra).post("/videos/remove-background", {
          video_url,
          output_transparent: input.output_transparent,
          background_color: input.background_color,
          background_image_url: input.background_image_url,
          duration_seconds: input.duration_seconds,
          is_watermark: input.is_watermark,
        });
      }),
  );

  defineTool(
    "remove_image_background",
    TOOL_META["remove_image_background"],
    "This tool will remove or replace the background of an image, returning a transparent, solid-color, or custom-image background. It spends 1 credit. " +
      "It takes the following arguments: " +
      "- media_file or image_url (one required): The image to process, either an uploaded file or a public URL. " +
      "- output_transparent (bool, optional): Make the background transparent. Defaults to true unless a color or image background is given. " +
      "- background_color (str, optional): Hex color to fill the background with. " +
      "- background_image_url (str, optional): Public URL of an image to use as the new background.",
    removeImageBackgroundSchema,
    async (input, extra) =>
      callTool(async () => {
        const image_url = await resolveInput(getClient(extra), {
          media_url: input.image_url,
          media_file: input.media_file,
          media_type: "image",
        });
        return getClient(extra).post("/images/remove-background", {
          image_url,
          output_transparent: input.output_transparent,
          background_color: input.background_color,
          background_image_url: input.background_image_url,
        });
      }),
  );

  defineTool(
    "get_job_status",
    TOOL_META["get_job_status"],
    "This tool will fetch the status and result of an asynchronous BGRemover Video job (returned by remove_video_background). " +
      "Status is one of queued, processing, completed, failed; when completed the response includes output_url. " +
      "It takes the following argument: " +
      "- job_id (str, required): The job_id returned by the asynchronous tool call.",
    getJobStatusSchema,
    async (input, extra) =>
      callTool(() => getClient(extra).get(`/jobs/${encodeURIComponent(input.job_id)}`)),
  );
}

async function callTool(callback: () => Promise<unknown>) {
  try {
    return jsonText(await callback());
  } catch (error) {
    return errorText(error);
  }
}
