# proof-containers (THROWAWAY sandbox)

Proof page for Prompts no. 95 (round 1), no. 96 (round 2) and no. 100 (round 3, proof 0.3.0), 2026-11-20/21. Not part of the PMI app. **Read DESIGN.md** (tabs, profiles, tweak rules, repaint rule, what is proven).

- Build: `python3 proof-containers/make.py` (engine SOURCE parts + proof.js; no bridge, no customer data).
- Test: `export NODE_PATH="$(npm root -g)"; node proof-containers/test-proof.js; node proof-containers/test-proof-r3.js` (Google simulated; r3 runs the real Code.gs in Node).
- Test sheet: https://docs.google.com/spreadsheets/d/1VUKpTWuBC5iZw8kTxFuuRcqJphrt4mW6FGZJo1b2hB8/edit (fake data only).
- Test script: `test-script/Code.gs` (TEST sheet only; deploy steps in the Prompts no. 96 report).
- Page: https://platts-ac.github.io/pmi-inspection/proof-containers/
