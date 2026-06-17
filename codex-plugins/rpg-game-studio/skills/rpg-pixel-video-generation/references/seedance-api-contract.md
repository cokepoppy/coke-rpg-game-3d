# Seedance Web API Contract

Captured from the authenticated Seedance 2 Pro web application on 2026-06-17.
This is an observed private web contract, not a stable public API. Re-capture it
when the site changes.

## Security Rules

- Treat the Clerk Bearer token as a short-lived secret.
- Read the token from `SEEDANCE_BEARER_TOKEN` at runtime only.
- Never write the token, STS response, signed PUT URL, cookies, or request
  headers to project files or logs.
- Never submit a paid generation as part of API discovery. Use `--dry-run`
  until the user explicitly authorizes execution.

## Current Upload Flow

Request:

```http
POST https://www.seedance2ai.io/api/s3/sts
Content-Type: application/json
Authorization: Bearer <runtime-token>
```

```json
{
  "key": "unique-file-name.png",
  "fileType": "image/png",
  "prefix": "/seedance-media"
}
```

The response shape used by the web client is:

```json
{
  "data": {
    "putUrl": "<short-lived-signed-url>",
    "completedUrl": "<uploaded-media-url>"
  }
}
```

Upload the original bytes to `data.putUrl` with `PUT` and the original
`Content-Type`. Pass `data.completedUrl` into the generation request.

The captured page has also used `/seedance-images` and
`/video-reference-images` prefixes. `/seedance-media` is the current unified
workspace default.

## Current Submit Flow

Request:

```http
POST https://www.seedance2ai.io/api/seedance/submit
Content-Type: application/json
Authorization: Bearer <runtime-token>
```

Observed request body:

```json
{
  "mode": "media-to-video",
  "quality_tier": "standard",
  "prompt": "...",
  "aspect_ratio": "9:16",
  "duration": "5",
  "resolution": "720p",
  "media_urls": ["<completedUrl>"],
  "media_durations": [null],
  "generate_audio": true,
  "fixed_lens": false,
  "channel": "standard"
}
```

Optional fields observed in the client are `image_url`, `end_image_url`,
`provider`, `input_video_duration`, `teamSlug`, and `seed`.

Known values:

- `mode`: `text-to-video`, `image-to-video`, `media-to-video`
- `quality_tier`: `standard`, `pro` (`fast` exists in shared code but is not
  exposed by the current Seedance 2 Pro quality control)
- `channel`: `standard`, `real`, `wild`
- `aspect_ratio`: `16:9`, `9:16`, `1:1`, `4:3`, `3:4`, `21:9`
- `resolution`: `720p`, `1080p` for Standard/Pro
- `duration`: `4` through `15` seconds for Standard/Pro

The submit success path expects at least `id`; the client also consumes
`requestId` and `credits_used` when present.

## Status Flow

```http
GET https://www.seedance2ai.io/api/seedance/status/{id}?requestId={requestId}
Authorization: Bearer <runtime-token>
```

Omit `requestId` when the submit response does not contain it. Poll with a
bounded timeout and stop on a terminal success or failure status.

## Legacy Flow

An older workspace bundle still contains:

```http
POST /api/seedance2/submit
```

with body fields `mode`, `prompt`, `duration`, `resolution`, `aspect_ratio`,
`generate_audio`, `fixed_lens`, `seed`, `image_url`, `end_image_url`,
`cfg_scale`, and `model_slug`. Do not prefer this endpoint for new automation.

## Capture Limitation

The live account had zero credits during capture. Clicking Generate redirected
to pricing before a submit request was emitted. The submit and status contracts
above were recovered from the exact production JavaScript loaded by the open
page; the upload STS and object-storage PUT requests were observed live.
