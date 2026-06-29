# Reviewing on-screen annotations (for AI agents)

This project uses `dev-annotate`. A human scribbles on the live page in the
browser, takes an OS screenshot, and uploads it. Your job is to read that
annotated screenshot and act on it.

## Workflow

1. Get the latest annotated screenshot path:
   ```
   npx dev-annotate latest
   ```
   For several recent ones: `npx dev-annotate latest -n 3`
2. Open/read that image file. The red pen / text / numbered pins are the
   human's instructions on the real UI.
3. Locate the corresponding code, make the fix, and verify (build / run /
   screenshot) before reporting.
4. After the change is confirmed, clean up processed screenshots:
   ```
   npx dev-annotate clean --all --yes
   ```
5. To wait for the next annotation in a long-running loop:
   ```
   npx dev-annotate watch
   ```

## Notes
- Screenshots live under `.dev-annotations/annotated-*.{png,jpg,webp}`
  by default (override with `--dir`).
- Treat an annotation as intent, not pixels: confirm the underlying cause
  before changing how something looks.
