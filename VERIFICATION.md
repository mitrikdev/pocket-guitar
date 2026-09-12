# Verification

Verified on September 12, 2026 after the phone layout and audio update.

## Automated checks

- All 19 tests pass: eight music and fret-window tests, six pitch detection tests, and five playback/metronome tests.
- Music coverage includes all 576 combinations of root, structure, and instrument; standard tunings; octave repetition through fret 24; Comfort and Overview windows; invalid window inputs; known note sets; altered interval spellings; and pentatonic degrees.
- Pitch tests cover bass B0 through guitar E6 at 44.1 and 48 kHz, flat and sharp notes, signals with stronger harmonics, silence, quiet input, broadband noise, isolated octave jumps, and stale-reading removal. These are generated signals, not recordings of a physical instrument.
- Playback and metronome tests verify concert pitch, setting limits, audio-clock beat scheduling, skipping missed beats after a stall without a burst of clicks, and tap-tempo averaging/reset.
- TypeScript checking and the optimized Next.js static export pass.

## Browser checks

- Layout checked in Chromium at 956 × 360 and 830 × 320 landscape, 440 × 760 portrait, and 1440 × 900 desktop. No page overflow at these sizes; the bottom slider remains visible with a 44 px control height. Fret cells are 37 px tall at the 360 px landscape height and 65 px tall in portrait.
- The 830 × 320 short-landscape recheck also kept the metronome Start button fully inside its panel, with no page overflow.
- Comfort shows seven positions; Overview shows 13. Sliding reaches fret 24. Instrument/root/structure/display settings are preserved; selected notes remain while visible and clear when moved out of view.
- Instrument changes, nonmember selection, note relationship updates, and open-string selection work. Keyboard navigation includes a single fretboard Tab stop, arrow movement, Home/End, Enter/Space, and range slider controls. Tool dialogs close with Escape and restore focus to their opener.
- Browser audio observations confirmed E4 at 329.6276 Hz and bass B2 at about 123.47 Hz. The metronome at 120 BPM scheduled clicks 0.5 seconds apart, with 1400 Hz accented clicks and 950 Hz ordinary clicks.
- A synthetic microphone signal at A440 produced a tuner reading of 440.0 Hz within 0.001 cents. Closing the tuner stopped microphone tracks. Permission denial produced a recoverable error. This check used generated browser input rather than a hardware microphone.
- Accessibility audits reported zero violations for both the main page and tuner. The main-page rerun with axe 4.12.1 passed 34 checks and left one contrast check incomplete because of layered note markers; a complete automated contrast result is not claimed.
- Optional WebMCP configuration, position selection, and fret range tools update the visible app and reject invalid inputs without corrupting state. Offscreen selections move into view.

## Device checks still needed

The browser checks simulate viewport sizes on a desktop. The user's physical iPhone still needs a final check for touch comfort, Chrome's actual browser controls and safe-area insets, speaker audibility and timbre, microphone permission flow, and pitch stability with guitar and bass strings. The tuner is intended for one sounding note at a time. Very weak fundamentals, room noise, and microphone processing can affect readings.
