# Container proof page: design (keep this current every round)

**What it is.** A throwaway sandbox, separate from the PMI app: the layout engine (containers > stacks > cells) draws a header, six Job details fields and a "Find the customer" page from **rows of a Google Sheet tab**. Fake data only. No bridge code, no customer data, no tests/build.py output. Nothing in `app/`, `tests/`, the live script or the live Smart PMI sheet is touched. Every later round says here how it fits.

**Files.** `index.html` (built by `python3 make.py` from the engine SOURCE parts + `proof.js`), `proof.js` (everything the proof adds), `layout-profiles.csv` (starting copy of the four profile tabs, used when the sheet cannot be read), `test-script/Code.gs` (the TEST Apps Script), `test-proof.js` (desktop tests), `README.md`.

**Test sheet** "PMI container proof (test)" (Drive: smart pmi > claude), shared "Anyone with the link: Viewer".

| Tab | What it holds |
|---|---|
| Layout test | Round 1 tab, kept as it was. Must stay the FIRST tab (see "Reading a tab"). |
| Layout phone / wide / android / iphone | One layout per profile. Columns: Screen, Row, Container, Stack, Cell, Weight, Type, Content, Slot, Font size, Align, Visible when, Label, **Id**, and column O whose heading is the tab's own name. |
| Tweaks | Device name, Profile, Cell id, Property, Value, Saved at. H1 "Save address", **H2 = the test web app address** (Danny pastes it once). Columns A-F are plain text. |

**Layout rows.** One row per cell. Screen `all` = sticky header on every page, `tray` = the drop-down Tools row (Tools button), anything else = a page (`entry`, `report`, `find`). Slot `box` = a real text box (call field `f:...` or Find box `find.*`); slot `results` = the Find list. Button actions: `set-view:<page>`, `reload-layout`, `toggle-tray`, `toggle-inspector`, `toggle-live`, `proof-profile`, `proof-save-tweaks`, `proof-clear-tweaks`, `proof-find`, `proof-cancel`. A bad row is refused with a plain line; the rest is drawn. **Id** is the stable cell id that tweaks match on (blank = made from Screen/Row/C.S.P, which breaks if cells move, so fill it). Ids must be unique.

**Profiles.** phone (auto under 700 px wide), wide (auto otherwise), android, iphone. The Profile button in Tools cycles auto > phone > wide > android > iphone > auto; the choice is remembered on the device. A missing or empty tab falls back to "Layout phone" and the bottom line says so.

**Tweaks (per device).** Rule: a device's own tweaks beat the shared tab, on that device only. The tab is never changed by the page. Device name is made once per browser (e.g. "Android Chrome 7f3a") and remembered (a home-screen icon on iPhone has its own storage, so it gets its own name). Load order: profile tab > this device's Tweaks rows for that profile > (if a save is still waiting) this device's unsent tweaks. Matched by Id; a tweak for a missing cell or with a bad value is ignored with a plain line. Saved properties: **weight, font size, label, alignment** of a cell. Other inspector changes (stack weights, row height, colors, moving cells) show until Reload but are NOT saved.

**Save tweaks** sends the full list of this device's differences from the tab for the current profile ("replace"), so undoing a change removes its row. **Clear my tweaks** removes this device's rows for the current profile. A failed save keeps the tweaks on the device (marked "not saved yet") and they are still used there. The inspector can cover the Tools row on a phone, so a Save button also shows in the bottom line whenever there are unsaved changes.

**The test script** (`test-script/Code.gs`, bound to the TEST sheet, deployed as a web app "Anyone"): it can only replace/clear rows of ONE Device name + Profile on 'Tweaks', and read one device's rows. It refuses other ops, unknown properties, bad values, values starting with = + @, more than 100 rows per save, more than 2000 rows in all, bodies over 20 KB. **Openness, said plainly:** the web app is open to anyone, and its token is in this public page, so anyone who finds both could write tweak rows to the TEST sheet. That is acceptable only because the sheet holds fake layout data; never point this script or page at a real sheet.

**Reading a tab.** Google's gviz answer (no key). Gotcha: when a tab name does not exist Google sends the FIRST tab. The page checks it got the right tab (an Id column, and no other "Layout ..." heading). Read order: live tab > last good copy on the device > `layout-profiles.csv` > copy built into the page. Tweaks: the gviz table (gives the Save address), then the script's own answer when the address is known (fresher).

**Repaint rule (round 1, unchanged).** `renderCanvas` is never called while a text box has focus; typing repaints only the results cell. A Reload that arrives while typing waits for the box to be left. **Results above the keyboard:** while a Find box has focus, the results stack moves right under that box (CSS order only, nothing redrawn) and the page scrolls that box to the top.

**Reload button** re-reads layout and tweaks without reloading the browser page; the bottom line shows page version, profile, device, read time, rows, refused, tweaks, and the last action. Tap the bottom line to shrink it.

**Inspector.** The engine's own inspector (not visitor mode this round). Tools > Inspector opens it (compact on a phone) and switches to Edit, where a tap selects a cell; closing it goes back to Live. Tool buttons (Reload, Tools, Profile, Save, Clear) still act in Edit.

**Proven (desktop, simulated Google and script):** see test-proof.js (Reload, profiles, inspector edits, save/clear per device, failed save, bad tweak rows, keyboard rule, results under the box). **Not proven yet:** the real Google read of the new tabs, the real script deploy and save, real phone keyboards with the reordered results, the inspector's feel on a phone.
