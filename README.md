# Read broken CSV files faster

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/m1651/makefun-csv-reader/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/m1651/makefun-csv-reader/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for csv-reader 1.0.0: `solve.js` reads broken CSV files with
exactly csv-reader's answers — BOM, stray CRs, unterminated quotes, quote
junk, short and long rows — but locates each field with native `indexOf`
and takes it with one slice instead of building it a character at a time.
`main.ts` is the house driver: it reads every case from `/input/cases.json`
and writes `/output/answers.json`.

## Run it

```sh
mkdir -p output && MAKEFUN_INPUT_DIR=input MAKEFUN_OUTPUT_DIR=output node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=wwm9ek0a&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
