---
name: rpg-audio-generation
description: "Generate, collect, integrate, and QA RPG background music, battle music, sound effects, and short voice lines for the browser or WeChat Canvas RPG workflow. Use this when the user asks for Suno BGM, attack SFX, skill SFX, voice barks, audio manifests, or audio test loops."
---

# RPG Audio Generation

Use this skill when the RPG needs reusable audio production in Codex: world BGM, battle BGM, attack effects, skill effects, menu sounds, item sounds, or short NPC/party voice lines.

## Boundaries

- Keep audio generation prompts, source URLs, license notes, and selected filenames in an audio manifest. Do not rely on chat history.
- Keep generated or downloaded source files under `assets/audio/` or `assets/generated/audio/`.
- Keep compressed runtime assets under platform packs such as `wechat-minigame/audio-pack/`; these should be produced by `scripts/copy-wechat-assets.mjs`, not edited manually.
- Do not claim a deterministic local placeholder WAV is a Suno or third-party generated asset.
- Do not imitate copyrighted voices or named performers. Use generic descriptors such as "young male wuxia swordsman" or "calm female healer".

## Recommended Tools

Read `references/audio-tools.md` before choosing a provider for a new audio request.

Default choices:

- Battle/world BGM: Suno through the browser UI when the user is logged in.
- Short generated SFX: ElevenLabs Sound Effects, Adobe Firefly Generate Sound Effects, or Suno Sounds when available.
- Temporary deterministic SFX: local Node WAV generation inside `scripts/copy-wechat-assets.mjs`.
- Short voice lines: TTS provider export, then normalize volume and convert to the target runtime format.

## Suno BGM Browser Workflow

Use this when the user asks to generate formal BGM through Suno.

1. Confirm the user is logged into Suno in Chrome or the in-app browser. If not logged in, stop after opening the page and ask the user to authenticate.
2. Open `https://suno.com/`.
3. Create a new track and select instrumental/no vocals if the UI exposes that option.
4. Use a prompt with these fields:
   - purpose: `battle loop`, `world exploration`, `shop interior`, or `victory`
   - genre: `original wuxia-inspired orchestral instrumental`, `Chinese percussion`, `dizi`, `erhu`, `pipa`
   - game constraints: `seamless loop feeling`, `clear attack rhythm`, `not too busy`, `mobile game background`
   - exclusions: `no vocals`, `no lyrics`, `no copyrighted theme`, `no named franchise`
5. Generate 2-4 candidates, listen for loop suitability and whether effects/dialogue can sit on top.
6. Download the selected candidate into `assets/audio/`.
7. Add or update `assets/audio/bgm-manifest.json` with prompt, provider, selected file, date, purpose, and any rejected alternates.
8. Convert or copy the selected runtime file through `scripts/copy-wechat-assets.mjs`.
9. Run the platform audio test or the relevant E2E tour and confirm music starts only after user gesture and switches correctly by scene.

Battle prompt template:

```text
Original instrumental wuxia tactics battle music for a vertical mobile RPG, tense but not overcrowded, Chinese war drum pulse, low strings, dizi and pipa accents, clear loopable rhythm, supports sword hit sound effects and dialogue, no vocals, no lyrics, no copyrighted theme, 90 seconds.
```

## SFX Workflow

Use generated SFX for final feel, but keep deterministic local WAV placeholders for closed-loop testing.

Recommended SFX prompt format:

```text
Short mobile RPG sound effect, [action], crisp attack feedback, no music, no voice, under 0.5 seconds, dry mix, game-ready.
```

Examples:

- `Short mobile RPG sword slash sound effect, crisp steel impact and cloth movement, no music, no voice, under 0.4 seconds.`
- `Short wuxia acupoint stun sound effect, bright pressure-point chime with tiny impact, no music, no voice, under 0.5 seconds.`
- `Short healing powder sound effect, soft rising shimmer, no music, no voice, under 0.6 seconds.`

After downloading SFX:

1. Save source files under `assets/audio/sfx/`.
2. Normalize loudness so hits, stuns, and heals are comparable.
3. Convert to runtime files in `wechat-minigame/audio-pack/` from the asset copy script.
4. Add play-count assertions to the corresponding E2E script. A battle SFX is not accepted until the audit proves it played.

## Voice Bark Workflow

Use voice only for short, repeatable lines. Do not generate long dialogue until the story script and localization format are stable.

Recommended fields:

- role: `young male swordsman`, `female healer`, `elder shopkeeper`, `masked scout`
- emotion: `calm`, `urgent`, `hurt`, `victory`
- line length: under 2 seconds
- export: one file per line, stable ID matching story or combat event

Manifest entry example:

```json
{
  "id": "hero_skill_guiyuan_sword",
  "provider": "tts",
  "voice": "young male wuxia swordsman",
  "text": "看剑。",
  "source": "assets/audio/voice/source/hero_skill_guiyuan_sword.wav",
  "runtime": "audio-pack/voice/hero_skill_guiyuan_sword.m4a"
}
```

## QA Checklist

- Runtime audio files exist in the expected platform pack.
- Music starts after a user gesture, never during boot.
- Battle start pauses world BGM and starts battle BGM.
- Battle victory/defeat stops battle BGM and resumes or changes scene audio.
- Every attack, stun, heal, and AOE skill writes a machine-readable SFX play-count audit.
- Screenshot tours are paired with JSON audit files so Codex can validate audio without relying on human listening every time.

