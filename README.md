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

## Vercel deployment

Source repository: https://github.com/mitrikdev/pocket-guitar (private).

The project uses the Next.js preset, Node.js 24, `npm ci` to install dependencies, and `npm run build` to produce the static site. No environment variables are required. With Vercel's GitHub integration connected, pushes to `main` update production and other branches receive preview deployments.

Local Vercel project metadata stays in the ignored `.vercel/` directory. Build artifacts and local preview files are excluded from deployment uploads.

## Practice

- Choose an instrument, root, and scale or chord.
- Switch between note names, musical degrees, and intervals.
- Use the bottom Fret range slider to move the 13-position view from 0–12 to 12–24. Instrument changes preserve this range. Selected notes remain selected while visible and clear when they leave the view.
- Tap any position, including unhighlighted positions and open strings, for its note and relationship to the root.
- Roots are amber and have a small identifying dot. The selected position has an outer ring.
- With a keyboard, Tab enters the fretboard once. Arrow keys move between visible positions; Home/End move to the first/last visible fret; Enter or Space selects. Tab to the range slider and use arrows or Home/End to move along the neck.
- Instrument changes preserve the musical selection and clear the selected position. Root and structure changes update its explanation in place.

## Musical conventions

`lib/music.ts` keeps tuning and interval data separate from presentation. Tunings are stored low to high and rendered high to low. Note names consistently use sharps; contextual enharmonic spelling is deferred as specified. Degrees and interval names use each structure's musical role. “Minor blues” uses the diminished fifth, and “Diminished” means the diminished triad. Nonmember tritones are labelled “Tritone.”

Seven scales and nine chords are included. Chord mode shows all chord tones, not playable voicings. There is no persistence, audio, or microphone input.

Progressive-enhancement WebMCP tools expose configuration, position selection, and the fret range slider when supported. They do not affect ordinary browser use.

The original product requirements remain in `guitar-fretboard-learning-tool-v0.1.md`. The user subsequently expanded the range to 24 frets via the bottom slider.
