# EliteGDX tests
```
npm i -D playwright && npx playwright install chromium     # once
node tests/run-all.mjs                                      # everything (needs the images/TTC/data folders only for cosmetic 404s)
node tests/e2e-remote.mjs                                   # one suite
```
* All network is blocked or mocked — no suite touches the real internet, so results are repeatable.
* Unit tests (`cist.unit`, `ephemeris.test`, `vendor.test`) need only Node 18+.
* `ephemeris.test.mjs` checks the Astrolabe maths against real events (equinoxes, oppositions, eclipses).
* `CHROME_PATH=/path/to/chrome` to use a specific browser, `SITE_ROOT=/path` to test another folder.
