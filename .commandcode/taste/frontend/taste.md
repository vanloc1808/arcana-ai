# frontend
- Uses yarn (not npm) as the frontend package manager — commands are run via `yarn test`, `yarn type-check`, `yarn jest`. Confidence: 0.8
- Validates frontend changes with `tsc --noEmit` type-check and the relevant jest test suite before reporting the fix as complete. Confidence: 0.6
