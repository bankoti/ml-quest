export type LabType =
  | 'pattern' | 'data' | 'split' | 'baseline' | 'regression' | 'classifier'
  | 'tree' | 'ensemble' | 'loss' | 'gradient' | 'features' | 'regularize'
  | 'confusion' | 'tradeoff' | 'crossval' | 'leakage' | 'cluster' | 'projection'
  | 'anomaly' | 'recommend' | 'network' | 'vision' | 'attention' | 'monitor'

export interface Lesson {
  slug: string
  title: string
  description: string
  minutes: number
  lab: LabType
  objective: string
  mentalModel: string
  experiment: string
  takeaways: string[]
  quiz: { question: string; options: string[]; correct: number; explanation: string }
}

export interface Stage {
  number: string
  title: string
  shortTitle: string
  description: string
  accent: string
  lessons: Lesson[]
}

const lesson = (
  slug: string,
  title: string,
  description: string,
  minutes: number,
  lab: LabType,
  objective: string,
  mentalModel: string,
  experiment: string,
  takeaways: string[],
  question: string,
  options: string[],
  correct: number,
  explanation: string,
): Lesson => ({ slug, title, description, minutes, lab, objective, mentalModel, experiment, takeaways, quiz: { question, options, correct, explanation } })

export const STAGES: Stage[] = [
  {
    number: '01', title: 'Think like a learning machine', shortTitle: 'Foundations', accent: '#0b7a57',
    description: 'Build the intuition first: patterns, examples, fair tests, and useful baselines.',
    lessons: [
      lesson('machines-that-learn', 'Machines that learn', 'Turn examples into a rule without programming every case.', 8, 'pattern', 'See learning as pattern-finding, not magic.', 'A model is a rule shaped by examples. It receives inputs, looks for structure, and produces a prediction.', 'Move the decision boundary until it separates the two groups. Notice which points remain hard.', ['Learning means choosing a rule from evidence.', 'Inputs become features; answers become targets.', 'Useful rules generalize to new examples.'], 'What does a supervised model learn from?', ['Only instructions written by a programmer', 'Examples paired with answers', 'Random numbers', 'A database schema'], 1, 'Supervised learning uses labeled examples: inputs paired with the answers we want the model to learn.'),
      lesson('data-is-the-curriculum', 'Data is the curriculum', 'Explore how coverage and noise shape what a model can learn.', 9, 'data', 'Recognize why data quality sets the ceiling for model quality.', 'Your dataset is the model’s experience of the world. Missing regions become blind spots; wrong labels become bad lessons.', 'Adjust coverage and noise. Watch confidence grow with representative examples and fall with messy labels.', ['More data helps only when it adds useful coverage.', 'Labels can be incomplete or wrong.', 'Sampling choices encode assumptions.'], 'Which dataset is usually most useful?', ['The largest one, regardless of quality', 'A representative, correctly labeled sample', 'Only the easiest examples', 'A dataset with no edge cases'], 1, 'Representative coverage and trustworthy labels matter more than raw row count.'),
      lesson('train-test-split', 'The honest test', 'Keep some examples hidden so success means something.', 8, 'split', 'Separate practice data from proof of generalization.', 'Training performance is like a score on homework you already saw. Test performance is the exam on unseen questions.', 'Change the train/test split. Too little training starves the model; too little testing makes the score unstable.', ['Train on one subset and evaluate on another.', 'Never tune repeatedly against the final test set.', 'A validation set guides model choices.'], 'Why keep a test set hidden?', ['To make training faster', 'To estimate performance on unseen data', 'To remove all noise', 'To guarantee perfect accuracy'], 1, 'A hidden test set approximates future data the model did not memorize or influence.'),
      lesson('beat-the-baseline', 'Beat the baseline', 'Prove the model adds value beyond a simple guess.', 7, 'baseline', 'Use the simplest credible comparison before celebrating a model.', 'A baseline is the score to beat: predict the average, the majority class, or a simple rule.', 'Change class balance and compare majority guessing with a learned rule.', ['Baselines expose fake progress.', 'Choose a baseline aligned with the task.', 'Complexity is earned only by better outcomes.'], 'A model scores 82% accuracy. When is that unimpressive?', ['When the majority class is 85%', 'When training took one minute', 'When it has few parameters', 'When the data is tabular'], 0, 'If a trivial majority guess gets 85%, the 82% model is worse than doing almost nothing.'),
    ],
  },
  {
    number: '02', title: 'Learn from labeled examples', shortTitle: 'Supervised ML', accent: '#3f5efb',
    description: 'Predict numbers and categories with the workhorses of practical machine learning.',
    lessons: [
      lesson('linear-regression', 'Draw the best line', 'Predict a number with linear regression and squared error.', 10, 'regression', 'Connect a fitted line to numeric prediction.', 'Linear regression chooses a line whose predictions stay close to the observed targets. Residuals are the vertical misses.', 'Adjust the slope and intercept to reduce mean squared error.', ['The line maps features to a numeric target.', 'Residuals show individual errors.', 'Squared error punishes large misses strongly.'], 'What does linear regression usually predict?', ['A continuous number', 'Only yes or no', 'A cluster name with no labels', 'A sequence of tokens'], 0, 'Regression predicts continuous quantities such as price, temperature, or demand.'),
      lesson('logistic-classification', 'Turn scores into classes', 'Use a probability threshold to make a decision.', 10, 'classifier', 'Understand classification as probability plus a decision rule.', 'A classifier can produce a probability. A threshold converts that probability into an action such as approve or decline.', 'Move the threshold and watch false positives trade places with false negatives.', ['Probabilities preserve more information than labels.', 'The default 0.5 threshold is not sacred.', 'Costs should shape the decision threshold.'], 'Lowering a positive-class threshold usually does what?', ['Predicts fewer positives', 'Predicts more positives', 'Changes the training labels', 'Eliminates uncertainty'], 1, 'A lower bar lets more examples count as positive, increasing both true and false positives.'),
      lesson('decision-trees', 'Ask better questions', 'Grow a decision tree by splitting the feature space.', 11, 'tree', 'Read a tree as a sequence of if/then questions.', 'Each split asks a feature question that makes the remaining groups purer. Leaves hold the final prediction.', 'Increase tree depth. Watch the boundary become flexible—and eventually too specific.', ['Trees model nonlinear rules naturally.', 'Depth controls complexity.', 'Deep trees can memorize noise.'], 'What often happens when a tree becomes too deep?', ['It can overfit the training data', 'It becomes linear', 'It needs no data', 'It stops making predictions'], 0, 'Very deep trees can create tiny regions around training examples and fail to generalize.'),
      lesson('ensemble-power', 'Let models vote', 'Combine imperfect trees into a stronger ensemble.', 10, 'ensemble', 'See why diverse errors can cancel out.', 'Bagging trains models on varied samples and averages their predictions. Boosting builds models that focus on prior mistakes.', 'Add voters and vary their diversity. Watch the ensemble stabilize.', ['Averaging reduces variance.', 'Diversity matters more than identical copies.', 'Random forests and boosting use different strategies.'], 'Why can an ensemble beat one model?', ['Every model is perfect', 'Independent mistakes can average out', 'Voting removes the need for labels', 'It always uses less compute'], 1, 'When models make different errors, combining them can reduce the impact of any one mistake.'),
    ],
  },
  {
    number: '03', title: 'Train models deliberately', shortTitle: 'Training', accent: '#ef5b45',
    description: 'Turn error into improvement through loss, optimization, features, and regularization.',
    lessons: [
      lesson('loss-functions', 'Name the mistake', 'Choose a loss that teaches the behavior you care about.', 9, 'loss', 'Treat loss as the signal that directs learning.', 'Loss converts “how wrong?” into a number. Training searches for parameters that make that number smaller.', 'Increase the outlier. Compare absolute and squared loss reactions.', ['Loss is optimized during training.', 'Metrics and losses can differ.', 'The loss embeds priorities about mistakes.'], 'Why does squared error react strongly to outliers?', ['It ignores large errors', 'It squares the size of each error', 'It clips every error at one', 'It only counts signs'], 1, 'Squaring makes a miss twice as large contribute four times as much loss.'),
      lesson('gradient-descent', 'Walk downhill', 'Follow the gradient from a bad guess toward a useful model.', 11, 'gradient', 'Visualize optimization as navigating a loss landscape.', 'The gradient points uphill. Subtracting a step in that direction moves parameters downhill toward lower loss.', 'Change the learning rate and run steps. Find the range that converges without bouncing.', ['Gradients measure local slope.', 'Learning rate controls step size.', 'Too small is slow; too large can diverge.'], 'What is a common sign that the learning rate is too high?', ['Loss falls smoothly', 'Loss jumps or explodes', 'The dataset gets larger', 'Features become labels'], 1, 'Oversized steps can leap across the valley repeatedly or shoot away from it.'),
      lesson('feature-engineering', 'Give the model better clues', 'Transform raw inputs into signals a simple model can use.', 10, 'features', 'Understand features as the representation a model sees.', 'Models do not see meaning directly. They see numbers. Good features expose relevant structure and suppress distractions.', 'Toggle candidate features. Build a small set that improves validation score without adding noise.', ['Features express the problem to the model.', 'Domain knowledge can beat brute force.', 'Calculate features using information available at prediction time.'], 'Which is a dangerous feature for predicting loan default at approval time?', ['Requested amount', 'Applicant income', 'A collections flag recorded six months later', 'Length of credit history'], 2, 'A future collections flag would not exist when the decision is made, so it leaks future information.'),
      lesson('regularization', 'Prefer the simpler story', 'Balance fit and complexity with regularization.', 10, 'regularize', 'See regularization as a tax on unnecessary complexity.', 'Regularization adds a cost for large or numerous weights. The model keeps complexity only when it improves the fit enough.', 'Adjust regularization strength and find the validation sweet spot.', ['Regularization reduces overfitting.', 'Too much causes underfitting.', 'The best value is chosen on validation data.'], 'What happens with extremely strong regularization?', ['The model may underfit', 'The model always becomes perfect', 'Training labels disappear', 'Test data becomes training data'], 0, 'A model constrained too strongly cannot capture real patterns and underfits.'),
    ],
  },
  {
    number: '04', title: 'Know when to trust it', shortTitle: 'Evaluation', accent: '#8a4fff',
    description: 'Measure what matters, detect fragile scores, and catch common evaluation traps.',
    lessons: [
      lesson('confusion-matrix', 'See every kind of error', 'Turn predictions into true positives, false positives, true negatives, and false negatives.', 10, 'confusion', 'Replace one accuracy number with a map of outcomes.', 'A confusion matrix counts correct and incorrect decisions by class. It reveals which kind of mistake the model makes.', 'Move the threshold and inspect how all four cells change.', ['Accuracy can hide costly errors.', 'False positives and false negatives differ.', 'Thresholds move counts between cells.'], 'A sick patient predicted healthy is what?', ['True positive', 'False positive', 'True negative', 'False negative'], 3, 'The actual class is positive but the model predicted negative: a false negative.'),
      lesson('precision-and-recall', 'Choose your tradeoff', 'Tune precision and recall for the real cost of mistakes.', 11, 'tradeoff', 'Match the metric to the decision being made.', 'Precision asks whether positive alerts are trustworthy. Recall asks how many real positives were found.', 'Move the threshold and decide what you would choose for spam versus cancer screening.', ['Precision controls alert quality.', 'Recall controls coverage of positives.', 'F1 balances them when costs are similar.'], 'For early disease screening, which metric is often prioritized?', ['Recall', 'File size', 'Training speed', 'Number of features'], 0, 'Screening often prioritizes finding as many real cases as possible, even with more false alarms.'),
      lesson('cross-validation', 'Test it more than once', 'Rotate validation folds to estimate stability.', 10, 'crossval', 'Measure performance across multiple plausible splits.', 'Cross-validation trains several times, each time holding out a different fold. The spread of scores matters alongside the mean.', 'Change the number of folds and inspect the score distribution.', ['Cross-validation uses data efficiently.', 'Variation reveals instability.', 'Grouped or time-based data needs special splits.'], 'What does a wide spread across validation folds suggest?', ['The model is perfectly stable', 'Results depend strongly on the split', 'The labels are encrypted', 'The loss is always zero'], 1, 'Large fold-to-fold variation means the result is sensitive to which examples were held out.'),
      lesson('leakage-and-imbalance', 'Catch the silent failures', 'Expose leaked information and misleading class imbalance.', 12, 'leakage', 'Recognize evaluation results that are too good to trust.', 'Leakage lets the model use information unavailable in the real prediction moment. Imbalance lets accuracy hide failure on rare cases.', 'Toggle a leaked feature and rebalance the view. Watch the impressive score lose its meaning.', ['Build features as of prediction time.', 'Inspect per-class metrics.', 'Mirror deployment conditions in evaluation.'], 'A fraud model has 99.8% accuracy but catches no fraud. Why?', ['Fraud is rare and accuracy is misleading', 'The model is too fast', 'The test set is too large', 'Precision must be 100%'], 0, 'When positives are rare, predicting “not fraud” every time can look accurate while being useless.'),
    ],
  },
  {
    number: '05', title: 'Find structure without answers', shortTitle: 'Unsupervised ML', accent: '#d99200',
    description: 'Discover groups, useful dimensions, odd cases, and taste patterns without labeled targets.',
    lessons: [
      lesson('clustering', 'Find the hidden groups', 'Assign nearby examples to shared centers with k-means.', 10, 'cluster', 'Understand clustering as a useful proposal, not ground truth.', 'K-means alternates between assigning points to the nearest center and moving centers to the assigned average.', 'Change k and watch when one natural group is split or two groups are forced together.', ['Clusters depend on distance and scaling.', 'Choosing k changes the story.', 'A cluster is not automatically a real-world category.'], 'What does k control in k-means?', ['The number of clusters', 'The number of labels', 'The test-set size', 'The learning rate only'], 0, 'k is the number of cluster centers the algorithm will fit.'),
      lesson('dimensionality-reduction', 'Flatten without losing the story', 'Project many features into a smaller view.', 11, 'projection', 'See dimensionality reduction as a compressed perspective.', 'A projection chooses directions that preserve useful variation. It helps visualization, denoising, and downstream modeling.', 'Rotate the projection axis and find the view that separates the clouds best.', ['A projection is a view, not the whole truth.', 'PCA preserves variance, not labels.', 'Scale features before comparing variance.'], 'What does PCA primarily try to preserve?', ['Class names', 'Directions of high variance', 'Only the smallest values', 'The original column names'], 1, 'PCA finds directions that capture as much variation in the data as possible.'),
      lesson('anomaly-detection', 'Notice the unusual', 'Flag rare patterns without requiring a label for every failure.', 9, 'anomaly', 'Define anomalies relative to normal behavior and context.', 'Anomaly detectors learn a region of normality. Points far outside it receive higher anomaly scores.', 'Tune sensitivity. Catch subtle anomalies without flooding the alert queue.', ['Rare does not always mean harmful.', 'Thresholds control alert volume.', 'Feedback from reviewers improves the system.'], 'Raising anomaly sensitivity usually causes what?', ['More alerts, including more false alarms', 'Fewer alerts of every kind', 'Perfect labels', 'No change'], 0, 'A more sensitive detector flags weaker deviations, increasing both catches and false alarms.'),
      lesson('recommender-systems', 'Learn a taste space', 'Match people and items through shared preference patterns.', 11, 'recommend', 'Think of recommendation as estimating missing preferences.', 'Collaborative filtering places users and items in a shared latent space. Nearby items fit a user’s learned direction of taste.', 'Adjust the user taste profile and watch recommendations reorder.', ['Behavior can reveal latent preferences.', 'Popularity is a strong baseline.', 'Recommendations need diversity and exploration.'], 'What is the cold-start problem?', ['A new user or item has little interaction history', 'The server temperature is low', 'Every item is popular', 'The model has too many labels'], 0, 'New users and items lack the behavior signals collaborative methods normally rely on.'),
    ],
  },
  {
    number: '06', title: 'Build deep systems that last', shortTitle: 'Deep ML & MLOps', accent: '#d52d6f',
    description: 'Connect neural networks to vision and language, then ship models that stay useful.',
    lessons: [
      lesson('neural-networks', 'Compose tiny learners', 'Build a network from layers, activations, and learned weights.', 12, 'network', 'See deep learning as stacked feature transformation.', 'Each layer transforms a representation. Nonlinear activations let many simple units combine into flexible functions.', 'Add layers and units. Watch capacity and parameter count grow.', ['Layers learn representations.', 'Activations create nonlinearity.', 'More capacity needs more data and care.'], 'Why are nonlinear activations important?', ['Without them, stacked layers collapse to one linear transformation', 'They label the data automatically', 'They remove every parameter', 'They guarantee fairness'], 0, 'Multiple linear layers with no nonlinear activation are still equivalent to a single linear transformation.'),
      lesson('computer-vision', 'Learn visual features', 'Slide filters across pixels to detect reusable patterns.', 11, 'vision', 'Connect convolution to local pattern detection.', 'A convolutional filter scans the image for a small pattern such as an edge. Later layers combine edges into shapes and objects.', 'Switch filters and inspect which pixels activate.', ['Convolutions reuse a local detector.', 'Early layers often detect simple patterns.', 'Augmentation teaches useful invariances.'], 'What is weight sharing in a convolution?', ['The same filter is applied across image locations', 'All labels are identical', 'Every pixel gets a unique model', 'Training and test data are merged'], 0, 'A convolution reuses the same learned filter across the image, making it efficient and translation-aware.'),
      lesson('language-and-attention', 'Route attention through language', 'See how tokens weigh one another to build context.', 13, 'attention', 'Understand attention as learned information routing.', 'Attention lets each token gather a weighted mixture of other token representations. The weights depend on the current context.', 'Select a word and inspect which earlier words it attends to.', ['Text becomes tokens and vectors.', 'Attention is contextual, not a fixed dictionary.', 'Transformers stack attention with learned transformations.'], 'What does an attention weight represent?', ['How strongly one token uses information from another', 'The number of labels in the dataset', 'The file size of the model', 'A guaranteed explanation of human reasoning'], 0, 'Attention weights control how token information is mixed, though they are not automatically a complete explanation.'),
      lesson('deploy-and-monitor', 'Keep the model honest', 'Ship, observe drift, and decide when to retrain.', 12, 'monitor', 'Treat deployment as the start of the feedback loop.', 'Production data changes. Monitoring compares live inputs and outcomes with training expectations so teams can respond before value collapses.', 'Increase data drift and choose a retraining trigger that balances delay and false alarms.', ['Log inputs, predictions, outcomes, and versions safely.', 'Watch data quality and task metrics.', 'Define owners and rollback paths before launch.'], 'What is data drift?', ['The live input distribution changes from training data', 'The model file moves folders', 'The learning rate reaches zero', 'A dashboard changes color'], 0, 'Data drift means the examples arriving in production no longer resemble the distribution used to train the model.'),
    ],
  },
]

export const LESSONS = STAGES.flatMap(stage => stage.lessons)
export const TOTAL_MINUTES = LESSONS.reduce((sum, item) => sum + item.minutes, 0)

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find(item => item.slug === slug)
}

export function getStageForLesson(slug: string): Stage | undefined {
  return STAGES.find(stage => stage.lessons.some(item => item.slug === slug))
}
