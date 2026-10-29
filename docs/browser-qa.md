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

---

# Interview refresher verification — October 29, 2026

This is new verification, not a retroactive claim that the September checks passed. Testing used isolated Chrome for Testing sessions and the production build at `/ml-quest/` on a local Vite preview server. Both build and preview require `DEPLOY_BASE=/ml-quest/`. Initial preview asset failures caused by launching preview without that base were corrected before testing. The public GitHub Pages site and its learner storage were not modified.

## Interview track

- `DEPLOY_BASE=/ml-quest/ npm test` passes: the complete original suite plus forecasting/policy arithmetic, real CPython contracts and React interface tests. The six reference solutions pass, six unfinished starters fail, and twelve plausible domain-error mutants fail in CPython.
- All six unfinished starters were also rejected by real browser Pyodide, and all six reference solutions passed in the actual shipped interface. The SQL trial executed real SQLite queries. SQLite must be loaded explicitly in Pyodide 0.26.2; its optional package download occurs before the execution timer begins.
- Real browser cancellation terminates the job, and an infinite loop produces the 20-second execution-limit error. Code drafts and pass-once history survive a full reload. Interface tests separately reproduce and prevent the same-batch cross-tab code-change/old-result race.
- All 17 interview destinations (overview, four desks and twelve modules) render at 1200px. Representative overview, module, core, labs, Python and mock pages were checked at 1121, 1000, 390 and 320px. No document-level horizontal overflow was found.
- Small-screen SVG labels initially shrank to approximately five pixels. The fixed plot preserves a 710px drawing width inside a keyboard-focusable horizontal-scroll region. At 320px, labels remain readable, ArrowRight scrolls the plot, the focus ring is visible, and the document remains 320px wide. Wide tables are contained separately.
- Keyboard tests cover the mobile menu, navigation focus, quiz radio selection/feedback, and table/plot scrolling. Module and mock notes survive full navigation. Mock timers run and pause; leaving a case resets its timer while retaining its answer. Finishing an attempt stops the timer.
- The policy trial reveals validation first, then freezes its validation-selected rule, then reveals the final period. Its ledger exposes 42 rows before final reveal and 70 after. Changing a control hides the results and requires a new prediction; the prior-final-inspection warning remains.
- Independent content review checked the worked mathematics and assumptions, including conditional means, covariance in aggregate uncertainty, centered ridge/lasso conventions, censoring selection bias, interval interpretation, newsvendor costs, lead-time moments and paired research comparisons. All seven study days total exactly 360 minutes.
- The interview notebook export is tested as an actual JSON artifact and excludes core progress and unrelated origin storage. Storage failure remains visible; formative notes and self-rubrics do not award core XP or certify interview competence.

## Legacy capstone gaps revisited

- All three five-decision plans and real-browser Python worked implementations passed. Each exported preview matched its five Python inference vectors. Native worked-example confirmation was exercised successfully in the isolated session.
- A previously unverified bug was reproduced: edited predictor forms could not submit because the iframe lacked `allow-forms`. The sandbox now permits only scripts and forms; it still omits same-origin and top-level-navigation privileges. The mounted interface checks this policy, and all three edited forms were retested in the real browser.
- Independent edited-input comparisons matched the artifacts: house price for area 1800/age 10 was $367026; fraud for amount 500/recent count 2 was 0.0% with no review; churn for tenure 12/tickets 4 was 99.2% with a flag. No blocked-form-submission errors remained.
- The churn rejection drill rejected the candidate (0.9370) and restored the stable prediction (0.0630). Build milestones were earned only in the isolated QA profile. Code/evaluation/build history persisted after a hard reload, while export correctly required a fresh preview launch.
- All three downloaded project ZIPs contained eight entries and passed `unzip -t`. Native worked-example and starter-reset confirmations were tested for both cancel and accept; reset invalidated evaluation/preview without removing previously earned build history. A real retrain restored parity. Home/project back/forward navigation also passed.
- At 390×844, the mobile menu opened, navigated and closed without overflow. Neural animation play advanced the control, pause stopped it, and restart returned it to zero. Disposable-profile progress reset cancelled safely or cleared plans/build progress while preserving all three evaluated code drafts. These checks close the September interaction gaps on the current local build; public deployment is still a separate step.

## Scope and release boundary

These are deterministic teaching exercises and browser checks, not a real-world forecasting benchmark, causal validation, or a prediction of an interview outcome. The build still reports a non-failing large-chunk warning (about 229 KB gzipped application JavaScript); there is no new runtime dependency. New hosting/publication is a separate release step and must not be inferred from local verification.
