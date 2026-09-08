# ML Quest

An interactive, zero-to-hero machine learning course. Learn by changing live models, writing real Python, and proving each idea with tests — no setup required.

## Course

- 27 visual lessons across six stages
- 27 graded Python quests running fully in the browser
- Dedicated interactive animations for linear regression, logistic regression, KNN, SVM, decision trees, random forests, boosting, and neural networks
- Computed experiments in every lesson: fitted CART/bootstrapped forests, ridge regression, cross-validation, Lloyd’s K-means, PCA, MAD anomaly scores, item-based recommendations, XOR backpropagation, convolution, causal softmax attention, and distribution monitoring
- Concept checkpoints with immediate explanations
- Dedicated practice track and searchable ML field guide
- Three end-to-end capstones: planning, real Python training, held-out evaluation, and standalone deployment-readiness checks
- Downloadable project kits containing training code, executable tests, versioned synthetic data, fitted model, metrics, self-contained predictor HTML, rebuild script, and publishing instructions
- Adaptive ten-question review sessions that prioritize weak and untouched concepts
- Private browser-based dataset playground with CSV import, real train/test evaluation, baseline comparison, visual results, and downloadable experiment briefs
- XP, streaks, mastery tracking, project completion, and a printable certificate
- Browser-saved progress, lesson bookmarks, code drafts, and unfinished capstone decisions
- Responsive, touch-friendly, and keyboard-accessible

## Local development

```bash
npm install
npm run dev
```

Run `npm test` for a production build plus smoke checks covering course inventory, interactive labs, Python quests, the playground, and social preview metadata.

The behavior checks exercise every lab, mathematical invariants at all 101 slider positions, lesson resume, separate plan/build completion, draft preservation, stale preview-message rejection, real Python reference solutions and rejected starters, ZIP round trips, exported HTML prediction parity, model rebuilding, and worker cancellation/timeouts. Tiny deterministic synthetic datasets are teaching tools, not real-world benchmarks. The Data lab also supports independent CSV experiments.

## Capstone contract and progress

Each project has 90 training, 30 validation, and 30 test examples in chronological order. Training-only preprocessing is serialized with model weights. House-price intervals use validation residuals; fraud thresholds use validation cost/capacity; churn candidate selection uses validation log loss. Final test metrics report the frozen model and policy. Repeated learning attempts are not a pristine scientific holdout.

Existing `progress.capstones` entries remain completed **plans** with their original 500 XP. New `progress.builds` milestones earn a separate 500 XP only after Python checks and a sandboxed, source/nonce-verified static predictor smoke check. Resetting mastery preserves lesson and project code drafts. All progress and artifacts are device-local; there is no account sync.

“Deployment-ready” means the exported JavaScript predictor runs and matches Python. It does **not** mean a learner’s separate project has been published. Each kit includes explicit GitHub Pages publishing and rollback instructions; the course itself is publicly hosted below.

Python uses a pinned Pyodide 0.26.2 runtime from jsDelivr in a fresh worker per run. First use requires a network download. Execution times out after 20 seconds (download timeout: 90 seconds); cancellation terminates the worker, and stale results cannot award progress. Learner code/data is not uploaded. The standalone exported predictor has no external scripts or runtime requests.

The SVM demo fits a symmetric one-feature soft-margin objective with its intercept fixed at zero. The boosting demo fits regression stumps to squared-error residuals with learning rate 0.5. These follow the [SVM formulation](https://scikit-learn.org/stable/modules/svm.html#mathematical-formulation), [gradient boosting formulation](https://scikit-learn.org/stable/modules/ensemble.html#gradient-boosting), and [decision-threshold guidance](https://scikit-learn.org/stable/modules/classification_threshold.html).

## Publishing

Pull requests to `main` run the same verification. Pushes to `main` deploy automatically to GitHub Pages at <https://bankoti.github.io/ml-quest/>.
