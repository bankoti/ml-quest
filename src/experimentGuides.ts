export interface ExperimentGuideContent {
  problem: string
  prediction: {
    question: string
    options: [string, string, string]
    correct: number
    explanation: string
  }
  steps: [string, string, string]
  reflection: string
  transfer: { question: string; reasoning: string }
}

// Predictions refer to the actual, deterministic teaching experiments in
// Lab.tsx / computedModels.ts. They are not performance claims about new data.
export const EXPERIMENT_GUIDES: Record<string, ExperimentGuideContent> = {
  'machines-that-learn': {
    problem: 'A recycling station sorts items into two bins using one measured feature. Before trusting its rule, you need to understand which items it sends to each bin.',
    prediction: {
      question: 'At the far-left boundary (0), which class will this rule predict for the displayed items?',
      options: ['A different class for every item', 'Class 1 for every item', 'Class 0 for every item'],
      correct: 1,
      explanation: 'The rule predicts class 1 when the feature is at or above the boundary. Every displayed feature is above 0, so every prediction becomes class 1. Moving a rule changes predictions, not the examples’ true labels.',
    },
    steps: ['Set the decision boundary to its left endpoint. Count the diamonds: these are wrong predictions, not missing data.', 'Move to the right endpoint. Compare the correct count with the left endpoint.', 'Find a boundary between the two groups that removes the diamonds. Notice that you chose it by looking at these examples.'],
    reflection: 'Which items switched prediction as the boundary passed them? Why is a perfect score on these visible examples not proof about tomorrow’s items?',
    transfer: { question: 'What would you collect before using this sorting rule on a new factory’s items?', reasoning: 'Collect representative, labeled items from the new factory and evaluate the frozen rule on them. A different feature range or class pattern can break a boundary that worked here.' },
  },
  'data-is-the-curriculum': {
    problem: 'A support team has labeled past requests as urgent or ordinary. Some labels are wrong, and you want to see what the learner is being taught.',
    prediction: {
      question: 'Moving data quality all the way to “clean” changes which part of this experiment?',
      options: ['It removes flipped training labels and refits the rule; the clean holdout stays unchanged', 'It edits the holdout labels until every prediction is right', 'It adds more training examples'],
      correct: 0,
      explanation: 'The control changes how many of the same 24 training labels are flipped, then fits a threshold stump. The 20 clean holdout examples stay fixed. Cleaner labels can help, but individual holdout scores need not improve at every slider increment.',
    },
    steps: ['Set data quality to “noisy.” Inspect the crosses and write down the train and clean-holdout accuracies.', 'Move through the middle to “clean.” Compare the flipped-label count and fitted boundary at each stop.', 'Return to the noisy endpoint. Check that the holdout examples have not moved or changed their true labels.'],
    reflection: 'When the boundary moved, was it learning a better task rule or accommodating a corrupted label? Use one pair of readouts as evidence.',
    transfer: { question: 'Your real dataset doubles in size but comes from a less reliable labeling process. Is that automatically an upgrade?', reasoning: 'No. Audit label quality and coverage, then compare models using the same trustworthy holdout. This experiment isolates label noise; real datasets can also lose coverage or change populations.' },
  },
  'train-test-split': {
    problem: 'You have only 24 historical demand measurements. You need enough data to fit a line and enough unseen examples to judge it honestly.',
    prediction: {
      question: 'Moving training share from its minimum to maximum will do what in this lab?',
      options: ['Guarantee a smaller test error', 'Train on all 24 examples, leaving no test set', 'Increase training rows from 4 to 20 and reduce test rows from 20 to 4'],
      correct: 2,
      explanation: 'The fixed shuffled order is split into 4–20 training rows and the remaining test rows. The line is refitted using only training rows. Both the fitted model and test composition change, so test error is not guaranteed to fall as training share grows.',
    },
    steps: ['Set training share to minimum. Record the train/test counts and both errors; identify blue circles and orange squares.', 'Move to maximum. Compare the fitted line and count how little evidence now supports the test score.', 'Try an intermediate split. Ask which observations changed roles, not just which setting has the nicest score.'],
    reflection: 'Why can a lower test MSE with only four test examples be less convincing than it first appears?',
    transfer: { question: 'For demand forecasting, should you randomly mix next month’s observations into training?', reasoning: 'No. Evaluate on later time periods to match the real forecasting task. The random split in this toy lab illustrates separation, not a universal splitting recipe. Use validation for choices and reserve a final test.' },
  },
  'beat-the-baseline': {
    problem: 'A fraud dashboard celebrates high accuracy. Fraud is rare, so you first compare its model with the rule “never raise an alert.”',
    prediction: {
      question: 'At the “rare” endpoint, what can the majority-class baseline achieve on this holdout?',
      options: ['95% accuracy with 0% positive recall', '95% recall because its accuracy is high', 'Zero accuracy because it never predicts fraud'],
      correct: 0,
      explanation: 'Only 2 of the 40 holdout examples are positive at this endpoint. Predicting negative for all 40 gets 38 right (95% accuracy), but catches none of the two positives (0% recall). The fitted stump offers a separate comparison.',
    },
    steps: ['Set positive class share to “rare.” Compare majority accuracy with majority recall.', 'Compare the stump with that baseline on both metrics. Check the number of test positives.', 'Increase the positive share. Watch baseline accuracy change even though majority recall stays at zero in this toy range.'],
    reflection: 'Which of the four bars would prevent you from celebrating a useless fraud detector? Explain with the rare-endpoint counts.',
    transfer: { question: 'What simple baseline would you use for predicting a numeric delivery time instead of fraud?', reasoning: 'Start with a training-set median or mean, evaluated using the same held-out cases and relevant error metric. A baseline must match the task; majority-class accuracy is not a regression baseline.' },
  },
  'linear-regression': {
    problem: 'A small shop predicts daily demand from a numeric signal. You can change how strongly the prediction responds to the signal while keeping its starting level fixed.',
    prediction: {
      question: 'When you move the slope control, which prediction must remain unchanged?',
      options: ['Every prediction', 'The prediction at x = 0 remains 2', 'The prediction at the largest x remains 2'],
      correct: 1,
      explanation: 'The line is ŷ = slope × x + 2. Its intercept is fixed at 2, so changing slope has no effect at x = 0 and a larger effect farther from zero. You are choosing the slope manually here, not running a slope-fitting optimizer.',
    },
    steps: ['Set line slope to “flat.” Inspect the residual dashes, especially at the right side of the plot.', 'Move slowly toward “steep.” Find a slope where the residuals collectively shrink and MSE is low.', 'Move past that setting. Identify points that are now overpredicted rather than underpredicted.'],
    reflection: 'Why does rotating the line help some points while hurting others? Explain why the best line need not pass through every observation.',
    transfer: { question: 'What would you need to change if predicted demand at x = 0 were consistently too high?', reasoning: 'Allow the intercept to change, inspect the data, and refit on training examples. The current control cannot correct an independently wrong starting level. Confirm any improvement on held-out observations.' },
  },
  'logistic-classification': {
    problem: 'A review queue receives probability scores from a model. The team wants fewer alerts without retraining that model.',
    prediction: {
      question: 'Raising the decision threshold from 0.15 to 0.85 will do what here?',
      options: ['Refit the sigmoid to new labels', 'Increase every example’s predicted probability', 'Reduce positive decisions while leaving the sigmoid unchanged'],
      correct: 2,
      explanation: 'The sigmoid and example scores are fixed. The slider changes only the probability needed for a positive decision. A higher threshold cannot create new positive predictions among these fixed examples. This is policy adjustment, not model training.',
    },
    steps: ['Set the threshold to “more positives.” Record the positive-prediction count and look at the curve.', 'Move to “fewer positives.” Compare the count, horizontal threshold, and corresponding boundary score.', 'Move back toward the middle. Notice that examples switch decision when the threshold crosses their probability; the curve does not bend.'],
    reflection: 'Which changed: probabilities, decisions, or both? What information is missing if you want to judge whether fewer alerts is better?',
    transfer: { question: 'Could two teams use the same fitted model but choose different thresholds?', reasoning: 'Yes. Different false-alarm costs, missed-case costs, and review capacity can justify different decision policies. Choose policies with representative validation data and outcome labels, not alert count alone.' },
  },
  'knn-classification': {
    problem: 'You classify a new item using nearby labeled examples. You must decide whether to trust one close neighbor or a larger local vote.',
    prediction: {
      question: 'Going from k = 1 to k = 7 must do what to the dashed distance ring around this fixed query?',
      options: ['Expand it to include the seventh-nearest example', 'Move the query to the center of the dataset', 'Remove the original nearest example from the vote'],
      correct: 0,
      explanation: 'Examples are ranked by Euclidean distance from a fixed query. Increasing k includes the earlier neighbors plus more distant ones, and the ring reaches the kth neighbor. A larger neighborhood can change the majority; it does not guarantee a better prediction.',
    },
    steps: ['Set k to 1. Locate the single numbered neighbor and record its class.', 'Try k = 3, 5, and 7. Compare the ring, blue/green vote counts, and query prediction.', 'Identify a setting where adding neighbors changes the balance of votes. Keep track of which points stayed in the neighborhood.'],
    reflection: 'Did the prediction change every time k changed? Why can the neighborhood change without changing the winning class?',
    transfer: { question: 'What goes wrong if one distance feature is annual income in dollars and the other is age in years?', reasoning: 'Income’s numerical scale can dominate Euclidean distance. Fit an appropriate scaling transformation on training data, apply it consistently, and choose k using validation. “Near” depends on representation.' },
  },
  'support-vector-machines': {
    problem: 'Two item classes overlap on one numeric measurement. You want to see how strongly penalizing margin violations changes a soft-margin classifier.',
    prediction: {
      question: 'In this symmetric one-feature example, moving C from tolerant to strict will do what?',
      options: ['Make vertical display position a second input feature', 'Narrow the fitted margin while the boundary remains at zero', 'Guarantee that every example becomes correctly classified'],
      correct: 1,
      explanation: 'Higher C penalizes hinge-loss violations more strongly, producing a narrower margin here. Symmetric labeled pairs keep the boundary at x = 0. The two examples on the wrong side remain; vertical spacing is only for display, not a second feature.',
    },
    steps: ['Set C to 0.05. Record half-margin width and the number of violations.', 'Set C to 5.00. Compare the margin lines, support-vector rings, and violation count.', 'Find the two examples on the wrong side of the zero boundary. Check that raising C did not remove their classification errors.'],
    reflection: 'Why can changing the margin change the objective without moving the decision boundary in this particular dataset?',
    transfer: { question: 'Would increasing C always improve a real classifier’s accuracy on new data?', reasoning: 'No. C trades stronger penalties on training violations against regularization. Select it with validation data. This symmetric one-feature demo is intentionally narrower than a general multi-feature or kernel SVM.' },
  },
  'decision-trees': {
    problem: 'A sorting decision depends on a combination of two signals: one high and one low, rather than either signal alone. A single yes/no question may not be enough.',
    prediction: {
      question: 'What extra capability does raising maximum depth from 1 to 4 give this tree?',
      options: ['It replaces the data with labels from a neural network', 'It forces every branch to have exactly four splits', 'It permits sequences of feature questions that form more decision regions'],
      correct: 2,
      explanation: 'A depth limit bounds how many splits may occur along a path; it does not require a full tree. Extra depth lets this CART learner combine axis-aligned questions to capture XOR structure. More capacity does not generally guarantee better holdout accuracy.',
    },
    steps: ['Set tree depth to “simple.” Inspect its regions, actual leaves, and holdout accuracy.', 'Increase the depth and open “Inspect the fitted splits.” Trace one sequence of x1 and x2 questions to a leaf.', 'Compare a held-out square with the surrounding predicted region. Distinguish the allowed depth from the actual leaf count.'],
    reflection: 'What can a second question distinguish that the first question alone cannot? Use one region of the XOR pattern.',
    transfer: { question: 'If deeper trees keep improving training accuracy on noisy real data, when should you stop adding depth?', reasoning: 'Compare validation performance and complexity, and use constraints such as maximum depth or minimum leaf size. Memorizing training noise can improve training accuracy while harming new predictions.' },
  },
  'ensemble-power': {
    problem: 'Several trees see different bootstrap samples of the same sorting task. You want a combined decision that is less dependent on one tree.',
    prediction: {
      question: 'When you add trees in this forest experiment, what happens to the trees already displayed?',
      options: ['Their existing fits stay the same; new fitted votes join the ensemble', 'They are replaced by one deeper tree', 'They are retrained to agree with the newest tree'],
      correct: 0,
      explanation: 'The forest uses fixed, seeded bootstrap fits with random feature choices. Increasing the tree count preserves earlier trees and adds their peers’ votes. Agreement at the starred query is not the same quantity as accuracy on the held-out examples.',
    },
    steps: ['Start with one tree. Record its query vote and holdout accuracy.', 'Add trees one setting at a time. Inspect individual votes and the number of unique bootstrap rows for each.', 'At seven trees, compare query agreement with holdout accuracy. Check whether adding a tree always improved either quantity.'],
    reflection: 'Why is a unanimous vote on one query not proof that an ensemble is correct? Distinguish diversity from randomness without evidence.',
    transfer: { question: 'Would copying the same fitted tree seven times provide the usual benefit of a random forest?', reasoning: 'No. Identical trees make identical errors, so voting cannot cancel their differences. Bootstrap samples and feature subsampling encourage diversity; validation still determines whether the ensemble is useful.' },
  },
  'gradient-boosting': {
    problem: 'A demand predictor misses a step-shaped pattern. Instead of fitting many independent trees, you add small corrections to what it still gets wrong.',
    prediction: {
      question: 'Across the five fitted boosting rounds in this fixed experiment, which statement is supported?',
      options: ['Lower training MSE proves lower error on future demand', 'Training MSE falls as the stumps correct residuals; no test score is shown', 'Each stump ignores the current ensemble’s predictions'],
      correct: 1,
      explanation: 'Each stump is fitted to current residuals and contributes half its prediction. Training MSE decreases across these five computed rounds. The plot contains training examples only, so it gives no direct evidence about held-out performance.',
    },
    steps: ['Start at the first correction. Inspect the step-shaped prediction and residual dashes.', 'Add rounds and compare the training-MSE history. Find a region the next correction moves closer to the observed targets.', 'Return to the first round, then the full ensemble. Notice that the learners are sequential corrections, not independent final votes.'],
    reflection: 'What would be misleading about labeling this falling error history “generalization improvement”?',
    transfer: { question: 'How would you choose the number of boosting rounds for a real demand model?', reasoning: 'Track performance on a validation set or appropriate time-based folds, tune the learning rate and capacity, and consider early stopping. Evaluate the chosen model once on the untouched final test.' },
  },
  'loss-functions': {
    problem: 'Most delivery-time errors are small, but one delivery is extremely late. You want to see how that single miss changes two summaries of error.',
    prediction: {
      question: 'If the magnitude of one residual doubles, how does that example’s contribution change?',
      options: ['Absolute error stays fixed; squared error doubles', 'Both contributions always double', 'Absolute error doubles; squared error becomes four times as large'],
      correct: 2,
      explanation: 'An error of magnitude e contributes |e| to absolute error and e² to squared error. Doubling its magnitude gives 2|e| and 4e². The lab keeps the prediction line fixed while moving one target, so it isolates sensitivity rather than refitting a model.',
    },
    steps: ['Set outlier size to “typical.” Record mean absolute error and mean squared error.', 'Increase the outlier toward “extreme.” Watch the orange target and its residual while checking that the line stays fixed.', 'Compare how quickly the two displayed errors grow. Remember that their units differ: target units versus squared target units.'],
    reflection: 'Which summary emphasizes this large miss more strongly, and why should the two raw numbers not be compared as if they had identical units?',
    transfer: { question: 'Should you delete an extreme example just because it makes MSE large?', reasoning: 'First determine whether it is a recording error or a genuine case the system must handle. Choose the loss and metric based on the task’s costs; removing valid difficult cases can hide risk.' },
  },
  'gradient-descent': {
    problem: 'You are tuning one model weight by following the slope of its loss. You want to know when a larger training step helps and when it overshoots.',
    prediction: {
      question: 'At the maximum learning rate (α = 1.32), what will the first step from w = −3 do on L(w) = w²?',
      options: ['Cross zero and move farther from it, increasing loss', 'Land exactly at zero', 'Move only a tiny distance toward zero'],
      correct: 0,
      explanation: 'The update is w ← (1 − 2α)w. At α = 1.32 the multiplier is −1.64, so −3 becomes 4.92: the sign flips and magnitude grows. In this specific quadratic, 0 < α < 1 converges; this numeric threshold is not universal for other losses.',
    },
    steps: ['Choose a low learning rate and take several training steps. Record whether loss decreases.', 'Set the maximum rate; changing the rate restarts at w = −3. Take one step and compare its weight and loss with the starting values.', 'Take another step, then try a moderate rate. Notice the difference between convergent oscillation and growing oscillation.'],
    reflection: 'Why is crossing the minimum not by itself a failure? Compare the magnitude of the weight before and after a step.',
    transfer: { question: 'If a neural network’s training loss explodes, is increasing the learning rate a sensible first response?', reasoning: 'Usually investigate the optimization settings, gradients, data, and numerics; a smaller learning rate is one possible remedy. The toy quadratic explains overshooting, but real objectives need their own diagnostics.' },
  },
  'feature-engineering': {
    problem: 'Energy demand rises at both low and high temperatures. A straight line in temperature alone cannot describe that U-shaped relationship well.',
    prediction: {
      question: 'Which available feature change lets the linear fitting method represent a U-shaped curve in x?',
      options: ['Keep only x and ask the optimizer to draw a curve anyway', 'Add x² alongside x', 'Rename the target column'],
      correct: 1,
      explanation: 'The fitting method stays linear in its learned coefficients, but a coefficient on x² makes the prediction quadratic in the original input. The lab compares x, x + x², and an additional sin(13x) feature on the same train/validation split. More features are not automatically better.',
    },
    steps: ['Set feature set to “minimal” (x). Compare the fitted line with the curved data pattern.', 'Move to the middle set, x + x². Inspect the curve and validation MSE.', 'Move to “everything,” which also includes sin(13x). Compare training and validation errors rather than assuming the extra feature helps.'],
    reflection: 'What changed: the fitting algorithm, its input representation, or both? Explain why a linear model can produce this curved plot.',
    transfer: { question: 'When might a very predictive engineered feature still be unusable?', reasoning: 'If it depends on information recorded after the prediction must be made, it leaks the outcome. Validate both when a feature becomes available and whether it helps on unseen data.' },
  },
  'regularization': {
    problem: 'A flexible polynomial can respond to small fluctuations in demand data. You introduce a penalty to discourage unnecessarily large coefficients.',
    prediction: {
      question: 'Increasing λ from its minimum to maximum in this ridge experiment does what to the fitted non-intercept weights?',
      options: ['Forces each weight to become exactly zero immediately', 'Deletes training rows with large errors', 'Shrinks their combined norm without guaranteeing the best validation error'],
      correct: 2,
      explanation: 'Ridge adds λ times the sum of squared non-intercept weights to the fitting objective. Stronger regularization shrinks their norm here; it does not perform exact feature deletion. The intercept is unpenalized, and a heavily constrained fit can underfit.',
    },
    steps: ['Set regularization to “flexible.” Inspect the curve, weight norm, and train/validation MSE.', 'Move toward “constrained.” Compare weight norm and the fitted curve at several values of λ.', 'Open the coefficients and compare a middle setting with the maximum. Look for a useful validation tradeoff rather than only the smallest weight norm.'],
    reflection: 'Why can smaller weights be useful without “the smallest possible weights” being the best objective for prediction?',
    transfer: { question: 'How would different units across features affect an L2 weight penalty?', reasoning: 'Coefficient size depends on feature scale. Fit a suitable scaling transformation using only training data, apply it consistently, and select regularization strength with validation.' },
  },
  'confusion-matrix': {
    problem: 'An alert system makes two different mistakes: missing a true event and raising an alarm for a non-event. You need to count them separately.',
    prediction: {
      question: 'At threshold 1, all 12 displayed scores are below threshold. What happens to false negatives and false positives?',
      options: ['False negatives become 6; false positives become 0', 'Both become 0 because the model is cautious', 'False negatives become 0; false positives become 6'],
      correct: 0,
      explanation: 'Every example is predicted negative at this endpoint. All six actual positives become false negatives, while all six actual negatives become true negatives. Removing all alerts removes false positives but does not remove mistakes.',
    },
    steps: ['Set threshold to 0. Read the table by actual class first, then predicted class.', 'Set threshold to 1. Track where the six actual-positive examples moved.', 'Try a middle threshold and open the scores and labels. Pick one example and work out which table cell it contributes to.'],
    reflection: 'Why does the actual-positive row always total six even as its two cells change? What does a false negative mean for your chosen application?',
    transfer: { question: 'Two systems have the same accuracy but different confusion matrices. Are they interchangeable?', reasoning: 'Not necessarily. Their mistakes may have different consequences. Compare false positives, false negatives, review capacity, and relevant slices, using costs appropriate to the decision.' },
  },
  'precision-and-recall': {
    problem: 'A support team can investigate only a limited number of alerts. It must balance alert quality with how many true incidents it finds.',
    prediction: {
      question: 'If you raise the threshold to 1 and produce no alerts, what should this lab report?',
      options: ['100% precision and 100% recall', 'Undefined precision (“no alerts”) and 0% recall', '0% precision and 100% recall'],
      correct: 1,
      explanation: 'Precision is TP / (TP + FP), which has a zero denominator when no alerts exist. It is undefined, not perfect. Recall is TP / (TP + FN); all six actual positives are missed, so recall is zero. Precision can fluctuate as a threshold increases.',
    },
    steps: ['Set threshold to 0 and record precision, recall, and the number of alerts (TP + FP).', 'Raise the threshold in small steps. Watch actual positives and negatives leave the alert set at different scores.', 'Set threshold to 1. Confirm the empty-alert case, then choose a nonempty setting you could defend for a limited review queue.'],
    reflection: 'Which quantity could you improve by simply sending fewer alerts, and what evidence prevents you from mistaking silence for success?',
    transfer: { question: 'If missed incidents become much more costly, what else should you examine besides a single F1 score?', reasoning: 'Inspect recall, false-negative counts, decision costs, and alert capacity across thresholds and important slices. Choose using validation outcomes; one balanced summary cannot encode every real-world tradeoff.' },
  },
  'cross-validation': {
    problem: 'One train/validation split gave a promising score. You want to find out how sensitive the result is to which examples were held out.',
    prediction: {
      question: 'Changing from two to six folds changes which part of this experiment?',
      options: ['Every example is used to train the model that predicts its own validation output', 'The pooled error is guaranteed to decrease', 'Six separate models are fitted, and each example is still held out once'],
      correct: 2,
      explanation: 'For each fold, the model is fitted on all other folds and predicts only that fold’s examples. Each of the 24 rows receives one out-of-fold prediction. Changing k changes fit sizes and split composition; it does not guarantee a lower pooled error.',
    },
    steps: ['Set validation folds to “few.” Inspect the row-assignment strip and both fold scores.', 'Increase the number of folds. Compare fold sizes, score spread, and pooled out-of-fold MSE.', 'Pick a row number in the strip. Explain why the model that evaluates that row must not have trained on it.'],
    reflection: 'Why can a reasonable pooled score conceal one difficult fold? Why should you not select k simply because it produces the lowest visible error?',
    transfer: { question: 'What if multiple rows belong to the same customer or neighboring time periods?', reasoning: 'Use grouped or time-aware evaluation that prevents related or future information from crossing the split. Ordinary row-wise folds can give overly optimistic results when observations are dependent.' },
  },
  'leakage-and-imbalance': {
    problem: 'A fraud model looks perfect in a historical report, but one feature is recorded only after fraud has been confirmed. You need to reproduce the actual prediction moment.',
    prediction: {
      question: 'With the leaked future feature included, what happens when live inference must replace that unavailable field with 0?',
      options: ['Retrospective accuracy is perfect, but live positive recall falls to zero', 'The future outcome remains available because training used it', 'The perfect retrospective score guarantees perfect live results'],
      correct: 0,
      explanation: 'The leaked feature is the label itself. It makes retrospective predictions perfect, but the live fallback is zero, so the learned rule predicts every case negative. With 2 positives in 20 live examples, accuracy is still 90% while recall is 0%.',
    },
    steps: ['Set suspicious signal to “off.” Compare retrospective and live scores.', 'Set it to “leaked.” Inspect the timeline, retrospective accuracy, live accuracy, and live false negatives.', 'Explain the 90% live accuracy using the counts of actual positives and negatives. Do not treat it as a recovery from leakage.'],
    reflection: 'Which assumption about feature availability caused the impressive offline result to fail in live use?',
    transfer: { question: 'What check would you add before accepting a surprisingly predictive new feature?', reasoning: 'Document exactly when and how the feature is generated. Reconstruct it as of prediction time, exclude future outcomes, and audit preprocessing and splits for indirect leakage as well.' },
  },
  'clustering': {
    problem: 'A delivery team wants to propose geographic service groups from unlabeled locations. It must inspect the grouping process rather than treating a cluster name as truth.',
    prediction: {
      question: 'For a fixed k, what should “Update centers & reassign” do to the displayed k-means inertia?',
      options: ['Increase it on every step so the groups separate', 'Decrease it or leave it unchanged', 'Set it to zero regardless of the locations'],
      correct: 1,
      explanation: 'Inertia is the sum of squared distances to assigned centers. Replacing a center with its members’ mean and assigning points to their closest centers cannot increase that objective. Convergence means this procedure has stopped improving, not that the groups are meaningful business categories.',
    },
    steps: ['Choose a k and record the starting inertia. Click “Update centers & reassign” until the experiment converges.', 'Restart the same k and follow one point’s connection as its center moves.', 'Change k and repeat. Compare the number of groups and their geometry; do not compare only the smallest inertia.'],
    reflection: 'Why is “five clusters have smaller distances” not enough evidence to choose five service territories?',
    transfer: { question: 'What constraints might matter for service territories besides straight-line distance?', reasoning: 'Travel routes, capacity, boundaries, accessibility, and demand may matter. Clustering proposes structure from a chosen representation and objective; operational usefulness needs separate evaluation.' },
  },
  'dimensionality-reduction': {
    problem: 'You need a one-dimensional summary of two correlated sensor readings. Rotating the summary direction changes what variation is retained and what is discarded.',
    prediction: {
      question: 'Compare projection angles 0° and 180°. What will happen to retained variance and reconstruction error?',
      options: ['Variance doubles at 180°', 'All information disappears at 180°', 'Both measures remain the same because these angles define the same line'],
      correct: 2,
      explanation: 'Reversing an axis reverses the sign of projected coordinates but not the reconstructed points or squared variation. PCA chooses the line retaining the most variance; it does not use class labels or guarantee preservation of the information a downstream task needs.',
    },
    steps: ['Compare the 0° and 180° endpoints and their readouts.', 'Try several intermediate angles. Watch the dashed reconstruction segments and variance retained.', 'Use “the fitted PCA direction.” Compare its reconstruction error with the other directions you tried.'],
    reflection: 'Why can a short reconstruction segment indicate good geometric compression without proving good classification?',
    transfer: { question: 'One sensor is measured in millimeters and another in kilometers. What should you consider before PCA?', reasoning: 'Variance depends on scale. Choose an appropriate scaling strategy using training data and domain knowledge. Otherwise the largest numeric units may dominate the projection for accidental reasons.' },
  },
  'anomaly-detection': {
    problem: 'A sensor monitor scores how far readings are from normal behavior. You want to catch unusual readings without overwhelming the reviewer.',
    prediction: {
      question: 'Moving sensitivity from “quiet” to “alert” changes the cutoff from 5 to 1 MAD units. What happens to the alert set?',
      options: ['It can only expand or stay the same because the fixed scores face a lower cutoff', 'It must shrink because the detector is stricter', 'The training median moves toward every unusual reading'],
      correct: 0,
      explanation: 'The normal-training median and median absolute deviation (MAD) stay fixed. Alerting uses score > cutoff, so lowering the cutoff cannot remove an existing alert. In this dataset, extra alerts include normal examples; more sensitivity is not automatically more useful.',
    },
    steps: ['Set sensitivity to “quiet.” Inspect the anomaly scores, cutoff, detected anomalies, and false alerts.', 'Increase sensitivity and identify which individual readings newly cross the cutoff.', 'At “alert,” compare the change in true catches with the change in false alerts.'],
    reflection: 'Why did some alerts increase without increasing the number of actual anomalies detected? Use the displayed labels to explain.',
    transfer: { question: 'Should every unusual transaction automatically be blocked?', reasoning: 'No. Unusual is not the same as harmful. Consider investigation costs, expected harm, context, and reviewer feedback, then validate a decision policy rather than treating the anomaly score as ground truth.' },
  },
  'recommender-systems': {
    problem: 'A viewer has rated Adventure and Comedy. The recommender estimates preferences for unseen genres using patterns from four historical users.',
    prediction: {
      question: 'When you change this viewer’s Adventure rating, which part of the experiment stays fixed?',
      options: ['All predicted ratings', 'Historical ratings and the item-to-item similarity matrix', 'The viewer’s Adventure rating'],
      correct: 1,
      explanation: 'The slider changes only the viewer’s Adventure rating; Comedy stays at 3. Item cosine similarities are computed from the same historical ratings. Unseen-genre scores are weighted combinations of the viewer’s two ratings, not fresh model training or guaranteed future enjoyment.',
    },
    steps: ['Set Adventure to 1/5 and record the ordering and predicted scores for Drama and Sci-fi.', 'Move Adventure to 5/5. Compare the ranking and score changes.', 'Open the ratings and similarities. Inspect which unseen genre has rating patterns more similar to Adventure.'],
    reflection: 'How can an unchanged similarity matrix produce a changed ranking? Separate the learned item relationships from the current user’s input.',
    transfer: { question: 'What would this method lack for a brand-new item with no historical ratings?', reasoning: 'It would lack the interaction pattern needed for these item similarities. Metadata-based recommendations, onboarding preferences, or exploration can help with cold start; evaluate relevance and diversity as well as predicted ratings.' },
  },
  'neural-networks': {
    problem: 'A target depends on whether two input signs differ: XOR. You train a small nonlinear network to learn a pattern a single straight boundary cannot separate.',
    prediction: {
      question: 'During the 500 training steps, which displayed quantities are actually updated by learning?',
      options: ['The four target labels, until they agree with the network', 'Only the animation colors; all model parameters stay fixed', 'Network weights and biases, which change probabilities and loss'],
      correct: 2,
      explanation: 'The lab performs actual backpropagation on four fixed XOR examples in a 2-input, 4-tanh-unit, 1-sigmoid-output network. Weights and biases change while examples and labels stay fixed. Training accuracy here is not evidence of broad real-world generalization.',
    },
    steps: ['Restart to the untrained network. Record cross-entropy and XOR accuracy; inspect the four probabilities.', 'Animate training, pausing to compare the heatmap, connection weights, and loss.', 'At 500 steps, inspect the loss trace and compare probabilities with their fixed labels. Look beyond whether they merely crossed 0.5.'],
    reflection: 'How can probabilities improve even when accuracy does not change? What has this four-example experiment not tested?',
    transfer: { question: 'Would success on XOR justify deploying this same tiny network as an image classifier?', reasoning: 'No. It illustrates nonlinear representation and optimization, not a complete deep-learning system. Image tasks need an appropriate representation or architecture, representative data, held-out evaluation, and operational safeguards.' },
  },
  'computer-vision': {
    problem: 'An image contains a vertical brightness edge, with identical rows. You want to understand how a reusable local filter responds to edge direction.',
    prediction: {
      question: 'What output should the Horizontal Sobel kernel produce for this image’s identical rows?',
      options: ['Zeros, because opposing contributions from identical rows cancel', 'The same nonzero response as Vertical Sobel', 'A learned class label for the whole image'],
      correct: 0,
      explanation: 'Horizontal Sobel compares values above and below. Every row of this input is identical, so its negative and positive row contributions cancel. Vertical Sobel responds to left-to-right change. These kernels are hand-specified, not trained CNN weights.',
    },
    steps: ['Choose Vertical Sobel at the left endpoint. Slide the window and inspect one output’s multiply-and-add calculation.', 'Choose Horizontal Sobel in the middle. Check all nine output cells against your prediction.', 'Choose Laplacian at the right endpoint. Compare responses and explain why changing a kernel changes what local pattern is emphasized.'],
    reflection: 'Which weights and pixels produced one output value? How does reusing the same kernel across windows differ from giving every location an independent model?',
    transfer: { question: 'What would be different in a trained convolutional neural network?', reasoning: 'Training learns many filter weights from data, and layers combine local responses with nonlinear transformations. This demo isolates the sliding multiply-and-add operation; it does not train a CNN or recognize objects.' },
  },
  'language-and-attention': {
    problem: 'A token in an autoregressive language model gathers context without looking at future tokens. You inspect a tiny attention calculation to see how that restriction works.',
    prediction: {
      question: 'When the first token, “The,” is the query, where can its attention weight go in this causal example?',
      options: ['Equally to all four tokens', 'Entirely to itself; future tokens receive zero', 'Only to the last token'],
      correct: 1,
      explanation: 'Causal masking excludes every future position before softmax. The first token has only itself available, so its weight is 1 and the other weights are 0. Later queries mix available value vectors using normalized weights; Q, K, and V are hand-specified in this toy example.',
    },
    steps: ['Set focus token to the first token. Check masked tokens, weights, their sum, and the context vector.', 'Select later query tokens. Watch which positions become available and how weights redistribute.', 'Open Q, K, V and scaled dot products. Relate one query’s scores to its weighted value-vector mixture.'],
    reflection: 'Why must masking happen before normalization? Why are these weights not automatically an explanation of human-like understanding?',
    transfer: { question: 'Would a model that reads a complete sentence for classification always need the same causal mask?', reasoning: 'Not necessarily. Bidirectional encoders may use context on both sides, while next-token prediction must avoid future-token leakage. The attention mask follows the task; attention alone is not a complete transformer.' },
  },
  'deploy-and-monitor': {
    problem: 'Live sensor inputs shift after deployment. You need to decide whether an alert signals broken predictions or simply a changed input distribution worth investigating.',
    prediction: {
      question: 'At maximum live-data shift in this lab, what happens to model error?',
      options: ['It must increase because the input distribution shifted', 'It becomes unmeasurable even though outcome labels are supplied', 'It stays the same, even though input drift triggers an investigation alert'],
      correct: 2,
      explanation: 'Live inputs shift, but both the true relationship and predictor still use 2x, with the same added noise pattern in the targets. Their residuals therefore stay unchanged. The KS statistic detects input-distribution change, not a guaranteed loss of predictive performance.',
    },
    steps: ['Set live-data drift to “stable.” Record KS statistic and labeled live MSE.', 'Increase the shift until the investigation alert appears. Compare reference and live histograms using the same bin edges.', 'Move to maximum shift. Compare the change in KS with the change in labeled error, and state what each measure tells you.'],
    reflection: 'Why would automatically retraining on every drift alert be an unjustified conclusion from this experiment?',
    transfer: { question: 'What if production outcome labels arrive weeks after predictions?', reasoning: 'Use input and data-quality signals as early investigation prompts, then assess labeled task performance when outcomes arrive. Define owners, impact thresholds, validation gates, and rollback plans; do not equate unlabeled drift with proven model failure.' },
  },
}
