export interface CapstoneDecision {
  title: string
  context: string
  question: string
  options: string[]
  correct: number
  explanation: string
  skill: string
}

export interface Capstone {
  slug: string
  number: string
  eyebrow: string
  title: string
  brief: string
  deliverable: string
  accent: string
  decisions: CapstoneDecision[]
}

export const CAPSTONES: Capstone[] = [
  {
    slug: 'price-a-home',
    number: '01',
    eyebrow: 'Regression · product thinking',
    title: 'Price a home people have not listed yet.',
    brief: 'A marketplace needs a useful price range before a seller creates a listing. Build the evaluation plan before choosing the fanciest model.',
    deliverable: 'A leakage-safe regression plan with a baseline, a business metric, and honest uncertainty.',
    accent: '#2f57d6',
    decisions: [
      { title: 'Define the target', context: 'Historical records contain list price, final sale price, and the listing description.', question: 'What should the model predict?', options: ['Final sale price', 'List price', 'Whether the description mentions “renovated”'], correct: 0, explanation: 'The product promises an estimate of what the home may sell for. Final sale price is the outcome that matches that promise.', skill: 'Problem framing' },
      { title: 'Protect the future', context: 'The market changed sharply over time, and the product will score future listings.', question: 'How should you create the final test set?', options: ['Randomly sample rows from every year', 'Use the newest time period', 'Use the smallest homes only'], correct: 1, explanation: 'A time-based holdout recreates deployment: train on the past, then predict a later market the model has not seen.', skill: 'Evaluation design' },
      { title: 'Set the floor', context: 'The team wants to know whether machine learning is actually helping.', question: 'What is the best first baseline?', options: ['Predict the training-set median sale price', 'Train a 500-tree ensemble', 'Copy the list price into the prediction'], correct: 0, explanation: 'A constant median is simple, hard to game, and gives every more complex model a floor it must beat.', skill: 'Baselines' },
      { title: 'Choose the score', context: 'A few luxury properties have extreme errors, but a typical seller should get a sensible estimate.', question: 'Which primary metric fits best?', options: ['Accuracy', 'Mean absolute error', 'Training loss after one epoch'], correct: 1, explanation: 'MAE reports the typical error in price units and is less dominated by rare luxury outliers than squared error.', skill: 'Metrics' },
      { title: 'Tell the truth', context: 'Two homes with similar features can still sell for very different prices.', question: 'What should the product display?', options: ['A single exact number', 'A prediction range with a central estimate', 'The training-set R² only'], correct: 1, explanation: 'A calibrated range communicates irreducible uncertainty and gives users a more honest decision aid.', skill: 'Uncertainty' },
    ],
  },
  {
    slug: 'catch-fraud',
    number: '02',
    eyebrow: 'Classification · responsible decisions',
    title: 'Catch fraud without blocking everyone else.',
    brief: 'Only a tiny fraction of card payments are fraudulent. Design the decision system around costs, thresholds, and human review.',
    deliverable: 'An imbalanced-classification policy that separates model scores from business actions.',
    accent: '#d52d6f',
    decisions: [
      { title: 'Read the base rate', context: 'Fraud occurs in 0.3% of payments. A model that predicts “safe” every time is 99.7% accurate.', question: 'What does that accuracy tell you?', options: ['The model is excellent', 'Almost nothing about fraud detection', 'The data is perfectly balanced'], correct: 1, explanation: 'Accuracy hides failure on a rare class. You need class-specific metrics and the confusion matrix.', skill: 'Class imbalance' },
      { title: 'Pick the lens', context: 'Investigators can review only 800 payments per day, and wasted reviews are expensive.', question: 'Which curve is most informative?', options: ['Precision–recall curve', 'Training accuracy curve', 'Feature count curve'], correct: 0, explanation: 'Precision–recall exposes the tradeoff between catching fraud and spending the limited review budget on false alarms.', skill: 'Metric selection' },
      { title: 'Separate score from action', context: 'The model outputs a fraud probability. Different actions have different costs.', question: 'What should the team do next?', options: ['Always use a 0.5 threshold', 'Choose thresholds from business costs and capacity', 'Round every probability to 0 or 1'], correct: 1, explanation: 'A score is evidence, not a policy. Thresholds should reflect review capacity, customer harm, and fraud loss.', skill: 'Thresholds' },
      { title: 'Create a safe policy', context: 'Blocking a legitimate rent payment can seriously harm a customer.', question: 'Which action design is safest?', options: ['Block every flagged payment', 'Use score bands: allow, review, and step-up verification', 'Ignore the model until it is perfect'], correct: 1, explanation: 'Tiered actions reserve the harshest intervention for the highest-risk cases and give uncertain cases a reversible path.', skill: 'Human-in-the-loop design' },
      { title: 'Watch the slices', context: 'Aggregate recall is stable, but fraud patterns and customer behavior differ across regions.', question: 'What belongs on the launch dashboard?', options: ['Only global accuracy', 'Precision, recall, volume, and false-positive rate by key slice', 'Only average transaction value'], correct: 1, explanation: 'Slice metrics reveal localized harm and emerging attacks that a healthy global average can conceal.', skill: 'Responsible monitoring' },
    ],
  },
  {
    slug: 'keep-churn-healthy',
    number: '03',
    eyebrow: 'Production ML · operations',
    title: 'Keep a churn model useful after launch.',
    brief: 'A subscription team ships a churn model, then changes pricing and onboarding. Turn a notebook into a monitored, recoverable system.',
    deliverable: 'A production plan for drift, retraining, validation, and rollback.',
    accent: '#177245',
    decisions: [
      { title: 'Save the evidence', context: 'The first model is ready to deploy and performed well on its final holdout.', question: 'What must be versioned with the model?', options: ['Only the model file', 'Code, features, data snapshot, metrics, and model artifact', 'A screenshot of the notebook'], correct: 1, explanation: 'Reproducibility requires the full lineage: what ran, on which data, with which features, and how it performed.', skill: 'Reproducibility' },
      { title: 'Watch inputs and outcomes', context: 'Labels arrive 30 days after a customer either stays or leaves.', question: 'What should monitoring include?', options: ['Input drift now and performance when labels arrive', 'Only CPU usage', 'Retrain every night without checking'], correct: 0, explanation: 'Input and prediction drift give early signals; delayed labels later confirm whether real predictive quality changed.', skill: 'Monitoring' },
      { title: 'Make alerts actionable', context: 'A feature distribution shifts slightly every weekend.', question: 'When should an alert fire?', options: ['On any statistical difference', 'When a sustained change crosses an impact-aware threshold', 'Only after the model fully fails'], correct: 1, explanation: 'Useful alerts combine magnitude, duration, traffic, and business impact so normal seasonality does not become noise.', skill: 'Alert design' },
      { title: 'Retrain with a gate', context: 'New labeled data is available and an automated retraining job produced a candidate.', question: 'What happens before promotion?', options: ['Replace production immediately', 'Compare on fixed tests and slices, then canary the candidate', 'Delete the previous model'], correct: 1, explanation: 'A candidate must clear offline gates and a controlled online rollout. Retraining is not proof of improvement.', skill: 'Deployment gates' },
      { title: 'Plan the bad day', context: 'The new model unexpectedly sends too many retention offers.', question: 'What is the fastest safe response?', options: ['Edit the database by hand', 'Roll back to the versioned model and investigate', 'Wait for the next retraining run'], correct: 1, explanation: 'A tested rollback path limits harm quickly while preserving evidence for the root-cause investigation.', skill: 'Recovery' },
    ],
  },
]

export function getCapstone(slug: string) {
  return CAPSTONES.find(project => project.slug === slug)
}
