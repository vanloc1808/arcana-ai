# logging
- Use loguru.logger instead of the standard Python logging module for backend logging. Confidence: 0.75
- Prefers small, logically-split commits (e.g., one per metric/feature) with changelog entries; commits before continuing to the next change. Confidence: 0.9
- When providing implementation instructions in docs/guides, show what to change and where (after/before which line) rather than the full rewritten function. Confidence: 0.85
- Guides and documentation must reflect actual code — do not invent or assume code patterns that don't exist in the codebase. Confidence: 0.85
- Uses screenshots/images heavily to communicate UI bugs and desired visual changes. Confidence: 0.8
- Creates feature branches for significant changes rather than working directly on main. Confidence: 0.7
