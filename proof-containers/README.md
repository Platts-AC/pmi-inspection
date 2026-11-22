# proof-containers (THROWAWAY sandbox)

Proof page for Prompts no. 95 (round 1), no. 96 (round 2) no. 100 (round 3), no. 101 (round 4) no. 103 (round 5), no. 104 (round 6), no. 105 (round 7), no. 108 (round 8), no. 109 (round 9), no. 113 (round A) and no. 114 (round A.1, proof 0.10.1), 2026-11-20/21. Not part of the PMI app. **Read DESIGN.md** (tabs, profiles, tweak rules, repaint rule, what is proven).

- Build: `python3 proof-containers/make.py` (engine SOURCE parts + proof.js; no bridge, no customer data); it also writes version.json. Publish index.html AND version.json.
- Test: `export NODE_PATH="$(npm root -g)"; node proof-containers/test-proof.js; node proof-containers/test-proof-r3.js; node proof-containers/test-proof-r4.js; node proof-containers/test-proof-r5.js; node proof-containers/test-proof-r6.js; node proof-containers/test-proof-r7.js; node proof-containers/test-proof-r8.js; node proof-containers/test-proof-r9.js; node proof-containers/test-proof-r10.js; node proof-containers/test-proof-r11.js` (Google simulated; r3 to r11 run the real Code.gs in Node).
- Test sheet: https://docs.google.com/spreadsheets/d/1VUKpTWuBC5iZw8kTxFuuRcqJphrt4mW6FGZJo1b2hB8/edit (fake data only).
- Test script: `test-script/Code.gs` (TEST sheet only; deploy steps in the Prompts no. 96 report).
- Page: https://platts-ac.github.io/pmi-inspection/proof-containers/ (autofill test page: add ?autofill=1)
- Tester's suite (do not edit): `tests-independent/run-findings.js`.
