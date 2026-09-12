# v0.1 verification

Verified on September 12, 2026.

- Six automated music tests pass, including 576 combinations of root, structure, and instrument; correct open strings and octave repetition through fret 24; all 13 sliding windows; known note sets; altered interval spellings; and pentatonic degrees.
- TypeScript checking and the optimized Next.js static export pass.
- Browser interaction checks pass: changing instruments preserves A minor pentatonic in Intervals mode; all three string counts render correctly; augmented fifth labels are correct; tapping a nonmember shows its note and relationship; changing the root updates the selected position in place; open-string selection works.
- Keyboard checks pass: one fretboard Tab stop, arrow navigation within the visible range, Home/End to visible endpoints (including fret 24), Enter to select, and keyboard control of the range slider.
- Layout checked in Chromium at 956 × 440 and 956 × 360 landscape, 440 × 956 portrait, and 1440 × 900 desktop. No page overflow at those sizes. Portrait displays the rotation prompt.
- Browser runtime error list is empty. The accessibility audit reports zero violations. Automated contrast analysis cannot resolve some layered note markers; manual color calculations give 13.19:1 for ordinary note labels, 9.10:1 for root labels, and 5.42:1 for secondary labels.
- Optional WebMCP tools for configuration, position selection, and fret range change the visible app and reject invalid inputs without corrupting state. Selecting an offscreen fret moves it into view.
- The bottom slider was tested with dragging, Home/End, and single-fret keyboard steps. It preserves instrument/root/structure/mode, retains selected notes while visible, and clears them when they leave view. Upper-neck open tuning labels and the nut/position-marker treatment are correct. The 956 × 360 layout remains within the viewport with the slider visible.

These checks simulate phone viewport sizes in a desktop browser. Physical iPhone touch behavior, Chrome's iOS browser controls, and device safe-area insets still need a real-device check.
