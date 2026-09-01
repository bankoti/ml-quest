export interface CodeChallenge {
  title: string
  task: string
  starter: string
  tests: string
  hints: string[]
  functionName: string
}

export const CODE_CHALLENGES: Record<string, CodeChallenge> = {
  'machines-that-learn': {
    title: 'Program a decision boundary',
    task: 'Return 1 for every value at or above the threshold, and 0 for every value below it.',
    functionName: 'threshold_predict',
    starter: `def threshold_predict(values, threshold):
    """Turn numeric values into class predictions."""
    # TODO: return one prediction for every value
    return []`,
    tests: `assert threshold_predict([1, 4, 7, 9], 5) == [0, 0, 1, 1], "Values at or above 5 should be positive"
assert threshold_predict([0.2, 0.5, 0.8], 0.5) == [0, 1, 1], "Remember: the threshold itself counts as positive"
assert threshold_predict([], 3) == [], "An empty input should return an empty list"`,
    hints: ['Loop over each value and compare it with threshold.', 'A list comprehension can express the whole rule.', 'Use 1 if value >= threshold else 0.'],
  },
  'data-is-the-curriculum': {
    title: 'Clean incomplete examples',
    task: 'Remove any row containing a missing value (None), while preserving the order of valid rows.',
    functionName: 'clean_rows',
    starter: `def clean_rows(rows):
    """Keep only rows with no missing values."""
    # Each row is a list of feature values
    return rows`,
    tests: `rows = [[1, 2], [3, None], [4, 5], [None, 7]]
assert clean_rows(rows) == [[1, 2], [4, 5]], "Drop a row if any value is None"
assert clean_rows([]) == [], "Empty data should stay empty"
assert clean_rows([[0, False], ['', 2]]) == [[0, False], ['', 2]], "Zero, False, and empty strings are not None"`,
    hints: ['Keep a row only if every value is present.', 'Use all(...) with a generator over each row.', 'Check value is not None rather than truthiness.'],
  },
  'train-test-split': {
    title: 'Make an honest split',
    task: 'Split items in order, using the requested fraction for the test set. Return (train, test).',
    functionName: 'train_test_split',
    starter: `def train_test_split(items, test_fraction):
    """Return a deterministic (train, test) split."""
    # Keep the final items for testing
    return items, []`,
    tests: `train, test = train_test_split(list(range(10)), 0.2)
assert train == list(range(8)) and test == [8, 9], "20% of ten items means two test items"
train, test = train_test_split(['a', 'b', 'c', 'd'], 0.25)
assert train == ['a', 'b', 'c'] and test == ['d'], "Keep order and use the final items for testing"
assert train_test_split([], 0.2) == ([], []), "Handle empty input"`,
    hints: ['Compute test_size from len(items) * test_fraction.', 'The split point is len(items) - test_size.', 'Use int(...) for the test size, then slice once.'],
  },
  'beat-the-baseline': {
    title: 'Build a majority baseline',
    task: 'Return the most common label. If labels is empty, return None.',
    functionName: 'majority_baseline',
    starter: `def majority_baseline(labels):
    """Predict the label seen most often."""
    return None`,
    tests: `assert majority_baseline([0, 0, 1, 0, 1]) == 0, "Zero is the majority"
assert majority_baseline(['cat', 'dog', 'cat']) == 'cat', "Labels can be strings"
assert majority_baseline([]) is None, "No examples means no baseline label"`,
    hints: ['Handle the empty case first.', 'labels.count(x) tells you how often x appears.', 'max(labels, key=labels.count) returns the most frequent label.'],
  },
  'linear-regression': {
    title: 'Write a linear model',
    task: 'Predict one output per x using y = slope × x + intercept.',
    functionName: 'line_predict',
    starter: `def line_predict(xs, slope, intercept):
    """Return predictions from a straight-line model."""
    return []`,
    tests: `assert line_predict([0, 1, 2], 2, 1) == [1, 3, 5], "Apply y = slope*x + intercept"
assert line_predict([-2, 2], 0.5, 0) == [-1.0, 1.0], "Support negative and fractional values"
assert line_predict([], 4, 2) == [], "No inputs means no predictions"`,
    hints: ['Transform every x independently.', 'The intercept is added after multiplying.', 'Return [slope * x + intercept for x in xs].'],
  },
  'logistic-classification': {
    title: 'Compute the logistic sigmoid',
    task: 'Convert each numeric score into a probability with 1 / (1 + exp(-score)).',
    functionName: 'sigmoid',
    starter: `def sigmoid(scores):
    """Map model scores to probabilities between zero and one."""
    import math
    return []`,
    tests: `assert abs(sigmoid([0])[0] - 0.5) < 1e-9, "A zero score maps to 0.5"
values = sigmoid([-2, 2])
assert values[0] < 0.5 < values[1], "Negative and positive scores land on opposite sides"
assert abs(values[0] + values[1] - 1) < 1e-9, "The sigmoid is symmetric"
assert sigmoid([]) == [], "Handle empty input"`,
    hints: ['Use math.exp(-score).', 'Transform every score independently.', 'Return [1 / (1 + math.exp(-score)) for score in scores].'],
  },
  'knn-classification': {
    title: 'Let the nearest labels vote',
    task: 'Predict a binary label for one query using the k closest one-dimensional training examples.',
    functionName: 'knn_predict',
    starter: `def knn_predict(train_x, train_y, query, k=3):
    """Return the majority label among the k nearest values."""
    return 0`,
    tests: `assert knn_predict([1, 2, 8, 9], [0, 0, 1, 1], 2.5, 3) == 0, "Nearby low values vote zero"
assert knn_predict([1, 2, 8, 9], [0, 0, 1, 1], 7.5, 3) == 1, "Nearby high values vote one"
assert knn_predict([0, 10], [0, 1], 9, 1) == 1, "k=1 uses the single closest example"`,
    hints: ['Pair each label with abs(x - query).', 'Sort pairs by distance and take the first k.', 'For binary labels, predict 1 when their sum is more than half of k.'],
  },
  'support-vector-machines': {
    title: 'Classify with a separating hyperplane',
    task: 'Compute weight × x + bias and return 1 on or above the boundary, otherwise -1.',
    functionName: 'svm_predict',
    starter: `def svm_predict(values, weight, bias):
    """Classify values by the sign of a linear decision score."""
    return []`,
    tests: `assert svm_predict([-2, 0, 3], 1, 0) == [-1, 1, 1], "The boundary includes score zero on the positive side"
assert svm_predict([1, 2, 3], -2, 5) == [1, 1, -1], "Weight and bias position the boundary"
assert svm_predict([], 4, -1) == [], "Handle empty input"`,
    hints: ['Calculate score = weight * x + bias.', 'The sign of the score selects the side of the margin.', 'Return 1 if score >= 0 else -1 for every value.'],
  },
  'decision-trees': {
    title: 'Implement one tree split',
    task: 'For each feature row, return left_label when the selected feature is below the threshold; otherwise return right_label.',
    functionName: 'tree_predict',
    starter: `def tree_predict(rows, feature_index, threshold, left_label, right_label):
    """Run one decision-tree split over feature rows."""
    return []`,
    tests: `rows = [[20, 1], [42, 0], [31, 1]]
assert tree_predict(rows, 0, 35, 'young', 'older') == ['young', 'older', 'young'], "Split on the chosen feature"
assert tree_predict([[1, 4], [1, 7]], 1, 5, 0, 1) == [0, 1], "feature_index selects the column"
assert tree_predict([], 0, 2, 0, 1) == [], "Handle empty rows"`,
    hints: ['Read row[feature_index] for each example.', 'A tree routes values below the threshold left.', 'Build one output label for every row.'],
  },
  'ensemble-power': {
    title: 'Vote across a random forest',
    task: 'Tree predictions are a list of model prediction lists. Return the forest majority vote for each example.',
    functionName: 'ensemble_vote',
    starter: `def ensemble_vote(predictions):
    """Combine rows of model predictions into one result."""
    return []`,
    tests: `models = [[1, 0, 1], [1, 1, 0], [0, 1, 1]]
assert ensemble_vote(models) == [1, 1, 1], "Vote down each example column"
assert ensemble_vote([[0, 1], [0, 1], [1, 0]]) == [0, 1], "The majority wins"
assert ensemble_vote([]) == [], "No models means no ensemble prediction"`,
    hints: ['Handle the empty case before reading the first model.', 'zip(*predictions) groups votes by example.', 'For binary votes, 1 wins when sum(votes) > len(votes)/2.'],
  },
  'gradient-boosting': {
    title: 'Calculate the next residuals',
    task: 'Return actual minus predicted for each example—the errors the next weak learner must correct.',
    functionName: 'residuals',
    starter: `def residuals(actual, predicted):
    """Measure the correction still needed for every prediction."""
    return []`,
    tests: `assert residuals([10, 7, 4], [8, 7, 5]) == [2, 0, -1], "Residuals keep their direction"
assert residuals([0.5, 1.5], [0.2, 1.0]) == [0.3, 0.5], "Support fractional corrections"
assert residuals([], []) == [], "Handle empty inputs"`,
    hints: ['Pair actual and predicted values with zip.', 'A positive residual means the ensemble predicted too low.', 'Return [truth - guess for truth, guess in zip(actual, predicted)].'],
  },
  'loss-functions': {
    title: 'Measure squared error',
    task: 'Return the mean squared error between actual and predicted values.',
    functionName: 'mean_squared_error',
    starter: `def mean_squared_error(actual, predicted):
    """Average the squared prediction errors."""
    return 0.0`,
    tests: `assert mean_squared_error([1, 2, 3], [1, 2, 3]) == 0, "Perfect predictions have zero loss"
assert abs(mean_squared_error([1, 2], [3, 4]) - 4.0) < 1e-9, "Both errors are -2, so both squares are 4"
assert abs(mean_squared_error([0, 2], [1, 0]) - 2.5) < 1e-9, "Average the squared errors"`,
    hints: ['Pair values with zip(actual, predicted).', 'For each pair compute (a - p) ** 2.', 'Sum the squared errors and divide by len(actual).'],
  },
  'gradient-descent': {
    title: 'Take one gradient step',
    task: 'Update a weight by moving opposite the gradient: weight − learning_rate × gradient.',
    functionName: 'gradient_step',
    starter: `def gradient_step(weight, gradient, learning_rate):
    """Return the weight after one optimization step."""
    return weight`,
    tests: `assert abs(gradient_step(10.0, 2.0, 0.1) - 9.8) < 1e-9, "Positive gradient should decrease the weight"
assert abs(gradient_step(3.0, -4.0, 0.25) - 4.0) < 1e-9, "Negative gradient should increase the weight"
assert gradient_step(5, 100, 0) == 5, "Zero learning rate means no movement"`,
    hints: ['The gradient points uphill, so subtract it.', 'Scale the gradient by the learning rate first.', 'Return weight - learning_rate * gradient.'],
  },
  'feature-engineering': {
    title: 'Standardize a feature',
    task: 'Center values at their mean and scale by population standard deviation. Return zeros if variance is zero.',
    functionName: 'standardize',
    starter: `def standardize(values):
    """Return zero-mean, unit-scale feature values."""
    return values`,
    tests: `result = standardize([1, 2, 3])
assert all(abs(a-b) < 1e-6 for a,b in zip(result, [-1.224744871, 0.0, 1.224744871])), "Center and divide by population standard deviation"
assert standardize([4, 4, 4]) == [0, 0, 0], "A constant feature has no spread"
assert standardize([]) == [], "Handle empty input"`,
    hints: ['Compute mean = sum(values) / len(values).', 'Population variance is the mean squared distance from the mean.', 'Standard deviation is variance ** 0.5; guard against zero.'],
  },
  'regularization': {
    title: 'Add an L2 penalty',
    task: 'Return data_loss plus strength times the sum of squared weights.',
    functionName: 'l2_loss',
    starter: `def l2_loss(data_loss, weights, strength):
    """Add an L2 complexity penalty to data loss."""
    return data_loss`,
    tests: `assert abs(l2_loss(2.0, [1, -2], 0.1) - 2.5) < 1e-9, "Squared weights sum to five"
assert l2_loss(3, [100, 200], 0) == 3, "Zero strength adds no penalty"
assert l2_loss(1, [], 10) == 1, "No weights means no penalty"`,
    hints: ['Square every weight, including negative ones.', 'Multiply the sum by strength.', 'Return data_loss + strength * sum(w*w for w in weights).'],
  },
  'confusion-matrix': {
    title: 'Count every outcome',
    task: 'Return a dictionary with tp, tn, fp, and fn counts for binary labels.',
    functionName: 'confusion_counts',
    starter: `def confusion_counts(actual, predicted):
    """Count binary classification outcomes."""
    return {'tp': 0, 'tn': 0, 'fp': 0, 'fn': 0}`,
    tests: `counts = confusion_counts([1, 1, 0, 0], [1, 0, 1, 0])
assert counts == {'tp': 1, 'tn': 1, 'fp': 1, 'fn': 1}, "Each outcome appears once"
assert confusion_counts([1, 1], [1, 1]) == {'tp': 2, 'tn': 0, 'fp': 0, 'fn': 0}, "Count true positives"
assert confusion_counts([], []) == {'tp': 0, 'tn': 0, 'fp': 0, 'fn': 0}, "Empty inputs produce zero counts"`,
    hints: ['Loop over actual and predicted together.', 'A false positive is actual 0, predicted 1.', 'Increment exactly one dictionary key for each pair.'],
  },
  'precision-and-recall': {
    title: 'Compute precision and recall',
    task: 'Return (precision, recall), safely returning 0 when a denominator is zero.',
    functionName: 'precision_recall',
    starter: `def precision_recall(tp, fp, fn):
    """Compute two core classification metrics."""
    return 0.0, 0.0`,
    tests: `p, r = precision_recall(8, 2, 4)
assert abs(p - 0.8) < 1e-9 and abs(r - 2/3) < 1e-9, "Precision uses fp; recall uses fn"
assert precision_recall(0, 0, 5) == (0, 0), "No predicted positives gives zero precision"
assert precision_recall(0, 3, 0) == (0, 0), "No actual positives gives zero recall"`,
    hints: ['Precision = tp / (tp + fp).', 'Recall = tp / (tp + fn).', 'Check each denominator before dividing.'],
  },
  'cross-validation': {
    title: 'Build validation folds',
    task: 'Distribute indices 0..n−1 round-robin into k folds.',
    functionName: 'make_folds',
    starter: `def make_folds(n, k):
    """Return k lists of validation indices."""
    return []`,
    tests: `assert make_folds(7, 3) == [[0, 3, 6], [1, 4], [2, 5]], "Assign indices round-robin"
assert make_folds(4, 4) == [[0], [1], [2], [3]], "One item per fold"
assert make_folds(0, 3) == [[], [], []], "Keep the requested number of empty folds"`,
    hints: ['Start with k empty lists.', 'index % k chooses the fold for each index.', 'Append each index to folds[index % k].'],
  },
  'leakage-and-imbalance': {
    title: 'Balance rare classes',
    task: 'Return a weight per label using n_samples / (n_classes × label_count).',
    functionName: 'balanced_weights',
    starter: `def balanced_weights(labels):
    """Give rare labels more training weight."""
    return {}`,
    tests: `weights = balanced_weights([0, 0, 0, 1])
assert abs(weights[0] - 4/6) < 1e-9 and abs(weights[1] - 2.0) < 1e-9, "The rare class should receive more weight"
assert balanced_weights(['a', 'b']) == {'a': 1.0, 'b': 1.0}, "Balanced classes get weight one"
assert balanced_weights([]) == {}, "No labels means no weights"`,
    hints: ['Count examples for each unique label.', 'n_classes is the number of unique labels.', 'For each label use len(labels) / (n_classes * count).'],
  },
  'clustering': {
    title: 'Assign points to centers',
    task: 'Return the index of the nearest Euclidean center for each 2D point.',
    functionName: 'assign_clusters',
    starter: `def assign_clusters(points, centers):
    """Assign every point to its nearest center."""
    return []`,
    tests: `points = [(0, 0), (9, 9), (4, 5)]
centers = [(0, 1), (10, 10)]
assert assign_clusters(points, centers) == [0, 1, 0], "Choose the closest center"
assert assign_clusters([], centers) == [], "No points means no assignments"
assert assign_clusters([(2, 2)], [(2, 2)]) == [0], "An exact center has distance zero"`,
    hints: ['Squared distance is enough; no square root is needed.', 'For each point, compute a distance to every center.', 'Use min(range(len(centers)), key=...) to get the nearest index.'],
  },
  'dimensionality-reduction': {
    title: 'Project onto one direction',
    task: 'Return the dot product of each 2D point with a 2D direction vector.',
    functionName: 'project_2d',
    starter: `def project_2d(points, direction):
    """Compress 2D points into one coordinate."""
    return []`,
    tests: `assert project_2d([(1, 2), (3, 4)], (1, 0)) == [1, 3], "Projecting onto x keeps x values"
assert project_2d([(1, 2), (3, 4)], (0, 1)) == [2, 4], "Projecting onto y keeps y values"
assert project_2d([(-1, 2)], (0.5, 0.5)) == [0.5], "Use the dot product"`,
    hints: ['A 2D dot product is x*dx + y*dy.', 'Unpack direction once before the loop.', 'Return one scalar for every point.'],
  },
  'anomaly-detection': {
    title: 'Trigger anomaly alerts',
    task: 'Return True for scores at or above the threshold and False for lower scores.',
    functionName: 'anomaly_flags',
    starter: `def anomaly_flags(scores, threshold):
    """Turn anomaly scores into review flags."""
    return []`,
    tests: `assert anomaly_flags([0.1, 0.8, 0.5], 0.5) == [False, True, True], "The threshold is inclusive"
assert anomaly_flags([], 0.9) == [], "Handle empty scores"
assert anomaly_flags([-2, -1], -1) == [False, True], "Scores need not be probabilities"`,
    hints: ['This is a threshold rule again.', 'Boolean comparisons already produce True or False.', 'Return [score >= threshold for score in scores].'],
  },
  'recommender-systems': {
    title: 'Measure taste similarity',
    task: 'Compute cosine similarity between two equal-length vectors. Return 0 if either vector has zero magnitude.',
    functionName: 'cosine_similarity',
    starter: `def cosine_similarity(a, b):
    """Compare the direction of two preference vectors."""
    return 0.0`,
    tests: `assert abs(cosine_similarity([1, 0], [1, 0]) - 1.0) < 1e-9, "Identical directions have similarity one"
assert abs(cosine_similarity([1, 0], [0, 1])) < 1e-9, "Perpendicular vectors have similarity zero"
assert cosine_similarity([0, 0], [3, 4]) == 0, "Guard against zero magnitude"`,
    hints: ['The numerator is the dot product.', 'Magnitude is the square root of the sum of squared values.', 'Divide dot by magnitude_a * magnitude_b only when both are nonzero.'],
  },
  'neural-networks': {
    title: 'Build one ReLU neuron',
    task: 'Compute the weighted sum plus bias, then apply ReLU: max(0, value).',
    functionName: 'relu_neuron',
    starter: `def relu_neuron(inputs, weights, bias):
    """Run one artificial neuron."""
    return 0.0`,
    tests: `assert relu_neuron([1, 2], [3, 4], 1) == 12, "Weighted sum is 1*3 + 2*4 + 1"
assert relu_neuron([-2, 1], [3, 1], 0) == 0, "ReLU clips negative values to zero"
assert relu_neuron([], [], -1) == 0, "Bias still passes through ReLU"`,
    hints: ['Pair inputs and weights with zip.', 'Add bias to the sum of input*weight products.', 'Return max(0, weighted_sum).'],
  },
  'computer-vision': {
    title: 'Slide a 1D filter',
    task: 'Compute a valid 1D convolution: slide the kernel where it fully fits and return each dot product.',
    functionName: 'convolve_1d',
    starter: `def convolve_1d(signal, kernel):
    """Slide a small filter across a signal."""
    return []`,
    tests: `assert convolve_1d([1, 2, 3, 4], [1, -1]) == [-1, -1, -1], "Slide the edge filter across three windows"
assert convolve_1d([1, 2, 3], [1, 1]) == [3, 5], "Compute one dot product per valid window"
assert convolve_1d([1], [1, 2]) == [], "The kernel must fit completely"`,
    hints: ['The number of outputs is len(signal) - len(kernel) + 1.', 'For each start index, pair the window with the kernel.', 'Sum signal[i+j] * kernel[j] for every kernel position.'],
  },
  'language-and-attention': {
    title: 'Normalize attention scores',
    task: 'Return a numerically stable softmax: exponentiate scores after subtracting the maximum, then normalize.',
    functionName: 'softmax',
    starter: `def softmax(scores):
    """Turn arbitrary scores into weights that sum to one."""
    return []`,
    tests: `result = softmax([0, 0])
assert all(abs(a-b) < 1e-9 for a,b in zip(result, [0.5, 0.5])), "Equal scores get equal weight"
result = softmax([1000, 1000])
assert all(abs(a-0.5) < 1e-9 for a in result), "Subtract the maximum for numerical stability"
result = softmax([1, 2, 3])
assert abs(sum(result) - 1.0) < 1e-9 and result[2] > result[1] > result[0], "Weights sum to one and preserve order"`,
    hints: ['Import exp from math inside the function or at the top.', 'Subtract max(scores) before calling exp.', 'Divide every exponential by their total.'],
  },
  'deploy-and-monitor': {
    title: 'Quantify data drift',
    task: 'Return the absolute difference between the reference mean and current mean. Return 0 if either list is empty.',
    functionName: 'drift_score',
    starter: `def drift_score(reference, current):
    """Measure a simple shift in one feature."""
    return 0.0`,
    tests: `assert abs(drift_score([1, 2, 3], [2, 3, 4]) - 1.0) < 1e-9, "The current mean shifted by one"
assert drift_score([1, 2], [2, 1]) == 0, "Order changes do not change the mean"
assert drift_score([], [1, 2]) == 0 and drift_score([1], []) == 0, "Missing windows cannot produce a score"`,
    hints: ['Handle empty reference or current first.', 'Mean is sum(values) / len(values).', 'Return abs(reference_mean - current_mean).'],
  },
}
