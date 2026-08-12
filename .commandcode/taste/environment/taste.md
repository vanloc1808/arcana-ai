# environment
- The user's shell exports `NODE_ENV=production`, which makes `npm install` silently skip devDependencies and forces jest onto production React builds. Unset it for local dev work: run tests with `env -u NODE_ENV ...` and install with `NODE_ENV=development npm install --include=dev`. Confidence: 0.85
