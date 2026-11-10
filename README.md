# bgremover-mcp

Model Context Protocol (MCP) server for [BGRemover Video](https://www.bgremover.video).
It lets Claude Desktop, Claude Code, Cursor, and other MCP clients remove or replace
the background of videos and images.

```text
MCP client -> bgremover-mcp -> https://www.bgremover.video/api/v1/* -> BGRemover backend
```

The server only calls the public `/api/v1` API. It never touches internal routes,
FastAPI/RunPod URLs, S3 buckets, or the database.

## Tools

| Tool | Endpoint | Notes |
| --- | --- | --- |
| `remove_video_background` | `POST /videos/remove-background` | Async. Transparent, solid color, or image background. |
| `remove_image_background` | `POST /images/remove-background` | Synchronous, 1 credit. |
| `get_job_status` | `GET /jobs/{job_id}` | `queued` / `processing` / `completed` / `failed`; `output_url` when done. |
| `check_credits` | `GET /me/credits` | |
| `list_features` | `GET /features` | |
| `upload_image`, `upload_video` | `POST /uploads/{image,video}` | stdio server only (reads local files). |

Video credits: `ceil(duration_seconds) * 1.5`, doubled for watermark-free exports on
accounts that have never purchased credits. If `duration_seconds` is omitted the
backend measures the video; it never guesses.

## Use it

### Local (stdio)

Create an API key at https://www.bgremover.video/developers, then:

```json
{
  "mcpServers": {
    "bgremover": {
      "command": "npx",
      "args": ["-y", "bgremover-mcp"],
      "env": { "BGREMOVER_API_KEY": "vbr_..." }
    }
  }
}
```

### Remote (HTTP + OAuth)

`https://mcp.bgremover.video/mcp` accepts either a `vbr_` API key as a Bearer token or
an OAuth 2.1 token (authorization code + PKCE, dynamic client registration) issued by
bgremover.video, so web Claude and ChatGPT can connect without handling keys.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev          # stdio, needs BGREMOVER_API_KEY
npm run dev:http     # HTTP server on :3000
```

See `.env.example` for configuration.

## Notes

- Developer API keys default to 100 calls/day and 1000/month on the website. Every
  tool call, including `get_job_status` polling, counts toward that limit.
- Keys created through the OAuth flow have no call limits and expire after 7 days
  (refreshed automatically via refresh tokens).
# bgremover-mcp
