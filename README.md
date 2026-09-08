# ML Quest

An interactive, zero-to-hero machine learning course. Learn by changing live models, writing real Python, and proving each idea with tests — no setup required.

## Course

- 27 visual lessons across six stages
- 27 graded Python quests running fully in the browser
- Dedicated interactive animations for linear regression, logistic regression, KNN, SVM, decision trees, random forests, boosting, and neural networks
- Computed regression, loss, threshold, KNN, SVM, boosting, and gradient-descent experiments, with architecture and concept illustrations labeled separately
- Concept checkpoints with immediate explanations
- Dedicated practice track and searchable ML field guide
- Three guided capstones covering regression, fraud detection, and production ML
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

The behavior checks cover computed errors, fixed-score threshold invariants, SVM optimization, additive boosting, stable forest votes, lesson resume links, and capstone save/reopen/completion. Small deterministic teaching datasets are not benchmarks; architecture sketches and illustrative values are labeled in the lessons. The Data lab provides actual held-out evaluation.

The SVM demo fits a symmetric one-feature soft-margin objective with its intercept fixed at zero. The boosting demo fits regression stumps to squared-error residuals with learning rate 0.5. These follow the [SVM formulation](https://scikit-learn.org/stable/modules/svm.html#mathematical-formulation), [gradient boosting formulation](https://scikit-learn.org/stable/modules/ensemble.html#gradient-boosting), and [decision-threshold guidance](https://scikit-learn.org/stable/modules/classification_threshold.html).

## Publishing

Pull requests to `main` run the same verification. Pushes to `main` deploy automatically to GitHub Pages at <https://bankoti.github.io/ml-quest/>.
