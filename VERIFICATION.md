# Verification

## Native orientation restored — September 20, 2026

- Removed rotation buttons from the explorer and all panels, the forced CSS rotation, and the saved orientation mode. The obsolete orientation preference is cleared without changing custom chords or progressions.
- TypeScript and the production build pass. Browser checks at 440 × 760 and 956 × 360 confirmed normal viewport dimensions, no horizontal overflow, working root/chord selectors, unrotated drawers, and unchanged saved music data after refresh.
- Supersedes the app-rotation feature described in the earlier update below; the app now follows the browser’s native orientation.

## Drawers, rotation, and custom chords — September 20, 2026

- Expanded to 20 chord types and 521 guitar fingerings across all 12 roots. All 56 tests pass, including exact pitch sets, omissions, finger/barre consistency, E6 recognition, custom storage validation, and immutable progression snapshots. TypeScript and the production export pass.
- Browser flows created E6 from an E major grip, named and saved it, added it to a progression, and restored both after refresh. Editing its library copy did not change the progression's diagram, playback pitches, or Show on neck result.
- Built and saved an F barre using the fret/finger/barre controls. Created a second progression, cancelled deletion, switched songs, and restored the selected song after refresh. Existing v1/v2 progression migration tests still pass.
- The app rotation button and rotated drawers were exercised at a physical viewport of 440 × 760; the surface stays inside the viewport, touch hit targets work in the automated browser, and the orientation preference survives reload. Escape closes only the top drawer and restores focus.
- Portrait now displays eight diagrams together in a three-column grid at 440 × 760. Landscape 956 × 360 and 830 × 320, simulated rotated landscape, and desktop 1440 × 900 retain compact controls and scrollable diagrams without page overflow.
- Accessibility checks report zero violations for the explorer (34 checks passed), progression (25), and builder (29). Contrast remains incomplete for layered graphics.
- Audio instrumentation verified the custom E6 pitches [40, 47, 52, 56, 61, 64], progression play/stop, chord edits and reordering, metronome clicks, and synthetic A440 tuner detection. Closing the tuner released its microphone track. No browser errors were observed.
- Browser automation uses desktop Chromium, not physical iPhone hardware. Portrait lock stays enabled because rotation is applied to the app surface; native browser controls, select menus, permission prompts, and keyboard keep the device orientation. Actual iPhone touch, safe areas, and keyboard behavior still need a device check.

## Multiple saved progressions — September 18, 2026

- All 50 tests pass, including nine library tests for migration, independent titles/chords/fingerings, active selection, create/delete, valid fallback, and malformed or future storage preservation. TypeScript and the production build pass.
- Browser checks preserved a legacy progression with its selected barre shape, created a second progression, edited and switched between both, and restored the active choice after refresh. Cancelled and confirmed deletion were checked; switching during playback stopped the sequence.
- The original v1 save remains untouched. The v2 library saves only after hydration. Storage failures retain session data and show an error.
- Portrait 440 × 760 and landscape 956 × 360 / 830 × 320 checks found no horizontal overflow; library controls measure at least 44 × 44 px. Accessibility reported zero violations and 30 passed checks, with layered contrast remaining incomplete. No browser errors were observed. Physical iPhone touch verification remains user-side.

Chord fingerings and the progression maker passed automated and desktop-browser verification on September 12, 2026. The earlier phone layout and audio checks remain recorded below.

## Chord fingering and progression update

- Added 248 curated standard-guitar grips across 12 roots and nine chord types, with numbered finger colors, open and muted strings, barres, a fingering selector, and the All tones view. Bass continues to use the chord-tone map.
- Added progression names, up to 24 chords, a chosen fingering and diagram per card, reordering, removal, fretboard display, and strum preview. Sequence playback is one pass at four beats per chord and the selected tempo.
- All 41 tests pass: seven chord catalog, eight music and fret-window, six pitch detection, thirteen audio, and seven progression tests. TypeScript checking and the optimized Next.js static export pass.
- Progression data tests cover order/title/fingering restoration, malformed entries and duplicate IDs, stale fingering repair, unreadable or future storage preservation, the 24-chord limit, immutable reordering, chord edits, and safe additions.
- The persistence hook delays writes until saved data has loaded. The progression stays in browser storage on this device; there is no cloud sync. Storage errors have visible session-only feedback.

### Browser checks for this update

- Verified the exact open C fingering `x32010`, next-shape and selector changes, the All tones toggle, compact F and B7 fingerings, and switching between bass chord tones and guitar shapes. The range regression check switched from Comfort frets 18–24 to Overview and kept the visible range valid.
- Built a C–Am–F–G progression, changed its title and the Am card to the A-minor shape at fret 12, reordered cards, and refreshed. The title, order, and chosen fingerings persisted. Show brought the chosen card onto the fretboard; removal updated the progression.
- Browser audio instrumentation confirmed C's sounding MIDI notes `[48, 52, 55, 60, 64]` with 20 ms between strummed strings. At 120 BPM, sequence playback used four beats per chord and advanced the active card ID. Natural completion, Stop, reordering, closing the panel, and starting the metronome correctly ended progression playback.
- Main layouts at 956 × 360 and 830 × 320 landscape, 440 × 760 portrait, and 1440 × 900 desktop had no page overflow. All new main-page and tool controls measured at least 44 × 44 px; the fretboard retains a single Tab stop.
- The progression editor scrolls vertically within its panel, keeps Play and Close accessible in sticky controls, and has no horizontal overflow.
- Accessibility audits reported zero violations: 34 checks passed on the main page and 29 in the progression editor. Contrast checks remain incomplete for layered graphics, so a complete automated contrast result is not claimed.
- No browser errors were observed.

## Prior release: automated checks

- All 19 tests pass: eight music and fret-window tests, six pitch detection tests, and five playback/metronome tests.
- Music coverage includes all 576 combinations of root, structure, and instrument; standard tunings; octave repetition through fret 24; Comfort and Overview windows; invalid window inputs; known note sets; altered interval spellings; and pentatonic degrees.
- Pitch tests cover bass B0 through guitar E6 at 44.1 and 48 kHz, flat and sharp notes, signals with stronger harmonics, silence, quiet input, broadband noise, isolated octave jumps, and stale-reading removal. These are generated signals, not recordings of a physical instrument.
- Playback and metronome tests verify concert pitch, setting limits, audio-clock beat scheduling, skipping missed beats after a stall without a burst of clicks, and tap-tempo averaging/reset.
- TypeScript checking and the optimized Next.js static export pass.

## Prior release: browser checks

- Layout checked in Chromium at 956 × 360 and 830 × 320 landscape, 440 × 760 portrait, and 1440 × 900 desktop. No page overflow at these sizes; the bottom slider remains visible with a 44 px control height. Fret cells are 37 px tall at the 360 px landscape height and 65 px tall in portrait.
- The 830 × 320 short-landscape recheck also kept the metronome Start button fully inside its panel, with no page overflow.
- Comfort shows seven positions; Overview shows 13. Sliding reaches fret 24. Instrument/root/structure/display settings are preserved; selected notes remain while visible and clear when moved out of view.
- Instrument changes, nonmember selection, note relationship updates, and open-string selection work. Keyboard navigation includes a single fretboard Tab stop, arrow movement, Home/End, Enter/Space, and range slider controls. Tool dialogs close with Escape and restore focus to their opener.
- Browser audio observations confirmed E4 at 329.6276 Hz and bass B2 at about 123.47 Hz. The metronome at 120 BPM scheduled clicks 0.5 seconds apart, with 1400 Hz accented clicks and 950 Hz ordinary clicks.
- A synthetic microphone signal at A440 produced a tuner reading of 440.0 Hz within 0.001 cents. Closing the tuner stopped microphone tracks. Permission denial produced a recoverable error. This check used generated browser input rather than a hardware microphone.
- Accessibility audits reported zero violations for both the main page and tuner. The main-page rerun with axe 4.12.1 passed 34 checks and left one contrast check incomplete because of layered note markers; a complete automated contrast result is not claimed.
- Optional WebMCP configuration, position selection, and fret range tools update the visible app and reject invalid inputs without corrupting state. Offscreen selections move into view.

## Device checks still needed

The browser checks simulate viewport sizes on a desktop. The new fingering selector and progression editor still need touch checks on the physical phone, including adding and reordering chords, reading diagrams, and choosing shapes. The user's physical iPhone still needs a final check for touch comfort, Chrome's actual browser controls and safe-area insets, speaker audibility and timbre, microphone permission flow, and pitch stability with guitar and bass strings. The tuner is intended for one sounding note at a time. Very weak fundamentals, room noise, and microphone processing can affect readings.
