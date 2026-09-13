# Pocket Guitar

A client-side fretboard explorer for guitar, four-string bass, and five-string bass, with guitar chord fingerings, a progression maker, note playback, a metronome, and a chromatic tuner. Designed for an iPhone 16 Pro Max in Chrome, with usable landscape, portrait, and desktop layouts.

Live app: [pocket-guitar.vercel.app](https://pocket-guitar.vercel.app/).

## Run locally

Requires Node.js 24.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). To preview the layout on a phone, connect both devices to the same network and open the computer's LAN address on port 3000, with Windows firewall access enabled. Use the published HTTPS app to test the microphone: an ordinary LAN HTTP address does not provide the secure context required for microphone access.

## Validate and build

```sh
npm test
npm run typecheck
npm run build
```

Next.js exports static HTML, CSS, and JavaScript to `out/`. No backend, API keys, database, or user accounts are required. All music and audio processing runs in the browser.

## Vercel deployment

The private source repository is [mitrikdev/pocket-guitar](https://github.com/mitrikdev/pocket-guitar). Vercel's GitHub integration deploys pushes to `main` to production and creates preview deployments for other branches.

The project uses the Next.js preset, Node.js 24, and `npm run build` to produce the static site. Use `npm ci` for reproducible local installs; Vercel detects npm from the committed lockfile. No environment variables are required. Local Vercel metadata stays in the ignored `.vercel/` directory; build artifacts and local preview files are excluded from uploads.

## Practice

- Choose the root and scale or chord in the top bar. Open Settings to change instruments or switch between note names, musical degrees, and intervals.
- Comfort view shows seven fret positions with larger touch targets. The bottom slider moves from frets 0–6 through 18–24. Choose Overview in Settings to see 13 positions, from 0–12 through 12–24.
- Tap any position, including unhighlighted positions and open strings, to see its note and relationship to the root and hear its pitch. Use the sound toggle for silent practice.
- In scales and the All tones chord view, roots are amber and carry a small identifying dot. The selected position has an outer ring. Guitar fingering view uses finger numbers and colors instead.
- Instrument changes preserve the musical settings and clear the selected position. Moving the range keeps selected notes while they remain visible and clears them when they leave view. Root and structure changes clear the selected position.
- The phone landscape layout keeps a compact toolbar beside the fretboard and the slider within the visible browser area. Portrait also supports practice. Layout height follows the browser's visible viewport as its controls change size.
- With a keyboard, Tab enters the fretboard once. Arrow keys move between visible positions; Home/End move to the visible endpoints; Enter or Space selects. The slider supports arrows and Home/End. Escape closes a tool or Settings and restores focus to its opener.

## Chord fingerings and progressions

Choose a guitar chord to explore common playable fingerings. The catalog contains 248 curated grips across all 12 roots and nine chord types: major, minor, major 7, minor 7, dominant 7, sus2, sus4, diminished, and augmented. Switch between the available shapes or choose All tones to study every occurrence of the chord's notes. Bass and five-string bass keep the chord-tone map; guitar grips are for standard six-string guitar tuning.

Finger numbers and colors identify 1 (index), 2 (middle), 3 (ring), and 4 (little finger). Diagrams also show open strings, muted strings, and barres. The same fingering is highlighted on the fretboard. Strum plays its sounding strings and skips muted strings.

Open Progression to name and build a sequence of up to 24 chords. Add a root and chord type, then choose a fingering on each card. Cards show their diagrams in order; use the arrows to reorder, Remove to delete, Strum to preview, and Show to bring a chord onto the fretboard. You can also add the current guitar fingering from the explorer.

Play progression runs the sequence once, with four beats per chord at the selected tempo. The active card is highlighted. Stop ends playback; changing the sequence or a card's fingering also stops it so the display and audio remain aligned.

The progression title, order, and chosen fingerings save automatically on this device in this browser. There is no account or cloud sync, and clearing browser site data removes the saved progression. If browser storage is unavailable, the app reports that changes remain only in the current session. Unreadable saved data is preserved instead of being silently replaced.

## Sound and practice tools

Note playback uses synthesized guitar and bass plucks through the browser's [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API). These are generated tones rather than recorded instrument samples; there are no sample downloads or external audio services. Playback begins from a user action.

The metronome supports 40–240 BPM, one to seven beats per bar, an accented first beat, and tap tempo. Clicks are scheduled against the audio clock so ordinary interface work does not shift their timing. It runs in the foreground and stops when the page is hidden.

The tuner uses [Pitchy 4.1.0](https://github.com/ianprime0509/pitchy), a lightweight JavaScript pitch detector under the 0BSD license. It is chromatic, uses A4 = 440 Hz, and displays the nearest note, octave, frequency, and signed cents. Play one string at a time and let the initial attack settle; weak signals or background noise may prevent a stable reading. Detection includes the low B0 of a five-string bass.

Opening the tuner pauses the metronome and temporarily mutes note playback. Closing it restores the previous sound setting. Microphone access is requested only after tapping Start tuner. Audio is processed locally without recording, uploading, or storing it. Stopping or closing the tuner, hiding the page, and leaving the app release its microphone tracks and audio context. Browser microphone permission and HTTPS are required; see the [getUserMedia documentation](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

## Musical conventions

`lib/music.ts` keeps tuning and interval data separate from presentation. Tunings are stored low to high and rendered high to low. Note names consistently use sharps; contextual enharmonic spelling is deferred. Degrees and interval names follow each structure's musical role. “Minor blues” uses the diminished fifth, and “Diminished” means the diminished triad. Nonmember tritones are labelled “Tritone.”

Seven scales and nine chord types are included. Guitar chords offer playable fingerings and an All tones view. General explorer and audio settings do not persist between visits; the progression title, chord order, and selected fingerings do.

Progressive-enhancement WebMCP tools expose configuration, position selection, and fret range changes when supported. They do not affect ordinary browser use or request microphone access.

The original specification remains in `guitar-fretboard-learning-tool-v0.1.md`. Later requests expanded the neck to 24 frets and added phone layout improvements, audio practice tools, common guitar fingerings, and a progression maker. See `VERIFICATION.md` for checks and remaining device verification.
