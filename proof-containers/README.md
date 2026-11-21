# proof-containers (THROWAWAY)

Proof page for Prompts no. 95 (2026-11-20). Not part of the PMI app. Delete the folder when the proof is done.

- `index.html`: the page. Built by `python3 proof-containers/make.py` from the engine SOURCE parts in `app/src/engine` only (no bridge code, no PMI layout, no tests/build.py output, no customer data). Visitor mode; its own storage keys (`proof_containers_*`, `proof-containers.*`), so it never touches the PMI app's saved data.
- `proof.js`: what the proof adds: the layout is built from sheet ROWS; slot `box` (a real text box), slot `results` (a list repainted on its own while typing, never the whole page), button actions `set-view:<screen>` (engine), `proof-find`, `proof-cancel`; bad rows refused with a plain message.
- `layout-test.csv`: a copy of the tab, used when the live read fails and there is no saved copy on the phone.
- Test sheet: **PMI container proof (test)**, tab **Layout test** (Drive: smart pmi > claude), fake data only:
  https://docs.google.com/spreadsheets/d/1VUKpTWuBC5iZw8kTxFuuRcqJphrt4mW6FGZJo1b2hB8/edit
  Columns: Screen, Row, Container, Stack, Cell, Weight, Type, Content, Slot, Font size, Align, Visible when, Label.
- Live read: Google's gviz JSON (no key). It needs the test sheet shared as "Anyone with the link: Viewer".
- Order of reading: live tab → last good copy saved on this phone ("Using saved layout") → `layout-test.csv` → the copy built into the page. The bottom line says which one was used.
