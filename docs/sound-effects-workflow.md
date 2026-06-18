# Sound Effects Workflow

## Recommended Sources

- Preferred high-fidelity generator: ElevenLabs Sound Effects. Use it first for
  production-quality game one-shots, especially combat impacts, sword slashes,
  skill casts, NPC cues, and polished UI confirmations.
- Programmatic local WAV generation for short UI cues: button taps, prompt
  pings, purchase chimes, wait/confirm sounds. This is fast, deterministic,
  license-safe, and easy to tune in `scripts/copy-wechat-assets.mjs`.
- Stable Audio for longer ambience, battle beds, and stylized soundscapes.
- Sonniss GameAudioGDC bundles as royalty-free production-quality fallback
  material. Keep license notes with imported files.
- OpenGameArt/Freesound only when the exact license is checked per asset.

## Game SFX Contract

Runtime files live in `wechat-minigame/audio-pack/` and are generated or copied
by `npm run wechat:assets`.

Core event IDs:

- `ui.wav`: one short tap for non-movement buttons.
- `prompt.wav`: a soft ping when a new interaction trigger becomes available.
- `buy.wav`: three-note purchase success cue.
- `wait.wav`: low confirm sound for battle wait/end action.
- `hit.wav`: weapon impact with transient noise and metal tail.
- `stun.wav`, `heal.wav`, `sweep.wav`: skill-specific cues.

Every runtime SFX object should expose an `audit` object with `playCount`,
`playEvents`, and `errors`, so Playwright tests can verify whether a sound was
triggered and whether the browser/WeChat audio layer reported playback.

## Prompt Pattern For AI SFX

Use short, layered prompts and request dry one-shot WAV output:

```text
short wuxia sword slash impact, crisp metal transient, wooden staff thump,
small cloth movement tail, no music, no reverb wash, 0.4 seconds, game-ready
one-shot sound effect
```

Generate 4-8 variants, normalize to -3 dB peak, trim silence under 30 ms, and
test in game with screenshots plus SFX audit. Do not accept a sound only because
it plays in isolation; judge it against the actual battle animation timing.

For ElevenLabs Sound Effects, prefer prompts that describe material, motion,
duration, and mix constraints instead of vague emotion. Keep outputs dry and
short, then integrate through `audio-pack` with the same audit checks.

## QA Checklist

- Trigger path increments `playCount`.
- Browser or WeChat audio layer emits `playEvents` or logs an explicit error.
- Sound length matches interaction: UI under 180 ms, purchase under 400 ms,
  weapon hit under 500 ms, magic under 700 ms.
- No movement-loop sound on D-pad hold.
- Important interactable prompts play only once per newly entered trigger.
- Effects remain useful on phone speakers at low volume.
