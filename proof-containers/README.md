# proof-containers (THROWAWAY sandbox)

Proof page for Prompts no. 95 (round 1), no. 96 (round 2) no. 100 (round 3), no. 101 (round 4) no. 103 (round 5), no. 104 (round 6), no. 105 (round 7), no. 108 (round 8), no. 109 (round 9), no. 113 (round A), no. 114 (round A.1), no. 116 (round A.2), no. 118 (round B1) no. 121 (round B2) no. 125 (fixes, proof 0.12.1) no. 130 (fixes, proof 0.12.2), no. 132 (proof 0.12.3) no. 134 (Round C1a, proof 0.13.0) no. 137 (fixes, proof 0.13.1) no. 138 (Round C1b, proof 0.14.0) no. 141 (fixes, proof 0.14.1) no. 143 (Round C2a, proof 0.15.0; C2b, proof 0.16.0) no. 144 (Round C3a, proof 0.17.0; C3b, proof 0.18.0) and no. 145 (Round C3c, proof 0.19.0 / 0.20.0), 2026-11-20 to 22. Not part of the PMI app. **Read DESIGN.md** (tabs, profiles, tweak rules, repaint rule, what is proven).

- Build: `python3 proof-containers/make.py` (engine SOURCE parts + proof.js; no bridge, no customer data); it also writes version.json. Publish index.html AND version.json.
- Test: `bash proof-containers/run-lanes.sh all` (3 lanes; or a list of files, or `area:<NAME>` from `test-areas.txt`; logs and summary in /tmp/proof-lanes). Single file: `export NODE_PATH="$(npm root -g)"; node proof-containers/test-proof-r13b.js`. Since 2026-11-22 the slow files are split by area: r10a/b, r13a/b/c, r14a/b/c (shared start code in test-lib-ra.js, test-lib-b1.js, test-lib-b2.js). Google simulated; the real Code.gs runs in Node.
- Test sheet: https://docs.google.com/spreadsheets/d/1VUKpTWuBC5iZw8kTxFuuRcqJphrt4mW6FGZJo1b2hB8/edit (fake data only).
- Test script: `test-script/Code.gs` (TEST sheet only; deploy steps in the Prompts no. 96 report).
- Page: https://platts-ac.github.io/pmi-inspection/proof-containers/ (autofill test page: add ?autofill=1)
- Converters (not run by the page): `tools/convert-layout.js` (old Layout tab -> Structure + Items, round A), `tools/convert-to-b1.js` (Round A -> Fields, Items, Profile sizes, Items (Round A), round B1), `tools/convert-to-b2.js` (B1 -> B2 columns and the Long test page, round B2).
- Tester's suite (do not edit): `tests-independent/run-findings.js`.
