# v0.1 verification

Verified on September 12, 2026.

- Five automated music tests pass, including 576 combinations of root, structure, and instrument; correct open strings and octave repetition; known note sets; altered interval spellings; and pentatonic degrees.
- TypeScript checking and the optimized Next.js static export pass.
- Browser interaction checks pass: changing instruments preserves A minor pentatonic in Intervals mode; all three string counts render correctly; augmented fifth labels are correct; tapping a nonmember shows its note and relationship; changing the root updates the selected position in place; open-string selection works.
- Keyboard checks pass: one fretboard Tab stop, arrow navigation, End to fret 12, Enter to select.
- Layout checked in Chromium at 956 × 440 and 956 × 360 landscape, 440 × 956 portrait, and 1440 × 900 desktop. No page overflow at those sizes. Portrait displays the rotation prompt.
- Browser runtime error list is empty. The accessibility audit reports zero violations. Automated contrast analysis cannot resolve some layered note markers; manual color calculations give 13.19:1 for ordinary note labels, 9.10:1 for root labels, and 5.42:1 for secondary labels.
- Both optional WebMCP tools registered, changed the visible app, and rejected invalid inputs without corrupting state.

These checks simulate phone viewport sizes in a desktop browser. Physical iPhone touch behavior, Chrome's iOS browser controls, and device safe-area insets still need a real-device check.
