# Browser QA — September 10, 2026

## Verified

- All 27 lesson routes rendered at 390px and 1280px with no page-level horizontal overflow or non-finite numeric readouts.
- Inspected the dedicated graphics for linear regression, logistic regression, KNN, SVM, decision trees, random forests, boosting, and neural networks.
- In a fresh local browser origin, the first Python quest downloaded and ran Python, rejected its starter, accepted a correct implementation, retained the code after reload, cancelled a run, and terminated an infinite loop at the 20-second execution limit.
- The five house-price planning decisions completed and unlocked the build studio. Its starter ran in browser Python and failed the independently calculated baseline check as expected.
- Corrected and visually checked the studio training-button contrast. Corrected homepage build counts/copy, evaluation-save messages, storage-failure advice, project headings/main landmarks, and project-specific evaluation explanations.
- `DEPLOY_BASE=/ml-quest/ npm test` passed after the fixes. This includes all course/component checks, 101-position model invariants, all three real Python capstone implementations, eight-file ZIP contents, standalone predictor execution, and worker isolation/cancellation/timeout tests.
- An independent read-only review found no regressions in these changes.

## Still requires interactive browser verification

The in-app browser stopped accepting input after the worked-example native confirmation opened in the disposable QA tab. Its dialog API returned no accessible dialog, and closing the tab timed out. Fresh tabs remained readable, so layout checks continued, but automated/component results are **not** a substitute for the remaining real-browser checks:

1. Dismiss the pending confirmation and verify worked-example replacement.
2. Complete train/evaluate, sandboxed preview parity, edited form predictions, downloads, and build completion for all three capstones.
3. Exercise the churn rejection/rollback drill in the preview.
4. Verify saved build artifacts across reload/back/forward and re-launch requirements before downloading.
5. Exercise animation controls, the mobile menu, and progress reset using the disposable test origin only.

No public-site mastery, drafts, or progress were changed by QA. Browser automation limitations must not be reported as a full end-to-end pass.
