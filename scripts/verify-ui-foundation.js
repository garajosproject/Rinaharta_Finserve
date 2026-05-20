const fs = require('fs')
const path = require('path')

const root = process.cwd()

const checks = [
  {
    file: 'src/app/globals.css',
    rules: [
      "@tailwind base;",
      "@tailwind components;",
      "@tailwind utilities;",
    ],
  },
  {
    file: 'src/app/layout.tsx',
    rules: [
      "import './globals.css'",
      '<html',
      '<body>',
      '</body>',
      '</html>',
    ],
  },
  {
    file: 'tailwind.config.js',
    rules: [
      "./src/**/*.{js,jsx,ts,tsx,mdx}",
    ],
  },
  {
    file: 'postcss.config.js',
    rules: [
      'tailwindcss',
      'autoprefixer',
    ],
  },
]

const guidance = [
  'CRITICAL FILES: src/app/layout.tsx, src/app/globals.css, tailwind.config.js, postcss.config.js',
  'RULE: Do not modify global layout or CSS pipeline files during feature work unless explicitly requested.',
  'RULE: All normal UI updates must stay inside feature components.',
  'SAFETY CHECK: If UI renders as plain HTML, verify Tailwind imports before proceeding.',
  'SAFETY CHECK: If className styling disappears, stop and fix the CSS pipeline first.',
]

let hasError = false

for (const check of checks) {
  const filePath = path.join(root, check.file)
  if (!fs.existsSync(filePath)) {
    console.error(`Missing required file: ${check.file}`)
    hasError = true
    continue
  }

  const content = fs.readFileSync(filePath, 'utf8')
  for (const rule of check.rules) {
    if (!content.includes(rule)) {
      console.error(`Validation failed in ${check.file}: missing ${rule}`)
      hasError = true
    }
  }
}

console.log(guidance.join('\n'))

if (hasError) {
  process.exit(1)
}

console.log('UI foundation verification passed.')
