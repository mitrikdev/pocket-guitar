# Guitar Fretboard Learning Tool — v0.1 Build Spec

## Goal

Build a small, polished, mobile-forward guitar learning tool centered on an interactive fretboard.

The primary use case is a player holding a guitar or bass, rotating their phone horizontally, and using the app as a visual reference while practicing.

This is not a course platform, lesson system, or account-based product. The first version should focus on one thing and do it extremely well:

> Select a root + chord/scale and immediately understand where those notes live across the fretboard.

---

## Product Principles

1. **Landscape phone is the primary design target**
   - The phone should feel like a compact guitar neck.
   - The fretboard should dominate the screen.
   - Desktop/tablet support is welcome, but mobile landscape is the design authority.

2. **The fretboard is the core primitive**
   - Chords, scales, intervals, future quizzes, and future voicings should all build on the same fretboard component.

3. **Instrument differences are data, not separate implementations**
   - Guitar, 4-string bass, and 5-string bass should use one rendering/theory engine with different tuning definitions.

4. **Teach relationships, not just diagrams**
   - The app should make it obvious that a chord or scale is a collection of notes distributed across the neck.

5. **Keep v0.1 intentionally small**
   - No accounts
   - No backend
   - No lessons
   - No microphone
   - No audio playback
   - No persistence requirements

---

## Primary Screen

The app should be essentially one landscape-oriented learning surface.

Suggested structure:

```text
┌────────────────────────────────────────────────────────────┐
│ Guitar | Bass | Bass 5   C ▾   Major Scale ▾   Notes ▾   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ E ──●──────●────────●──────●────────●───────────────        │
│ B ─────●────────●──────●────────●────────●──────────        │
│ G ──●──────●────────●────────●──────●──────────────        │
│ D ─────●────────●──────●────────●────────●──────────        │
│ A ──●──────●────────●────────●──────●──────────────        │
│ E ─────●────────●──────●────────●────────●──────────        │
│       3       5       7       9          12                 │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ E · Major 3rd of C · B string · fret 5                     │
└────────────────────────────────────────────────────────────┘
```

The implementation does not need to copy this exact visual layout, but the hierarchy should remain:

1. compact controls
2. large fretboard
3. selected-position information

Avoid large headers, sidebars, dashboard cards, or decorative UI that competes with the fretboard.

---

## Orientation

### Landscape

Landscape is the intended mobile experience.

Target:
- show open string through fret 12 at once on a modern phone where practical
- keep fret positions large enough to tap
- keep all strings comfortably separated vertically
- minimize page scrolling

### Portrait

Do not build a second fully optimized portrait fretboard layout for v0.1.

Portrait can show a simple, attractive prompt such as:

> Rotate your phone to explore the fretboard

The app may still expose basic context/controls in portrait if convenient, but landscape behavior is the priority.

---

# Instrument System

Support three instruments in v0.1.

## Guitar

Standard tuning:

```js
[
  { note: 'E', octave: 2 },
  { note: 'A', octave: 2 },
  { note: 'D', octave: 3 },
  { note: 'G', octave: 3 },
  { note: 'B', octave: 3 },
  { note: 'E', octave: 4 }
]
```

## 4-String Bass

Standard tuning:

```js
[
  { note: 'E', octave: 1 },
  { note: 'A', octave: 1 },
  { note: 'D', octave: 2 },
  { note: 'G', octave: 2 }
]
```

## 5-String Bass

Standard low-B tuning:

```js
[
  { note: 'B', octave: 0 },
  { note: 'E', octave: 1 },
  { note: 'A', octave: 1 },
  { note: 'D', octave: 2 },
  { note: 'G', octave: 2 }
]
```

These should all use the same fretboard renderer.

Do not create separate guitar and bass implementations.

A fretboard should fundamentally receive an instrument/tuning definition and derive every visible note from that data.

This should make future support for things such as Drop D, DADGAD, half-step down, 7-string guitar, and custom tunings easy to add later.

---

# Fretboard

## Range

v0.1 should display:

- open strings
- frets 1–12

Fret 12 is the octave and should be visually recognizable.

Do not implement 24-fret scrolling in the initial build unless the architecture makes it trivial and it does not complicate the mobile UX.

---

## Visual Treatment

The fretboard should feel like an instrument rather than a spreadsheet.

Use:
- horizontal strings
- subtle difference in string thickness
- vertical fret wires
- visible nut/open-string boundary
- standard position markers
- double marker at fret 12
- warm/neutral fretboard treatment
- high contrast note markers

Standard marker frets:

- 3
- 5
- 7
- 9
- 12

Fret 12 should use a double marker.

Avoid visual clutter.

---

## String Order

Render strings visually as a player normally sees them when looking at a fretboard diagram.

For guitar:
- high E should appear at the top
- low E should appear at the bottom

The underlying tuning data can remain low-to-high if convenient, but presentation should be intuitive.

Bass should follow the same convention:
- highest string at top
- lowest string at bottom

---

# Music Theory Engine

The theory logic should be independent from the fretboard rendering logic.

Conceptually:

```text
Instrument definition
        ↓
Fretboard note generation

Root + scale/chord selection
        ↓
Music theory engine
        ↓
Set of pitch classes + interval metadata

Generated fretboard + active pitch classes
        ↓
Rendered highlighted positions
```

The fretboard should not need special cases for individual scales or chords.

---

## Pitch Classes

Use a normalized 12-note chromatic representation internally.

Example:

```js
[
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B'
]
```

Enharmonic display can be improved later.

For v0.1, consistency matters more than implementing a full enharmonic spelling engine.

---

# Root Selection

Allow selection of all 12 chromatic roots.

Example:

```text
C
C#
D
D#
E
F
F#
G
G#
A
A#
B
```

The chosen root affects:
- generated chord/scale notes
- interval labels
- degree labels
- selected-note context
- root highlighting

---

# Study Type

Users should be able to choose a musical structure.

The selector should distinguish at least:

- Scales
- Chords

The UI can use one combined dropdown or a two-stage selector.

---

## Scales for v0.1

Implement at minimum:

- Major
- Natural Minor
- Major Pentatonic
- Minor Pentatonic
- Blues
- Dorian
- Mixolydian

Represent scales as interval definitions rather than hard-coded note lists per key.

Example concept:

```js
major = [0, 2, 4, 5, 7, 9, 11]
minorPentatonic = [0, 3, 5, 7, 10]
```

---

## Chords for v0.1

Implement at minimum:

- Major
- Minor
- Major 7
- Minor 7
- Dominant 7
- Sus2
- Sus4
- Diminished
- Augmented

Represent these as interval definitions.

Example:

```js
major = [0, 4, 7]
minor = [0, 3, 7]
dominant7 = [0, 4, 7, 10]
```

---

# Highlighting Behavior

When a scale or chord is selected:

- every matching note across the entire fretboard should be highlighted
- non-member notes should remain visible only as muted fret positions or disappear, depending on which treatment is cleaner
- root notes should have a visually distinct treatment from the other active notes

Example:

For C Major:

```text
C D E F G A B
```

Every occurrence of those pitch classes from open strings through fret 12 should be represented.

Root C should be visually stronger.

For A7:

```text
A C# E G
```

Every occurrence of those notes should be highlighted.

The app should teach that these notes exist across the entire neck rather than presenting only one playable chord shape.

---

# Display Modes

Provide three display modes.

## Notes

Markers show pitch names.

Example:

```text
C D E F G A B
```

## Degrees

Markers show scale/chord degrees.

Examples:

```text
1 2 3 4 5 6 7
```

or for a dominant seventh chord:

```text
1 3 5 ♭7
```

## Intervals

Markers show interval names.

Examples:

```text
R M2 M3 P4 P5 M6 M7
```

For chord intervals:

```text
R M3 P5 m7
```

Switching display mode must not alter the selected root, instrument, scale, or chord.

---

# Interactive Positions

Every fret/string intersection, including open strings, should be tappable.

When a user taps a position:

1. visually mark it as selected
2. display contextual information in a compact bottom information area

Example:

```text
E
Major 3rd of C
B string · fret 5
```

The context should include:

- note name
- relationship to selected root
- string identity
- fret number

If the note belongs to the selected chord/scale, show its relevant degree/interval.

If it does not belong to the active structure, still show the note and chromatic interval from the selected root.

Do not open a modal or navigate away from the fretboard.

---

# Instrument Switching

Instrument switching should be immediate.

Example flow:

1. user selects:
   - A
   - Minor Pentatonic
   - Intervals
2. user taps `Bass`
3. fretboard switches to four strings
4. A Minor Pentatonic remains selected
5. interval display remains selected

The same applies to 5-string bass and guitar.

Changing instruments must preserve:
- root
- chord/scale
- display mode

Selected fret position may reset.

---

# Mobile Interaction Requirements

Controls must be comfortable to tap on a phone.

Prefer:
- segmented controls
- compact native/select-style dropdowns
- bottom sheets only if needed
- no hover-dependent behavior

Avoid:
- tiny text links
- dense desktop menus
- interactions requiring a mouse
- horizontal page scrolling

The fretboard itself should fit the intended 0–12 range without requiring page-level horizontal scrolling on the primary target where practical.

---

# Responsive Behavior

## Mobile Landscape

Highest priority.

The fretboard should consume approximately 70–80% of the useful vertical area.

Controls and contextual information should remain compact.

## Tablet/Desktop

Allow the layout to breathe but do not transform it into a dashboard.

The same core hierarchy should remain.

The fretboard may become wider/larger.

---

# Suggested Component Model

Exact implementation is flexible, but a useful decomposition would be:

```text
App
├── ControlBar
│   ├── InstrumentSelector
│   ├── RootSelector
│   ├── StructureSelector
│   └── DisplayModeSelector
│
├── Fretboard
│   ├── FretMarkers
│   ├── String
│   │   └── FretPosition
│   └── PositionMarkers
│
└── SelectedNoteInfo
```

Music logic should live outside presentation components.

Potential modules:

```text
/data/instruments
/data/scales
/data/chords

/lib/music
  noteMath
  intervalMath
  fretboardMath
```

Do not over-engineer this structure if a simpler organization is clearer.

---

# State

Minimum application state:

```js
{
  instrument,
  root,
  structureType,
  structureId,
  displayMode,
  selectedPosition
}
```

Derived state should include:
- active pitch classes
- active intervals
- generated fretboard positions

Do not duplicate easily derived musical information in state.

---

# Technical Direction

This is intended as a lightweight client-side web app.

If starting greenfield, prefer:

- React
- Next.js
- TypeScript or JavaScript depending on project convention
- CSS/Tailwind based on existing project preference
- minimal dependencies

No backend is required.

No external music-theory library is required for v0.1 unless it clearly simplifies the implementation without adding unnecessary weight.

The underlying math is small enough to implement directly.

If using JavaScript, omit semicolons.

---

# Accessibility

At minimum:

- all selectors keyboard accessible
- fret positions implemented as accessible interactive elements
- visible focus state
- sufficient contrast
- labels should not rely on color alone
- selected note should be communicated through text as well as styling

---

# Out of Scope for v0.1

Do **not** build these yet:

- audio playback
- microphone input
- pitch detection
- tuner
- chord-shape library
- playable voicing recommendations
- chord progression trainer
- quiz mode
- lessons
- streaks/gamification
- accounts
- backend/database
- saved progress
- alternate tuning UI
- custom tuning editor
- MIDI
- 24-fret scrolling
- AI teacher
- social features

The architecture should not prevent these later, but no implementation work should be spent on them now.

---

# Future Direction

Potential next features after the fretboard foundation is stable:

## Show Shapes

For a selected chord, add:

```text
Show All Notes
Show Shapes
```

`Show Shapes` would display playable voicings rather than every chord tone.

This should remain conceptually separate from chord membership.

---

## Audio

Tap a fret position to hear its pitch.

Later:
- play chord
- play scale ascending/descending

---

## Learning / Quiz Mode

Examples:

- Find every C
- Find the root
- Find the minor 3rd
- Build an A7
- Locate all notes in A Minor Pentatonic
- Name this fret position

---

## Alternate Tunings

Because instruments are data-driven, later expose:

- Drop D
- Half-step down
- DADGAD
- custom tuning
- 7-string guitar
- 6-string bass

---

# v0.1 Acceptance Criteria

The first version is complete when:

1. The app works well on a phone in landscape orientation.
2. Guitar, 4-string bass, and 5-string bass can be switched instantly.
3. Open strings through fret 12 are rendered correctly.
4. The note at every string/fret position is mathematically correct.
5. A root can be selected.
6. Supported scales can be selected.
7. Supported chords can be selected.
8. Every matching note is highlighted across the fretboard.
9. Root notes are visibly distinct.
10. Users can toggle Notes / Degrees / Intervals.
11. Tapping any fret position shows note, interval, string, and fret information.
12. Instrument switching preserves the active musical selection.
13. The interface is comfortable to use with touch.
14. The visual design resembles a clean instrument/fretboard rather than a table.
15. No backend or account system is required to run the app.

---

# Build Priority

Implement in this order:

1. note/fret math
2. instrument configuration
3. static fretboard rendering
4. mobile landscape layout
5. root selection
6. scale/chord interval definitions
7. active-note highlighting
8. root distinction
9. Notes / Degrees / Intervals modes
10. fret-position tap interaction
11. instrument switching
12. responsive polish
13. accessibility and visual cleanup

Prioritize correctness and tactile usability over feature count.

The final v0.1 should feel like a tiny instrument-specific tool someone would genuinely keep open beside them while practicing.
