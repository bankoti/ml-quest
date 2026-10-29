# ML Quest interview-refresher audit

Audit date: 2026-10-28. Scope: the complete core course and its learning map, Python quests, computed laboratories, experiment guides, model comparison, dataset playground, reference material, and three capstones. The initial read used 59d917b; implementation continues from its descendant c299052 on the interview branch. Unrelated workspace projects were excluded.

The learner has one week and six hours per day. The stated target is data-scientist/research-scientist interviewing at Intuit, with a particular interest in demand forecasting and inventory optimisation. This document is a curriculum audit, not a claim about confidential company questions, a specific role's interview script, an independently accredited course, or a guaranteed outcome.

## Assessment of the existing course

The course is a useful interactive introduction and intuition refresher. It is not, by itself, a comprehensive interview-preparation course. Its computation and learning scaffolds should be retained; its completion indicators should not be treated as evidence of independent research or interview readiness.

The reviewed inventory contains six beginner units, 27 core lessons, 27 executable Python quests, 27 predict–experiment–explain guides, a four-model comparison exercise, a local CSV playground, three planning/build capstones, and an adaptive ten-question review drawn from the existing lesson quizzes.

Strengths include actual fitting rather than scripted accuracy curves; training-only preprocessing in the capstones; residual and objective calculations; honest notes about small synthetic datasets; causal masking in the attention illustration; and explicit distinctions between input drift and model failure, model scores and policies, and validation and final testing. Model comparison uses identical splits and plot scales and warns against treating repeated validation as a final test.

## Whole-course disposition

| Area | Existing depth | Disposition in the seven-day refresher |
| --- | --- | --- |
| Beginner Python and visual math | Syntax, traced examples, coordinates, fractions, weighted sums | Reuse selectively when diagnostic errors identify a prerequisite gap. |
| Supervised algorithms | Real regression/classification demonstrations; small component-level Python drills | Deepen with derivations, assumptions, fitting/debugging, complexity, and model-choice reasoning. |
| Optimization, features, regularization | Real quadratic gradient updates, polynomial features, ridge and model comparisons | Reuse the visuals; connect loss to likelihood, scaling, bias–variance, temporal availability, and decision costs. |
| Evaluation and leakage | Confusion counts, precision/recall, ordinary folds, clean holdout examples, future-feature leakage | Add temporal panel evaluation, horizon/latency rules, dependence, selection accounting, and calibration. |
| Unsupervised methods | K-means, two-dimensional PCA, MAD anomalies, item similarities | Retain as references for compression, segmentation, and monitoring; do not substitute them for a demand or policy objective. |
| Deep learning | XOR backpropagation, hand-specified convolution, small causal-attention calculation | Useful mechanism introductions; broad architecture training is deferred unless the actual role requires it. |
| Production and capstones | Train-only preprocessing, portable predictor parity, validation policies, drift and rollback | Reuse the engineering contract; add realistic temporal data, policy consequences, uncertainty and customer-outcome evaluation. |
| Statistics and inference | Fragments of probability, moments, and one calibrated interval task | New focused sequence: likelihood/loss, distributions, estimation, CI versus prediction interval, dependent resampling. |
| Forecasting | Demand appears in static regression stories; time-based evaluation is mentioned in prose | New sequence: temporal diagnostics, baselines, ETS/ARIMA, global models, intermittency, hierarchy, backtesting, distributions. |
| Inventory optimisation | No dedicated course content | New sequence: newsvendor, lead-time uncertainty, replenishment, service metrics, constraints, network tradeoffs and simulation. |
| Research and causal reasoning | General reminders to validate and monitor | New sequence: hypotheses, ablations, identification, assignment unit, interference, uncertainty, prospective guardrails. |
| Interview trials | Repeated core recognition quizzes; saved reflections are not graded | Add unseen timed cases, calculations, debugging, oral defense, and a truthful own-project craft demonstration. |

## Baseline issues and current disposition

The baseline observations below were rechecked against the current source on 2026-10-28. “Corrected” describes a verified wording or contract change, not a claim that every surrounding workflow has been independently validated or expanded.

### Corrected wording and explicit assumptions

1. **Loss definition — corrected.** src/reference.ts now says a loss need not be differentiable and distinguishes smooth MSE from MAE's kink and gradient/subgradient/other optimization methods. The interview statistics module reinforces this distinction.
2. **Calibration definition — corrected.** src/reference.ts now explains positive-class probability 0.8 as approximately 80% actual label 1, explicitly distinguishing this from accuracy at an arbitrary threshold.
3. **Undefined precision/recall convention — clarified.** src/codeChallenges.ts identifies zero-denominator ratios as mathematically undefined and returning zero as this exercise's software convention, not an observed rate. Playground classification instructions also disclose that convention. Different displays no longer need to imply different mathematical definitions.
4. **CSV binary-label mapping — corrected.** src/Playground.tsx now states that values greater than zero are positive and zero/negative values are negative, matching its implementation.
5. **Playground holdout interpretation — corrected.** The interface, chart legend, and exported experiment brief now call repeatedly explored results validation, warn that repeated selection is not a final test, and direct the learner to reserve separate untouched data. The tool remains an exploratory shuffled-row exercise; it does not create a frozen final holdout or a time-series backtest.
6. **House interval assumptions — added.** src/ProjectStudio.tsx now explains exchangeability, marginal versus conditional coverage, drift/dependence, and that capping a requested rank at n does not retain a general nominal-coverage guarantee. Its reported coverage is explicitly a tiny synthetic-sample observation. This corrects the missing caveat; it does not turn the exercise into a general time-series conformal implementation.
7. **Core coding scope — renamed honestly.** src/App.tsx now describes 27 component drills as warmups, not complete algorithm implementations. The exercises remain narrow: regression applies supplied coefficients; logistic computes sigmoid; SVM applies a sign; trees execute one split; boosting subtracts arrays; the neural quest evaluates one neuron. The naming fix does not establish from-scratch model proficiency.

### Remaining depth and evidence limitations

- **Synthetic capstones remain narrow.** All three use 150 generated examples, two features, and a largely provided training loop. Their chronological IDs do not create seasonality, meaningful multi-step dependence, demand censoring, or replenishment consequences. The new interview labs and trials complement rather than retroactively deepen these capstones.
- **Recognition is not independent reasoning.** One repeated multiple-choice quiz per core lesson is retrieval practice, not evidence of unseen derivation, diagnosis, research design, or communication. The new timed cases, coding trials and oral-derivation desk provide opportunities for that work, but prose self-assessment and viewed solutions do not certify competence.
- **Core completion is not interview readiness.** Existing certificates document the core course. Broad algorithm implementation, realistic external-data work, an independently defended own-project narrative, and role-specific depth still require learner evidence; they are not inferred from completion markers.
- **Integration evidence is separate.** Source review confirms the wording above. Browser behavior, persistence, accessibility, executable exercises and lab–text agreement require their own verification before a release claim.

## Prerequisite mapping

The baseline learning map has stage-level preparation. The following lesson-level map supports targeted review. These are pedagogical dependencies, not UI locks. New math bridges are intentionally identified rather than assumed to exist in the core course.

| Existing lesson slug | Preparation |
| --- | --- |
| machines-that-learn | Optional beginner functions and visual-math units |
| data-is-the-curriculum | machines-that-learn |
| train-test-split | machines-that-learn; data-is-the-curriculum |
| beat-the-baseline | train-test-split |
| linear-regression | machines-that-learn; beat-the-baseline |
| loss-functions | linear-regression |
| gradient-descent | loss-functions; derivative/gradient bridge |
| feature-engineering | linear-regression; train-test-split |
| regularization | feature-engineering; loss-functions; gradient-descent |
| logistic-classification | linear-regression; probability/log-odds/log-loss bridge |
| knn-classification | machines-that-learn; feature-engineering |
| support-vector-machines | linear-regression; regularization; hinge-loss bridge |
| decision-trees | machines-that-learn; train-test-split; impurity bridge |
| ensemble-power | decision-trees; train-test-split; bootstrap/variance bridge |
| gradient-boosting | decision-trees; loss-functions; gradient-descent |
| confusion-matrix | logistic-classification |
| precision-and-recall | confusion-matrix; beat-the-baseline |
| cross-validation | train-test-split; loss-functions |
| leakage-and-imbalance | data-is-the-curriculum; feature-engineering; precision-and-recall; cross-validation |
| clustering | knn-classification; feature-engineering |
| dimensionality-reduction | feature-engineering; centering/covariance/eigenvector bridge |
| anomaly-detection | feature-engineering; precision-and-recall |
| recommender-systems | knn-classification; feature-engineering; cosine/implicit-feedback bridge |
| neural-networks | logistic-classification; gradient-descent; regularization; chain-rule bridge |
| computer-vision | neural-networks |
| language-and-attention | neural-networks; matrix-dimension/softmax bridge |
| deploy-and-monitor | cross-validation; leakage-and-imbalance; precision-and-recall |

## The 42-hour priority and its limits

The executable schedule is STUDY_DAYS in src/interviewContent.ts. Each of seven days totals exactly 360 minutes, including two 15-minute breaks. Thus the budget contains 38.5 hours of active work and 3.5 hours of breaks, not 42 hours of reading. Reading, retrieval, calculations, coding, experimental trials, and explanation are separate tasks. The first six days have two modules each; Day 7 is practice and correction rather than new specialization content.

| Day | Modules | Required evidence from active work |
| --- | --- | --- |
| 1 | problem-framing; statistical-foundations | Written forecast contracts, cutoff audit, loss derivations and numerical checks |
| 2 | time-series; classical-models | Temporal diagnostics, tested baselines, SES/AR reasoning and assumptions |
| 3 | global-forecasting; sparse-hierarchical | Leakage-safe Python features and SQL calendar windows, direct/recursive explanation, Croston/SBA calculation, hierarchy argument |
| 4 | backtesting; probabilistic-forecasting | Rolling-origin contract, leakage diagnosis, metrics/quantile calculation and uncertainty defense |
| 5 | newsvendor; replenishment | Critical-fractile derivation, exact discrete expected costs, inventory-state trace and lead-time assumptions |
| 6 | constrained-optimization; research-design | Feasible pack allocation, policy stress test, credible experiment and truthful project narrative |
| 7 | Two timed mocks; debriefs; craft-demo rehearsal; targeted repair | Unseen-case reasoning, corrected mistakes, evidence-backed communication, and a record of remaining gaps |

Retain demand and inventory as the principal application. Use small-business cash-flow forecasting and product interventions as transfer exercises, not as claims about the exact job. The official Intuit hiring page describes craft demonstrations and technical conversations while noting role-dependent processes. Rehearse a real project with truthful ownership and measured or explicitly unmeasured customer impact. Confirm the specific role's expected format with the recruiter. All prompts in this course are original practice material, not leaked or purported real Intuit questions.

Defer broad computer-vision, generative-model, reinforcement-learning, and architecture surveys unless the actual role requires them. Mention an MDP only to explain dynamic state/action assumptions and why a contextual bandit may be insufficient for inventory. Safety-stock placement concerns the network's inventory buffers and is treated as an operational network decision.

## Scientific contracts for new trials

- Use the same eligible cases, forecast origins, horizons, initial inventory, and demand/lead-time scenarios for paired model or policy comparisons.
- Derive displayed metrics from the same data and decisions visible in the exercise. Show training, validation, and test roles without relabeling repeatedly selected results.
- Report undefined denominators honestly. MASE below one compares against its training scale; it does not automatically beat the test-window naive forecast.
- Keep Croston/SBA point forecasts distinct from predictive distributions. State the common-alpha convention and approximate nature of the SBA correction.
- For random lead-time moments, state IID per-period demand and independence of lead time. Use conditional forecast-error uncertainty or joint scenarios when trend, seasonality, correlation, or dependence invalidates that shortcut.
- Keep cycle service level distinct from fill rate, and lost sales distinct from backorders. Define arrival/order/demand/expiry event order and terminal-state accounting.
- Treat empirical backtests and policy simulations as conditional evidence. Causal claims require an identification design; clustered assignment and interference affect the independent unit of analysis.
- Score formulation, mathematics, implementation, empirical evidence, and communication separately. A strong response names assumptions, tests alternatives, and distinguishes demonstrated results from plausible hypotheses.
- Keep verified baseline corrections distinct from continuing depth limitations. Adding the new track does not itself fix every core-course issue, and local quiz success does not establish interview readiness.

## Primary references used for content verification

The UI source registry uses stable IDs. Source pages may be consolidated chapters; link to the relevant section when the renderer supports it. Examples and interview prompts in this track are original teaching material.

- fpp-accuracy, fpp-tscv, fpp-distribution: [Forecasting: Principles and Practice — The forecaster's toolbox](https://otexts.com/fpp3/toolbox.html), especially accuracy, rolling-origin evaluation, and distributions.
- fpp-arima: [Forecasting: Principles and Practice — ARIMA models](https://otexts.com/fpp3/arima.html).
- fpp-ets: [Forecasting: Principles and Practice — Exponential smoothing](https://otexts.com/fpp3/exponential-smoothing.html).
- fpp-croston: [Forecasting: Principles and Practice — Some practical forecasting issues](https://otexts.com/fpp3/practical.html), especially intermittent count demand; see also the authors' [Croston-method research paper](https://robjhyndman.com/papers/croston.pdf).
- fpp-hierarchy: [Forecasting: Principles and Practice — Hierarchical and grouped series](https://otexts.com/fpp3/hierarchical-forecasting.html).
- mit-newsvendor: [MIT OpenCourseWare — Single Period Inventory Models](https://ocw.mit.edu/courses/esd-260j-logistics-systems-fall-2006/755a26f6aaebae8928294146a2484cd4_lect14.pdf).
- mit-inventory: [MIT OpenCourseWare — Inventory Management: Probabilistic Demand](https://ocw.mit.edu/courses/esd-260j-logistics-systems-fall-2006/8b53c45fd26ffff706d815131e8d177e_lect11.pdf).
- sklearn-lagged: [scikit-learn — Lagged features for time-series forecasting](https://scikit-learn.org/stable/auto_examples/applications/plot_time_series_lagged_features.html).
- athey-policy: [Athey and Wager — Policy Learning With Observational Data](https://arxiv.org/abs/1702.02896).
- demand-censoring: [INSEAD — Demand Estimation and Ordering Under Censoring](https://www.insead.edu/faculty-research/publications/journal-articles/demand-estimation-and-ordering-under-censoring-stock).
- sba-bias: [Syntetos and Boylan — On the bias of intermittent demand estimates](https://www.sciencedirect.com/science/article/pii/S0925527300001432); sba-variance: [On the variance of intermittent demand estimates](https://www.sciencedirect.com/science/article/pii/S0925527310002306). These support an approximate, not universal, SBA bias-correction claim.
- hyndman-wape: [Rob Hyndman — WAPE: Weighted Absolute Percentage Error](https://robjhyndman.com/hyndsight/wape.html).
- price-endogeneity: [Besanko, Gupta and Jain — Logit Demand Estimation Under Competitive Pricing Behavior](https://www.kellogg.northwestern.edu/academics-research/research/detail/1998/logit-demand-estimation-under-competitive-pricing-behavior-an-equilibrium/).
- switchback-design: [Bojinov, Simchi-Levi and Zhao — Design and Analysis of Switchback Experiments](https://arxiv.org/abs/2009.00148).
- intuit-hiring: [Intuit — Hiring process](https://www.intuit.com/careers/hiring-process/).

Before claiming the integrated refresher is complete, verify content/UI links, all numeric examples, lab–text consistency, accessible controls, Python reference solutions and rejected incorrect solutions, persistence, and the exact study-time totals. This audit records curriculum requirements; it is not an execution report for those integration checks.

## Final focused-curriculum review — October 29, 2026

A second read-only review covered the twelve modules, eight core derivation cards, six executable coding trials, four mock cases, and the lab–text contracts. It found one remaining schedule-to-practice gap: Day 4 assigned leakage debugging without supplying the faulty pipeline. That gap is now closed by the backtesting module's 60-minute pseudocode-review exercise, retaining the same daily time budget.

The exercise supplies a complete calendar and two-day reporting-delay contract, deliberately defective feature construction, label eligibility, preprocessing and recursive-baseline logic, a saved diagnosis, and a hidden repair guide. Its numerical boundary trace and adversarial probes were independently reviewed. In particular, changing future actuals may change scores without changing issued predictions; changing eligible training evidence for a global model may legitimately affect other entities. These distinctions are part of the exercise, not invariants incorrectly imposed by its review guide.

No other blocking content-correctness finding remained in that focused review. Derivations, worked calculations, executable contracts, original timed cases and oral follow-ups support the requested one-week refresher. Advanced ARIMA fitting, reconciliation algorithms and probabilistic-model training remain conceptual rather than independently assessed implementations. Broad research-specialization mastery, a recruiter's exact interview loop and the learner's own unaided performance are not established by this review. Browser and execution evidence is recorded separately in `docs/browser-qa.md`; final release validation and publication are still separate requirements.
