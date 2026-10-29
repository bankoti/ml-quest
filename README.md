# ML Quest

Interactive machine-learning foundations and a focused interview refresher. Learn by changing live models, writing real Python, and testing your reasoning — no local setup required.

## Course

- Six beginner foundations: variables, lists, conditions, loops, functions, and visual math, each with a traced example, prediction, interactive graphic, and executable Python exercise
- A guided learning map showing prerequisites, separate concept/Python progress, and honest coverage labels for core lessons, introductions, and specializations not yet taught
- 27 visual lessons across six stages
- 27 graded Python quests running fully in the browser
- Dedicated interactive animations for linear regression, logistic regression, KNN, SVM, decision trees, random forests, boosting, and neural networks
- Computed experiments in every lesson: fitted CART/bootstrapped forests, ridge regression, cross-validation, Lloyd’s K-means, PCA, MAD anomaly scores, item-based recommendations, XOR backpropagation, convolution, causal softmax attention, and distribution monitoring
- Concept checkpoints with immediate explanations
- Lesson-specific predict–experiment–explain notebooks for all 27 lessons, with saved reflections and transfer questions (not automatically graded)
- A model-comparison lab: constant, linear, quadratic, and ridge fits on identical training/validation splits, common plot scales, real error metrics, and an explicit warning against treating repeated validation as a final test
- Dedicated practice track and searchable ML field guide
- Three end-to-end capstones: planning, real Python training, held-out evaluation, and standalone deployment-readiness checks
- Downloadable project kits containing training code, executable tests, versioned synthetic data, fitted model, metrics, self-contained predictor HTML, rebuild script, and publishing instructions
- Adaptive ten-question review sessions that prioritize weak and untouched concepts
- Private browser-based dataset playground with CSV import, exploratory train/validation evaluation, baseline comparison, visual results, and downloadable experiment briefs
- XP, streaks, mastery tracking, project completion, and a printable certificate
- Browser-saved progress, lesson bookmarks, code drafts, and unfinished capstone decisions
- Responsive, touch-friendly, and keyboard-accessible

## One-week forecasting and inventory interview refresher

Open `#/interview` in the running app. The track is designed for an experienced learner preparing for data-scientist/research-scientist interviews in seven days at six hours per day. It is not an actual Intuit question bank or a guarantee of interview readiness. The original course remains available; advanced specializations outside this goal are still explicitly deferred.

- **12 deeper modules:** problem framing and censored demand; statistical foundations; temporal structure; classical models; global forecasts; intermittent/hierarchical demand; backtesting; probabilistic forecasting; newsvendor; replenishment; constrained optimization; research/causal design.
- **Eight core derivation cards:** Bayes, OLS, logistic gradients, regularization, ensembles, PCA, interval uncertainty, and experiments.
- **Four computed labs:** 1–28-day rolling-origin baselines, empirical newsvendor costs, animated daily inventory accounting, and a forecast-to-policy comparison with validation selection followed by a frozen final evaluation.
- **Six executable Python/SQL trials:** calendar-safe panel features, multi-horizon rolling origins, forecast metrics, discrete newsvendor, replenishment ledger, and SQLite calendar-window features. Reference solutions, test contracts and hints are available after an independent attempt.
- **Four original timed cases:** demand forecasting, inventory decisions, research-policy evaluation, and small-business cash-flow/craft-demo reasoning. Follow-up twists and dimension-specific rubrics are self-assessment, not automated interview grades.

| Day | Focus |
| --- | --- |
| 1 | Frame the decision; probability, loss and inference |
| 2 | Temporal structure; classical forecasting and baselines |
| 3 | Global/sparse/hierarchical forecasts; Python and SQL features |
| 4 | Honest backtesting; metrics and predictive uncertainty |
| 5 | Newsvendor, lead time, service and replenishment |
| 6 | Constraints, forecast-to-policy trials and research design |
| 7 | Timed mocks, correction, truthful own-project craft rehearsal |

Every day totals 360 minutes, including 30 minutes of breaks: 38.5 active hours plus 3.5 break hours. Explain concepts aloud, calculate before revealing the worked answer, implement from the contract, and defend an unseen variant. The [whole-course audit](docs/interview-course-audit.md) records what was reused, deepened, corrected and deferred.

Interview drafts, notes, checked answers and pass-once records use separate `ml-quest-interview-v1:` keys. They do not award core XP or alter the certificate. The plan can download a JSON notebook containing only these interview records. Notes are device-local, not cloud-synchronized; another tab on the same origin can update them. Browser-storage failure is shown visibly. Viewing a reference solution is recorded, and a prior pass does not certify an edited draft.

The policy trial uses fully observed synthetic true demand, including during stockouts, and lost sales rather than backorders. All methods share starting stock and demand; on-hand stock and the order pipeline carry across the validation/final boundary. Charges cover closing inventory and lost sales, not purchase costs, capacity, salvage, or terminal pipeline value. This is an explicitly limited decision experiment, not a production-optimal replenishment system or causal field trial. Reusing its final period for tuning makes it development data.

## Local development

```bash
npm install
npm run dev
```

Run `npm test` for a production build plus all core and interview checks. Node 22+ and Python 3 are required for development tests. Run `npm run test:interview` for the focused forecasting/policy mathematics, real CPython exercise contracts, and React interface tests. The interface harness stubs only Python execution for race/cancellation testing; it does not substitute for a real browser/WASM check.

The behavior checks exercise every lab, mathematical invariants at all 101 slider positions, lesson resume, separate plan/build completion, beginner and experiment-notebook persistence, comparison-fit metrics, draft preservation, stale preview-message rejection, real Python reference solutions and rejected starters, ZIP round trips, exported HTML prediction parity, model rebuilding, and worker cancellation/timeouts. Tiny deterministic synthetic datasets are teaching tools, not real-world benchmarks. The Data lab also supports independent CSV experiments.

## Learning path and coverage

Start at `#/starter` if Python is new, then use `#/map` for the guided core path. The beginner track is optional and never locks existing lessons. In each core lesson, predict before touching the controls, follow the investigation, explain the result, then complete the concept and Python checks. Use `#/compare` to contrast models and the capstones to apply what you learned.

The map is not a claim that every ML specialization has been implemented. Reinforcement learning, semi/self-supervised learning, transfer learning, generative modeling, and probabilistic graphical models are marked **not yet taught**. Architectures, training objectives, and applications overlap; they are not mutually exclusive branches of one taxonomy.

The certificate retains its original 54 core checks (27 concepts + 27 Python quests). Beginner completions and drafts use [separate storage](src/BeginnerTrack.tsx); [experiment predictions/reflections](src/ExperimentGuide.tsx) are saved per lesson. They award no core XP and cannot overwrite core progress. Resetting core progress preserves beginner completion, all saved code drafts, and notebook predictions/reflections. Each beginner editor offers an inline-confirmed reset of that editor only. All progress and artifacts are device-local; there is no account or cloud synchronization.

## Capstone contract and progress

Each project has 90 training, 30 validation, and 30 test examples in chronological order. Training-only preprocessing is serialized with model weights. House-price intervals use validation residuals; fraud thresholds use validation cost/capacity; churn candidate selection uses validation log loss. Final test metrics report the frozen model and policy. Repeated learning attempts are not a pristine scientific holdout.

Existing `progress.capstones` entries remain completed **plans** with their original 500 XP. New `progress.builds` milestones earn a separate 500 XP only after Python checks and a sandboxed, source/nonce-verified static predictor smoke check. See [Learning path and coverage](#learning-path-and-coverage) for storage and reset behavior.

“Deployment-ready” means the exported JavaScript predictor runs and matches Python. It does **not** mean a learner’s separate project has been published. Each kit includes explicit GitHub Pages publishing and rollback instructions; the course itself is publicly hosted below.

Python uses a pinned Pyodide 0.26.2 runtime from jsDelivr in a fresh worker per run. First use requires a network download. The SQL trial explicitly loads the optional `sqlite3` package before execution; other trials do not download it. Execution times out after 20 seconds (runtime/package download timeout: 90 seconds); cancellation terminates the worker, and stale results cannot award progress. The course does not upload learner code/data. The standalone exported predictor has no external scripts or runtime requests.

The SVM demo fits a symmetric one-feature soft-margin objective with its intercept fixed at zero. The boosting demo fits regression stumps to squared-error residuals with learning rate 0.5. These follow the [SVM formulation](https://scikit-learn.org/stable/modules/svm.html#mathematical-formulation), [gradient boosting formulation](https://scikit-learn.org/stable/modules/ensemble.html#gradient-boosting), and [decision-threshold guidance](https://scikit-learn.org/stable/modules/classification_threshold.html).

## Publishing

Pull requests to `main` run the same verification. Pushes to `main` deploy automatically to GitHub Pages at <https://bankoti.github.io/ml-quest/>.
