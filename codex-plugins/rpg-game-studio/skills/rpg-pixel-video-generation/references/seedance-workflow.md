# Seedance 2 Pro Workflow

Use this reference when the user is logged into Seedance in Chrome and wants Codex to create a game cutscene.

## Preparation

1. Confirm the project has a sprite-style reference image.
2. Prefer a single extracted frame if Seedance struggles with full sprite sheets.
3. Keep the file path ready before opening the browser.
4. Avoid uploading unrelated large concept art; it will pull the video away from the game's sprite style.

## Browser Steps

1. Claim the existing Chrome tab whose URL or title contains Seedance.
2. Inspect the visible UI before clicking.
3. Select image-to-video or image reference mode.
4. Upload the sprite-style reference image.
5. Paste the video prompt.
6. Use vertical/mobile aspect ratio when the UI provides the option.
7. Generate one or two candidates.
8. Download the best result.
9. Save it under `assets/generated/videos/`.

## Cutscene Script Pattern

Keep prompts concise and explicit:

- character identity
- RPG pixel style
- camera angle
- story beat
- one main action
- avoid rules

Good action phrasing:

```text
The old Daoist raises his bamboo staff, wind glyphs circle upward, the protagonist receives a brief blue-white aura, then both return to idle stance.
```

Avoid asking for many events in one clip. If a cutscene needs dialogue, battle, and reward screens, split it into multiple clips or keep dialogue in the game UI.

