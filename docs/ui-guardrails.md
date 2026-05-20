# UI Guardrails

Critical files in this repo:

- `src/app/layout.tsx`
- `src/app/globals.css`
- `tailwind.config.js`
- `postcss.config.js`

Rules:

- Do not modify these files during normal feature work.
- Keep future UI changes inside feature components unless a layout or CSS pipeline change is explicitly requested.
- Do not restructure the root layout unless the task specifically calls for it.

Safety checks:

- If the UI renders as plain HTML, verify the Tailwind directives in `src/app/globals.css` first.
- If `className` styles stop applying, stop feature work and repair the CSS pipeline before continuing.
- Run `npm run verify:ui-foundation` before and after major UI changes.

Validation notes for this repo:

- Tailwind directives are present in `src/app/globals.css`.
- `src/app/layout.tsx` imports `./globals.css` and wraps content in `<html><body>`.
- `tailwind.config.js` scans `./src/**/*.{js,jsx,ts,tsx,mdx}`.
- `postcss.config.js` enables `tailwindcss` and `autoprefixer`.
