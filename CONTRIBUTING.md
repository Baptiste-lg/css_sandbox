# Contributing

Thanks for your interest in contributing to CSS Sandbox!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/css_sandbox.git`
3. Open `index.html` in your browser — no build step needed

## Development

This is a vanilla HTML/CSS/JS project. There is no bundler, no framework, and no `node_modules`. The source files *are* the production files.

```
index.html       Entry point
style.css        All styles
app.js           Application logic
highlight.js     Syntax highlighter
lzstring.js      LZ-String compression (vendored, do not modify)
```

To test changes, open `index.html` directly in your browser or use a local server:

```sh
python3 -m http.server 8080
```

## Code Style

- Formatting is enforced by **Prettier** (see `.prettierrc`)
- CSS is linted by **Stylelint** (see `.stylelintrc.json`)
- JS is linted by **ESLint** (see `.eslintrc.json`)
- CI runs all three automatically — your PR must pass before merging

If you want to run linters locally:

```sh
npx prettier --check "*.html" "*.css" "*.js"
npx stylelint "*.css"
npx eslint app.js highlight.js
```

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/my-change`
2. Make your changes
3. Commit with a clear message using the `[ADD]`, `[FIX]`, or `[UPDATE]` prefix
4. Push and open a Pull Request against `main`
5. Fill out the PR template

## Reporting Bugs

Use the [bug report template](https://github.com/Baptiste-lg/css_sandbox/issues/new?template=bug_report.yml). Include your browser and device.

## Guidelines

- Keep the project dependency-free — no npm packages in production
- Do not modify `lzstring.js` (it is a vendored third-party library)
- Test in at least Chrome and Firefox before submitting
- Follow the existing code patterns and naming conventions
