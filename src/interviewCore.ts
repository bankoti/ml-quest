export interface CoreRefresher {
  slug: string
  title: string
  prompt: string
  derivation: string[]
  worked: string
  followUp: string
  answer: string
  pitfall: string
  sourceUrl: string
}

// Original practice prompts and worked examples, not reported company questions.
// These cards support spoken reasoning and self-review; nothing is auto-graded.
export const CORE_REFRESHER: CoreRefresher[] = [
  {
    slug: 'bayes-and-base-rates',
    title: 'Bayes: reverse the condition, keep the base rate',
    prompt: 'A rare-event detector catches 80% of events but flags 5% of non-events. Derive the chance that an alert is a real event.',
    derivation: [
      'Define E = real event and A = alert. Conditional probability gives P(E∩A) = P(A|E)P(E) = P(E|A)P(A). Dividing by P(A) reverses the condition.',
      'Partition all alerts: P(A) = P(A|E)P(E) + P(A|not E)P(not E). Both terms are needed because an alert can be true or false.',
      'Therefore P(E|A) = sensitivity × prevalence / [sensitivity × prevalence + false-positive rate × (1−prevalence)]. State the population and prevalence before substituting numbers.',
    ],
    worked: 'Assume 1% prevalence in 10,000 cases: 100 events yield 80 true alerts; 9,900 non-events yield 495 false alerts. Alert precision is 80/(80+495) = 13.91%, despite 80% sensitivity.',
    followUp: 'If prevalence becomes 10%, must alert precision stay the same?',
    answer: 'No. Assuming the same sensitivity and false-positive rate, precision becomes 0.08/(0.08+0.045) = 64%. Those conditional rates may also change in a different population; verify rather than assuming transfer.',
    pitfall: 'Confusing P(alert|event) with P(event|alert), or treating a balanced evaluation sample’s precision as the deployment population’s precision.',
    sourceUrl: 'https://courses.cs.washington.edu/courses/cse312/26sp/files/sections/section3/section3-solutions.html',
  },
  {
    slug: 'ols-from-likelihood',
    title: 'OLS: likelihood, gradient, and rank',
    prompt: 'Derive linear regression rather than quoting its formula. Explain which assumptions justify least squares, and which assumptions justify a Gaussian likelihood interpretation.',
    derivation: [
      'For y = Xβ + ε with independent εᵢ ~ Normal(0, σ²), the negative log likelihood is a constant plus ||y−Xβ||²/(2σ²). Maximizing likelihood therefore minimizes squared residuals.',
      'For J(β) = ||Xβ−y||²/n, the gradient is (2/n)Xᵀ(Xβ−y). Setting it to zero gives XᵀXβ = Xᵀy: residuals are orthogonal to the feature columns.',
      'Only full column rank makes XᵀX invertible. With dependent columns, coefficients need not be unique; a pseudoinverse selects a minimum-norm solution. Least-squares minimization itself does not require Gaussian noise.',
    ],
    worked: 'For rows (1,x), x = [0,1,2], y = [1,2,2]: XᵀX = [[3,3],[3,5]], Xᵀy = [5,6]. Solve to obtain intercept 7/6 and slope 1/2. Residuals [−1/6,1/3,−1/6] give RSS = 1/6.',
    followUp: 'Why avoid explicitly computing the inverse in production?',
    answer: 'QR or SVD-based solvers avoid an unnecessary inverse and handle conditioning more reliably. Forming XᵀX squares the condition number; nearly redundant features can make coefficients unstable.',
    pitfall: 'Using the inverse formula with rank-deficient features, or assuming a strong in-sample fit establishes causal effects or honest forecast accuracy.',
    sourceUrl: 'https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-16-projection-matrices-and-least-squares/',
  },
  {
    slug: 'logistic-loss-and-calibration',
    title: 'Logistic regression: probabilities before decisions',
    prompt: 'Derive the logistic-loss gradient, implement it without overflowing exponentials, and explain why changing an alert threshold does not recalibrate a model.',
    derivation: [
      'Let z = xᵀβ and p = sigmoid(z). The Bernoulli negative log likelihood is −y log(p) − (1−y) log(1−p), equivalently softplus(z)−yz.',
      'Compute softplus(z) as max(z,0) + log1p(exp(−|z|)). For sigmoid, use 1/(1+exp(−z)) when z≥0, otherwise exp(z)/(1+exp(z)); neither branch exponentiates a large positive number.',
      'Differentiating gives ∂loss/∂z = p−y; the mean-loss gradient is Xᵀ(p−y)/n. A probability model estimates risk; a threshold separately converts that risk into a decision.',
    ],
    worked: 'One example has x = [1,2], y = 1, β = [0,0]. Then p = 0.5 and gradient = [−0.5,−1]. A step of size 0.1 gives β = [0.05,0.1], z = 0.25, and p ≈ 0.5622.',
    followUp: 'Can threshold tuning improve probability log loss?',
    answer: 'Not while probabilities stay fixed. Calibration changes probability estimates and must use held-out or out-of-fold predictions. Threshold tuning optimizes a decision policy, such as review cost or capacity.',
    pitfall: 'Interpreting good accuracy as good calibration. Reliability depends on whether predicted probabilities match observed frequencies, not simply whether they exceed 0.5.',
    sourceUrl: 'https://cs229.stanford.edu/notes2022fall/main_notes.pdf',
  },
  {
    slug: 'regularization-and-variance',
    title: 'L1 versus L2: shrinkage is a tradeoff',
    prompt: 'Explain why a less flexible fit can predict better, derive a simple shrinkage example, and distinguish sparse coefficients from merely smaller coefficients.',
    derivation: [
      'First center the training feature columns and target: X and y below denote these centered quantities, with no intercept column. Fit the intercept separately as mean(y_raw) − mean(x_raw)ᵀβ. Use objective ½||y−Xβ||² plus either (λ/2)||β||² for ridge or λ||β||₁ for lasso; the separately fitted intercept is unpenalized.',
      'Ridge’s gradient gives (XᵀX+λI)β = Xᵀy for penalized coordinates. Lasso uses a subgradient at zero, permitting exact zeros rather than only continuous shrinkage.',
      'Under squared error, expected prediction error decomposes into squared bias, estimator variance, and irreducible noise. Shrinkage can reduce variance while adding bias; increasing λ does not guarantee lower validation error.',
    ],
    worked: 'For the centered, intercept-free design above, suppose feature columns are orthonormal: XᵀX = I and z = Xᵀy = [3,0.5]. Then λ = 1 gives ridge β = z/(1+λ) = [1.5,0.25]. Lasso soft-thresholds: sign(z)max(|z|−λ,0) = [2,0]. Recover the unpenalized intercept from the training means.',
    followUp: 'What must happen before comparing penalties across differently scaled features?',
    answer: 'Fit an appropriate scaler on training data only, then apply it to validation data. Tune λ inside the validation procedure; leave final test data untouched. Scaling changes what coefficient magnitude means.',
    pitfall: 'Treating lasso’s selected variables as proven causes, or comparing identical numeric λ values across libraries with differently normalized objectives.',
    sourceUrl: 'https://scikit-learn.org/stable/modules/linear_model.html',
  },
  {
    slug: 'bagging-versus-boosting',
    title: 'Ensembles: cancel variation or follow a gradient',
    prompt: 'Explain why averaging many copies of one tree is not a random forest, then derive what the next gradient-boosted learner should fit.',
    derivation: [
      'At a fixed input, suppose B fitted predictors have equal variance σ² and equal pairwise correlation ρ. Their average has variance σ²[ρ+(1−ρ)/B], by summing variances and covariances.',
      'Bootstrap samples and random feature subsets encourage different fitted trees. Adding trees reduces the uncorrelated part of their variation; correlation leaves a variance floor. Prediction bias is not removed by this formula.',
      'Boosting instead fits a learner to −∂ℓ(y,F)/∂F, then updates F ← F + ηh. For ½(y−F)² this is y−F. For Bernoulli log loss with logit F, it is y−sigmoid(F).',
    ],
    worked: 'For B = 25, σ² = 1, and ρ = 0.2, ensemble variance is 0.2+0.8/25 = 0.232, not 1/25. In logistic boosting, y = 1 and p = 0.8 give a negative gradient of 0.2.',
    followUp: 'Does adding more boosting rounds always improve future predictions?',
    answer: 'No. Additional sequential corrections can overfit. Choose learning rate, tree capacity, and stopping round using validation appropriate to the deployment setting, including chronological validation for forecasts.',
    pitfall: 'Saying every boosting loss fits ordinary residuals, or claiming averaging makes correlated learners independent and eliminates all uncertainty.',
    sourceUrl: 'https://scikit-learn.org/stable/modules/ensemble.html',
  },
  {
    slug: 'pca-and-target-relevance',
    title: 'PCA: maximize variation, not label information',
    prompt: 'Derive the first principal component and show why retaining most input variance can still remove the feature direction needed for prediction.',
    derivation: [
      'Center the training matrix X. Its sample covariance is C = XᵀX/(n−1). A projection onto a unit direction w has sample variance wᵀCw.',
      'Maximize wᵀCw subject to wᵀw = 1. The Lagrangian derivative gives Cw = λw; choosing the largest eigenvalue gives the direction retaining the greatest variance.',
      'Later components are orthogonal covariance eigenvectors. Keeping leading components minimizes squared reconstruction error among orthogonal linear projections of that dimension; labels never entered this objective.',
    ],
    worked: 'For C = [[2,1],[1,2]], eigenvectors (1,1)/√2 and (1,−1)/√2 have eigenvalues 3 and 1. The first retains 3/(3+1) = 75% of variance. A target determined by the difference x₁−x₂ can nevertheless depend entirely on the discarded direction.',
    followUp: 'What changes if one input is converted from meters to millimeters?',
    answer: 'Its numerical variance grows, changing covariance PCA and potentially its dominant direction. Decide whether standardization fits the scientific question; fit centering, scaling, and PCA on training folds only.',
    pitfall: 'Treating explained variance as supervised accuracy, or fitting PCA on the full dataset before evaluation because it does not use labels.',
    sourceUrl: 'https://scikit-learn.org/stable/modules/decomposition.html#pca',
  },
  {
    slug: 'uncertainty-and-dependent-data',
    title: 'Uncertainty: a mean is not tomorrow’s demand',
    prompt: 'Separate uncertainty about average performance from variation in a future observation. Then explain how dependent forecast comparisons change your resampling plan.',
    derivation: [
      'Under iid Normal observations with known σ, Var(sample mean) = σ²/n. For a new independent observation, Var(new value−sample mean) = σ²(1+1/n): future noise remains even with abundant training data.',
      'A confidence interval targets a population quantity such as mean loss; a prediction interval targets a future observation. In time series, model dynamics and forecast horizon determine additional uncertainty.',
      'Compare models using paired losses for the same forecast tasks. Resample contiguous blocks of paired tasks to preserve dependence, retaining each origin’s horizon group. Check block-length sensitivity and whether stationarity is plausible.',
    ],
    worked: 'Assume n = 100 iid Normal observations, known σ = 10, and mean 40. A 95% mean CI is 40±1.96 = [38.04,41.96]. A one-new-observation PI is 40±1.96×10√1.01 ≈ [20.30,59.70]. These are not generic time-series formulas.',
    followUp: 'Does bootstrapping the winning model’s test losses undo model-selection bias?',
    answer: 'No. Repeatedly choosing a winner on those same losses already spent the test evidence. Use a genuinely untouched evaluation period or nest the selection procedure within an appropriate outer evaluation.',
    pitfall: 'Resampling overlapping forecast errors as independent observations, or presenting a narrow mean-loss CI as an interval for tomorrow’s demand.',
    sourceUrl: 'https://otexts.com/fpp3/advanced.html',
  },
  {
    slug: 'ab-estimands-and-power',
    title: 'A/B testing: define the effect before the test',
    prompt: 'Specify the randomized unit, outcome window, and estimand before choosing a test. Distinguish an observed lift from an effect the experiment was powered to detect.',
    derivation: [
      'For independently randomized eligible users, define Δ as treatment-minus-control conversion probability over a fixed window, using assignment (intention to treat). Estimate Δ with p̂₁−p̂₀.',
      'For a large-sample CI, SE = √[p̂₁(1−p̂₁)/n₁ + p̂₀(1−p̂₀)/n₀]. Under the equality null, a standard two-proportion z-test instead uses the pooled proportion.',
      'Plan α, power, and minimum detectable effect δ before launch. With equal arms and assumed common baseline p, a small-effect approximation is n per arm ≈ 2p(1−p)(z₁₋α/₂+z₁₋β)²/δ². Baseline p is an assumption, not a universal constant.',
    ],
    worked: 'For 1,000 users per arm, control conversion 0.10 and treatment 0.12 give lift 0.02 and SE = √0.0001956 ≈ 0.01399. The approximate 95% CI is [−0.0074,0.0474]: a two-percentage-point estimate is not conclusive evidence of improvement.',
    followUp: 'What if treatment is assigned to stores and each store contributes many users?',
    answer: 'Users within a store are not independent randomization units. Plan and analyze at the cluster level or use valid cluster-aware inference. Predefine primary metrics and handle the planned family of comparisons.',
    pitfall: 'Counting sessions as independent users, treating non-significance as equivalence, or repeatedly peeking at ordinary fixed-horizon p-values without a sequential-testing plan.',
    sourceUrl: 'https://openintro-ims.netlify.app/inference-two-props',
  },
]
