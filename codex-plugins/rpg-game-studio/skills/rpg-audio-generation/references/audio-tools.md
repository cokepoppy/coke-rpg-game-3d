# RPG Audio Tool Notes

Check current pricing, licensing, and export options before final production because these services change often.

## BGM

- Suno: browser-based music generation suitable for candidate game BGM when the user is logged in. Use instrumental/no-vocal prompts and avoid copyrighted franchise references.
  - https://suno.com/
  - https://help.suno.com/

## Sound Effects

- ElevenLabs Sound Effects: text-prompted sound effect generation. Useful for sword hits, stun chimes, heals, UI clicks, treasure pickups, and short ambience layers.
  - https://elevenlabs.io/sound-effects
  - https://elevenlabs.io/docs/capabilities/sound-effects
- Adobe Firefly Generate Sound Effects: prompt-based SFX generation in the Adobe ecosystem. Useful as an alternate candidate source when ElevenLabs output is too synthetic or too long.
  - https://www.adobe.com/products/firefly/features/sound-effect-generator.html
  - https://helpx.adobe.com/firefly/web/work-with-audio-and-video/work-with-audio/text-to-sound-effects.html
- Suno Sounds: if available in the user's account, can generate sound effects from text prompts and may be convenient when already producing BGM in Suno.
  - https://suno.com/

## Short Voice Lines

- ElevenLabs Text to Speech: suitable for short generic character lines and battle barks. Avoid named actor, celebrity, or copyrighted-character voice imitation.
  - https://elevenlabs.io/text-to-speech
  - https://elevenlabs.io/docs/capabilities/text-to-speech

## Local Placeholders

- Deterministic generated WAVs in project scripts are acceptable for automation and play-count audits.
- Replace placeholders with licensed/exported SFX before final release.
- Keep the placeholder and final asset filenames stable so tests do not need to change when audio quality improves.
