# Container proof page: design (keep this current every round)

**What it is.** A throwaway sandbox, separate from the PMI app: the layout engine (containers > stacks > cells) draws a header, six Job details fields and a "Find the customer" page from **rows of a Google Sheet tab**. Fake data only. No bridge code, no customer data, no tests/build.py output. Nothing in `app/`, `tests/`, the live script or the live Smart PMI sheet is touched. Every later round says here how it fits.

**Version.** proof 0.4.0 (round 4, Prompts no. 101). Round 1 = no. 95, round 2 = no. 96, round 3 = no. 100. The version lives in proof.js and make.py (make.py refuses to build if they differ) and in version.json, which make.py writes.

**Files.** `index.html` (built by `python3 make.py` from the engine SOURCE parts + `proof.js`), `proof.js` (everything the proof adds), `layout-profiles.csv` (starting copy of the four profile tabs, used when the sheet cannot be read), `test-script/Code.gs` (the TEST Apps Script), `test-proof.js` (round 1-2 desktop tests), `test-proof-r3.js` (round 3), `test-proof-r4.js` (round 4, uses `test-harness.js`; r3 and r4 run the real Code.gs in Node), `version.json` (the published version, for the stale-page check), `README.md`.

**Test sheet** "PMI container proof (test)" (Drive: smart pmi > claude), shared "Anyone with the link: Viewer".

| Tab | What it holds |
|---|---|
| Layout test | Round 1 tab (not read by the page any more). Round 3 added the new column headings and an explicit Wrap yes/no on every row. Must stay the FIRST tab and must NOT get an Id column (see "Reading a tab"). |
| Layout phone / wide / android / iphone | One layout per profile. Columns: Screen, Row, Container, Stack, Cell, Weight, Type, Content, Slot, Font size, Align, Visible when, Label, **Id**, column O whose heading is the tab's own name, then (round 3, all optional) Sub label, Sub label size, Sub label place, Wrap, Pad X, Pad Y, V align, Nudge X, Nudge Y, Accent, Icon. |
| Tweaks | Device name, Profile, Cell id, Property, Value, Saved at. H1 "Save address", **H2 = the test web app address** (Danny pastes it once). Columns A-F are plain text. |

**Layout rows.** One row per cell. Screen `all` = sticky header on every page, `tray` = the drop-down Tools row (Tools button), anything else = a page (`entry`, `report`, `find`). Slot `box` = a real text box (call field `f:...` or Find box `find.*`); slot `results` = the Find list. Button actions: `set-view:<page>`, `reload-layout`, `toggle-tray`, `toggle-inspector`, `toggle-live`, `proof-profile`, `proof-save-tweaks`, `proof-clear-tweaks`, `proof-find`, `proof-cancel`. A bad row is refused with a plain line; the rest is drawn.

**Round 3 columns (how they fit).** Each is a plain value the engine already draws (engine/43-render-canvas.js, 4e-cell-accent.js); the code only checks it and puts it on the cell, the same way as Weight or Font size. A tab without the column loads exactly as 0.2.0 did (tested cell by cell against the 0.2.0 page). Bad value = the row is refused with a plain line.

| Column | Values | Engine property | Saved as a tweak |
|---|---|---|---|
| Sub label | text, 40 letters max; empty = off. The small second label drawn inside the cell (the only "cell within a cell" the engine has) | subLabel.text / enabled | subLabel |
| Sub label size | 6 to 24 (default 9) | subLabel.fontSize | subLabelSize |
| Sub label place | top-left, top-center, top-right, middle-left, middle, middle-right, bottom-left, bottom-center, bottom-right | subLabel.align + vAlign | subLabelPlace |
| Wrap | yes / no. Column missing = wrap (as 0.2.0); empty cell = cut off with "..." (Danny: every test row has an explicit yes or no) | wrap | wrap |
| Pad X, Pad Y | 0 to 40 px (engine default 10 and 4) | padX, padY | padX, padY |
| V align | top / middle / bottom | vAlign | vAlign |
| Nudge X, Nudge Y | -60 to 60 px | nudgeX, nudgeY | nudgeX, nudgeY |
| Accent | cyan, emerald, amber, purple, rose, or empty | accent | accent |
| Press style | flash, stay, busy, none (round 4; empty = the default for the button's action, see below) | pressStyle | no (tab only) |
| Icon | the engine's 13 icons: pencil, report, copy, bell, mic, help, undo, settings, fullscreen, eye, grid-borders, sun, moon (buttons only; the icon replaces the text) | icon | no (tab only) |

**Cells fill (round 4).** A typing box, a button and the results list fill their whole cell, height and width (a box or button is never under 36 px), so the cell and its content grow together when a stack, row or cell weight grows. A typing box is a "face" (the border) with the real text box inside: V align places the text up / middle / down in the face, Align places it left / centre / right. Labels keep their own V align. All of this is page CSS (make.py), no engine change.

**Typing box text size.** Never under 16 px (iPhone zooms the page into a smaller box). The tab and tweaks may hold a smaller number; the page draws 16, and the Adjust bar shows the real size with "16 min" and greys out minus at 16. Labels use the engine's own range (6 to 48).

**Button feedback (round 4).** Defined ONLY in the page CSS; the sheet only CHOOSES among these looks, it never invents one. flash = a quick brighten on press (every button, unless "none"); busy = dimmed with a working label on the button itself ("Reloading...", "Saving...", "Clearing...") until the action ends, then a short green "done" ring; stay = the engine's own active look (ctl-on) while that page or mode is on (Entry, Report, Find, Tools, Adjust, Advanced, Edit). Defaults by action: set-view, toggle-*, Adjust, Profile = stay; Reload, Save tweaks, Clear mine = busy; others = flash. The optional "Press style" column overrides one button by Id (test sample: Cancel on Find = none). A "stay" on a button that has no page or mode keeps the highlight on the last such button tapped.

**Header buttons** stay one line and the same height on every width: page CSS (make.py) gives page buttons a fixed 36 px height, no wrapping, and "..." when the text does not fit. Shorter labels and the gear icon are tab data (test tabs: "New", Tools = settings icon, Pad X 4, font 11). **Id** is the stable cell id that tweaks match on (blank = made from Screen/Row/C.S.P, which breaks if cells move, so fill it). Ids must be unique.

**Profiles.** phone (auto under 700 px wide), wide (auto otherwise), android, iphone. The Profile button in Tools cycles auto > phone > wide > android > iphone > auto; the choice is remembered on the device. A missing or empty tab falls back to "Layout phone" and the bottom line says so.

**Tweaks (per device).** Rule: a device's own tweaks beat the shared tab, on that device only. The tab is never changed by the page. Device name is made once per browser (e.g. "Android Chrome 7f3a") and remembered (a home-screen icon on iPhone has its own storage, so it gets its own name). Load order: profile tab > this device's Tweaks rows for that profile > (if a save is still waiting) this device's unsent tweaks. Matched by Id; a tweak for a missing cell or with a bad value is ignored with a plain line. Saved properties (round 3): **weight, font size, label, align, wrap, pad X, pad Y, v align, nudge X, nudge Y, accent, sub label, sub label size, sub label place** of a cell. Everything else the inspector can change (row heights, stack and container weights, adding / moving / swapping cells, row colors, cell type or action, sub label nudge) shows until Reload but is NOT saved, and the bottom line then says: "This change will not be kept after Reload (not saved by Save tweaks)." (the page compares a fingerprint of those things with the one taken at load).

**Clear mine (round 4)** redraws from the last read of the tab at once (no network), keeps the selected cell and refreshes the inspector numbers; the sheet clean-up runs in the background with a busy look on the button.

**Save tweaks** sends the full list of this device's differences from the tab for the current profile ("replace"), so undoing a change removes its row. **Clear my tweaks** removes this device's rows for the current profile. A failed save keeps the tweaks on the device (marked "not saved yet") and they are still used there. The inspector can cover the Tools row on a phone, so a Save button also shows in the bottom line whenever there are unsaved changes.

**The test script** (`test-script/Code.gs`, bound to the TEST sheet, deployed as a web app "Anyone"): it can only replace/clear rows of ONE Device name + Profile on 'Tweaks', and read one device's rows. It refuses other ops, unknown properties, bad values, values starting with = + @, more than 100 rows per save, more than 2000 rows in all, bodies over 20 KB. **Openness, said plainly:** the web app is open to anyone, and its token is in this public page, so anyone who finds both could write tweak rows to the TEST sheet. That is acceptable only because the sheet holds fake layout data; never point this script or page at a real sheet.

**Reading a tab.** Google's gviz answer (no key). Gotcha: when a tab name does not exist Google sends the FIRST tab. The page checks it got the right tab (an Id column, and no other "Layout ..." heading). Read order: live tab > last good copy on the device > `layout-profiles.csv` > copy built into the page. Tweaks: the gviz table (gives the Save address), then the script's own answer when the address is known (fresher).

**Repaint rule (round 1, unchanged).** `renderCanvas` is never called while a text box has focus; typing repaints only the results cell. A Reload that arrives while typing waits for the box to be left. **Results above the keyboard:** while a Find box has focus, the results stack moves right under that box (CSS order only, nothing redrawn) and the page scrolls that box to the top.

**Reload button** re-reads layout and tweaks without reloading the browser page; the bottom line shows page version, profile, device, read time, rows, refused, tweaks, and the last action. Tap the bottom line to shrink it.

**Version badge and stale-page check (round 4).** A small badge (top right, e.g. "v0.4.0") shows the running version on every profile. On load the page fetches version.json with a time stamp (never cached); if it is newer than the running page a bar says "A newer version is available (x). Tap to reload", and the tap reloads with ?v=x&t=... so the browser cannot reuse the old copy. The page head also carries no-cache hints. A row refused for an unknown action, or a tab column the page does not know, says "this page may be out of date". Test switch: add ?pretend=0.3.0 to the address and the page acts as 0.3.0 (the badge says so), so the stale bar can be seen without publishing. Only pages from 0.4.0 on have this check; an open 0.3.0 page cannot show it.

**Phone Adjust bar (round 3).** Tools > Adjust: a bar at the bottom of the visible screen (kept above the keyboard with visualViewport). Tap a box, then ONE group at a time: Width (- / +, 0.25 steps), Size (- / +), Align (L / C / R), Wrap (on / off), Label (text box + Done), plus Revert (re-load the saved layout) and Save (the same Save tweaks). Every button is at least 44 px. Round 4: bar buttons act on PRESS (pointerdown; on phones the keyboard closing moved the bar before a release landed, so Done missed); Done commits the label, closes the box and the keyboard, goes back to the group buttons and says "Label set"; tapping the open group closes it; the bar's message is one short line ("Saved 4 tweaks 07:01"; the long one stays in the bottom line); the selected cell is kept clear of the sticky header and the bar, measured against the visible part of the screen (iPhone's visualViewport). The page scrolls so the bar never covers the selected box. While the Label box has focus only the selected cell's text is changed in place (no renderCanvas: the engine has no one-cell repaint), and the full redraw happens on Done / leaving the box. Closing the bar goes back to Live. The engine inspector stays available as Tools > Advanced and is the tool for wide screens.

**Inspector.** The engine's own inspector (not visitor mode). Tools > Advanced opens it (compact on a phone) and switches to Edit, where a tap selects a cell; closing it goes back to Live. Tool buttons (Reload, Tools, Profile, Save, Clear) still act in Edit.

**Proven on phones (round 2, Danny 2026-11-20/21):** live read, Save tweaks through the real script on Android, iPhone untouched by the Android tweak, keyboard stays up in Find with the results above it.
**Proven on the desktop (round 3, simulated Google; the real Code.gs run in Node):** test-proof.js and test-proof-r3.js (old tabs draw identically, each new column, each new tweak saved / reloaded / cleared, bad values refused by the page and by the script, header buttons one line and equal at 360 / 390 / 1200 px, the Adjust bar, the not-kept warning).
**Proven on the desktop (round 4):** test-proof-r4.js, 69 checks at 360 / 390 / 1200 px, each written first and failing on 0.3.0 (except 7b and 7c, which already passed in desktop Chromium: the phone overlap and the iPhone half-cut label could not be reproduced there).
**Not proven yet:** the bar on a real phone keyboard (iOS and Android place the keyboard differently; the test only shrinks the window), the real Google read of the new columns, the redeployed script.
