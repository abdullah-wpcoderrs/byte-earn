# Typography QA

## Rules

- DM Sans is imported globally in `app/globals.css`.
- Only 400, 500, and 600 weights are imported.
- Body text defaults to 11px.
- Routine section headers use 16px.
- Product titles and important numbers may scale up to 28px, never above.
- Do not use `font-bold`, `font-extrabold`, or `font-black`; use `font-semibold` only when emphasis is needed.
- Do not scale text with viewport width.
- Letter spacing remains normal.

## Verification

Run these checks before marking a UI route complete:

```powershell
rg "font-(bold|extrabold|black)|text-\[([3-9][0-9]|2[9-9])px\]" app components
npm run lint
npm run build
```
