# Pocket Guitar

A small, client-side fretboard explorer for guitar, four-string bass, and five-string bass. Designed first for an iPhone 16 Pro Max in landscape, with a portrait rotation prompt and the same practice surface on desktop.

## Run locally

Requires Node.js 24 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. To use the local preview on a phone, connect both devices to the same network and open the computer's LAN address on port 3000 (the Windows firewall must allow access).

## Validate and build

```sh
npm test
npm run typecheck
npm run build
```

Next.js exports static HTML, CSS, and JavaScript to `out/`. No backend, API keys, database, or accounts are part of the application. Hosted preview access may be controlled by the hosting service.

## Practice

- Choose an instrument, root, and scale or chord.
- Switch between note names, musical degrees, and intervals.
- Tap any position, including unhighlighted positions and open strings, for its note and relationship to the root.
- Roots are amber and have a small identifying dot. The selected position has an outer ring.
- With a keyboard, Tab enters the fretboard once. Arrow keys move between positions; Home/End move to open/fret 12; Enter or Space selects.
- Instrument changes preserve the musical selection and clear the selected position. Root and structure changes update its explanation in place.

## Musical conventions

`lib/music.ts` keeps tuning and interval data separate from presentation. Tunings are stored low to high and rendered high to low. Note names consistently use sharps; contextual enharmonic spelling is deferred as specified. Degrees and interval names use each structure's musical role. “Minor blues” uses the diminished fifth, and “Diminished” means the diminished triad. Nonmember tritones are labelled “Tritone.”

Seven scales and nine chords are included. Chord mode shows all chord tones, not playable voicings. There is no persistence, audio, or microphone input.

Two progressive-enhancement WebMCP tools expose the existing configuration and position-selection actions when supported. They do not affect ordinary browser use.

The original product requirements remain in `guitar-fretboard-learning-tool-v0.1.md`.
