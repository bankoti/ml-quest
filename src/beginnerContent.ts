export interface BeginnerUnit {
  slug: string
  title: string
  subtitle: string
  why: string
  example: string
  walkthrough: { code: string; explanation: string }[]
  prediction: { question: string; choices: string[]; answer: number; explanation: string }
  task: string
  starter: string
  tests: string
  solution: string
  hints: string[]
  bridge: string
}

export const BEGINNER_UNITS: BeginnerUnit[] = [
  {
    slug: 'variables-and-arithmetic', title: 'Give a number a name', subtitle: 'Variables · arithmetic · print',
    why: 'Python is a way to give a computer precise instructions. Start with ordinary arithmetic; no coding experience is needed.',
    example: 'price = 4\nquantity = 3\ntotal = price * quantity\nprint(total)',
    walkthrough: [
      { code: 'price = 4', explanation: 'The name price now refers to the number 4. Here = stores a value; it does not ask whether two things are equal.' },
      { code: 'quantity = 3', explanation: 'Give a second number its own name. Python runs the lines from top to bottom.' },
      { code: 'total = price * quantity', explanation: '* means multiply. Python calculates 4 × 3 and stores 12 as total. You can also use +, -, and /.' },
      { code: 'print(total)', explanation: 'print(...) displays a value in the output. The parentheses contain the value you want to display. Lines starting with # are notes, not instructions.' },
    ],
    prediction: { question: 'If quantity changes from 3 to 5 and we run every line again, what is total?', choices: ['8', '12', '20'], answer: 2, explanation: '4 × 5 = 20. A stored total does not update by magic: Python must run the calculation again.' },
    task: 'A dataset has 12 rows. Reserve 3 for testing. Calculate training_rows using the two given names, then calculate training_fraction as training_rows divided by rows. Replace both zeros.',
    starter: 'rows = 12\ntest_rows = 3\n\n# Subtract the reserved rows.\ntraining_rows = 0\n# Divide the training rows by all rows.\ntraining_fraction = 0\n\nprint(training_rows)\nprint(training_fraction)',
    tests: 'assert rows == 12 and test_rows == 3, "Keep the two given inputs unchanged."\nassert training_rows == 9, "12 rows minus 3 reserved rows leaves 9 training rows."\nassert abs(training_fraction - 0.75) < 1e-9, "Divide 9 by 12 to get 0.75 (75%)."\nprint("Passed: 9 training rows; training fraction 0.75.")',
    solution: 'rows = 12\ntest_rows = 3\ntraining_rows = rows - test_rows\ntraining_fraction = training_rows / rows\nprint(training_rows)\nprint(training_fraction)',
    hints: ['Use subtraction: rows - test_rows.', 'Use / for division: training_rows / rows. A fraction of 0.75 means 75 out of every 100.'],
    bridge: 'ML code repeatedly names values and calculates with them. You just described a train/test split using arithmetic.',
  },
  {
    slug: 'lists-and-indexes', title: 'Keep examples in a list', subtitle: 'Lists · indexes · len',
    why: 'Machine learning uses collections of examples. A Python list holds several values in a fixed order.',
    example: 'sizes = [2, 5, 8]\nfirst_size = sizes[0]\nlast_size = sizes[2]\ncount = len(sizes)\nprint(first_size, last_size, count)',
    walkthrough: [
      { code: 'sizes = [2, 5, 8]', explanation: 'Square brackets create a list. Commas separate its three values.' },
      { code: 'first_size = sizes[0]', explanation: 'An index is a position, and Python counts positions from zero. Index 0 selects the first value, 2.' },
      { code: 'last_size = sizes[2]', explanation: 'The third value has index 2. Asking for index 3 here would fail: there are only three values.' },
      { code: 'count = len(sizes)', explanation: 'len(...) counts the items, so count is 3. print can display several values separated by commas.' },
    ],
    prediction: { question: 'What is sizes[1] in the example?', choices: ['2', '5', '8'], answer: 1, explanation: 'Index 1 means the second position. The value stored there is 5.' },
    task: 'Use the given measurements list to select its first and third values. Store the number of measurements in count. Replace the three zeros without changing the list.',
    starter: 'measurements = [4, 7, 10, 13]\n\nfirst = 0\nthird = 0\ncount = 0\n\nprint(first, third, count)',
    tests: 'assert measurements == [4, 7, 10, 13], "Keep the measurements unchanged."\nassert first == 4, "The first item uses index 0."\nassert third == 10, "The third item uses index 2."\nassert count == 4, "len(measurements) counts all four items."\nprint("Passed: first 4; third 10; count 4.")',
    solution: 'measurements = [4, 7, 10, 13]\nfirst = measurements[0]\nthird = measurements[2]\ncount = len(measurements)\nprint(first, third, count)',
    hints: ['Write measurements[0] to select the first item, and measurements[2] for the third.', 'len(measurements) gives the list length; the final index is one less than that length.'],
    bridge: 'Later, each item might be a house price, a prediction, or a whole row of features. Lists are the first building block.',
  },
  {
    slug: 'conditions', title: 'Make a decision', subtitle: 'Comparisons · if · else',
    why: 'A model often produces a number. A decision rule turns that number into an action.',
    example: 'score = 7\nthreshold = 5\nif score >= threshold:\n    label = 1\nelse:\n    label = 0\nprint(label)',
    walkthrough: [
      { code: 'score >= threshold', explanation: '>= asks “greater than or equal to?” The answer is True or False. Other comparisons include <, >, <=, and == (equal to).' },
      { code: 'if score >= threshold:', explanation: 'if runs the following indented block only when the comparison is True. The colon begins the block.' },
      { code: '    label = 1', explanation: 'Four leading spaces show which line belongs inside if. Here 7 >= 5 is True, so label becomes 1.' },
      { code: 'else:\n    label = 0', explanation: 'else runs its indented block when the comparison is False. Exactly one of these branches runs.' },
    ],
    prediction: { question: 'With score = 5 and threshold = 5, which label does the example produce?', choices: ['0', '1', 'Both'], answer: 1, explanation: 'The “or equal to” part of >= includes the boundary. 5 >= 5 is True.' },
    task: 'Set label to 1 when score is at least threshold; otherwise set it to 0. The supplied score equals the threshold. Replace the condition False, keeping the indentation.',
    starter: 'score = 5\nthreshold = 5\n\nif False:\n    label = 1\nelse:\n    label = 0\n\nprint(label)',
    tests: 'assert score == 5 and threshold == 5, "Keep score and threshold at 5 to test the boundary."\nassert label == 1, "The boundary counts as positive: use >=, not >."\nprint("Passed: a score at the threshold receives label 1.")',
    solution: 'score = 5\nthreshold = 5\nif score >= threshold:\n    label = 1\nelse:\n    label = 0\nprint(label)',
    hints: ['Replace False with a comparison between score and threshold.', 'The comparison is score >= threshold. Keep the colon and the four spaces inside each branch.'],
    bridge: 'This is a decision threshold. Raising or lowering one can change who receives a positive prediction without retraining a model.',
  },
  {
    slug: 'loops', title: 'Repeat a small instruction', subtitle: 'for · indentation · append',
    why: 'A dataset may contain thousands of rows. A loop repeats the same instructions once for each item.',
    example: 'values = [2, 5, 8]\ndoubled = []\nfor value in values:\n    doubled.append(value * 2)\nprint(doubled)',
    walkthrough: [
      { code: 'doubled = []', explanation: 'Start with an empty list for the answers. Do this before the loop so the answers are not erased every time.' },
      { code: 'for value in values:', explanation: 'for visits the list in order. First value is 2, then 5, then 8. The name value holds the current item.' },
      { code: '    doubled.append(value * 2)', explanation: 'append(...) adds one item to the end of a list. The dot means “use the append operation belonging to doubled.” The indentation makes this line repeat.' },
      { code: 'print(doubled)', explanation: 'Back at the left edge, this line runs after the loop has finished. The output is [4, 10, 16].' },
    ],
    prediction: { question: 'After two trips through this loop, what is doubled?', choices: ['[4]', '[4, 10]', '[4, 10, 16]'], answer: 1, explanation: 'Two inputs have been visited: 2 and 5. Their doubled values are 4 and 10. The third input is still waiting.' },
    task: 'Build predictions with one label per value: 1 if the value is at least 5, otherwise 0. Fill both append(...) calls. Preserve the order, including the exact boundary 5.',
    starter: 'values = [2, 5, 8]\npredictions = []\n\nfor value in values:\n    if value >= 5:\n        predictions.append(0)\n    else:\n        predictions.append(0)\n\nprint(predictions)',
    tests: 'assert values == [2, 5, 8], "Keep the input list unchanged."\nassert predictions == [0, 1, 1], "Visit 2, 5, and 8 in order; only 2 is below the threshold."\nprint("Passed: one prediction per input, [0, 1, 1].")',
    solution: 'values = [2, 5, 8]\npredictions = []\nfor value in values:\n    if value >= 5:\n        predictions.append(1)\n    else:\n        predictions.append(0)\nprint(predictions)',
    hints: ['The if branch needs to add 1; the else branch adds 0.', 'A block inside a block has eight leading spaces here. Keep predictions = [] outside the loop.'],
    bridge: 'You have built the core of the first ML Quest Python challenge: apply one decision rule to a collection of examples.',
  },
  {
    slug: 'functions', title: 'Package a reusable rule', subtitle: 'def · inputs · return',
    why: 'A function names a reusable set of instructions. Unlike the earlier scripts, it can handle new inputs each time you call it.',
    example: 'def double(number):\n    return number * 2\n\nanswer = double(3)\nprint(answer)',
    walkthrough: [
      { code: 'def double(number):', explanation: 'def defines a function named double. number is a parameter: a name for the value supplied when the function is called. Defining the function does not run its body yet.' },
      { code: '    return number * 2', explanation: 'return sends a result back to the caller and ends the function. print displays something; it is not a replacement for return.' },
      { code: 'answer = double(3)', explanation: 'The call supplies 3, so number is 3 inside this call. The function returns 6, which is stored as answer.' },
      { code: 'double(5)', explanation: 'A different call supplies a different input and returns 10. Function inputs can also be lists, and a function can have more than one parameter.' },
    ],
    prediction: { question: 'What value does double(0) return?', choices: ['0', '2', 'No value'], answer: 0, explanation: 'The same rule works at zero: 0 × 2 = 0. Edge cases deserve tests, too.' },
    task: 'Complete threshold_predict(values, threshold). Use the loop and decision from the previous unit, but compare with the supplied threshold. Return the complete list after the loop. This must also work for an empty list.',
    starter: 'def threshold_predict(values, threshold):\n    predictions = []\n    for value in values:\n        if value >= threshold:\n            predictions.append(0)\n        else:\n            predictions.append(0)\n    return predictions\n\nprint(threshold_predict([2, 5, 8], 5))',
    tests: 'assert threshold_predict([2, 5, 8], 5) == [0, 1, 1], "Include the threshold itself in class 1."\nassert threshold_predict([1, 3, 6], 3) == [0, 1, 1], "Use the supplied threshold, not a fixed number."\nassert threshold_predict([-2, 0, 2], 0) == [0, 1, 1], "Negative values and a zero threshold should work."\nassert threshold_predict([], 5) == [], "An empty input should return an empty list."\nprint("Passed: ordinary inputs, changed threshold, negative values, and empty input.")',
    solution: 'def threshold_predict(values, threshold):\n    predictions = []\n    for value in values:\n        if value >= threshold:\n            predictions.append(1)\n        else:\n            predictions.append(0)\n    return predictions\n\nprint(threshold_predict([2, 5, 8], 5))',
    hints: ['Change the if branch to append 1; keep the else branch at 0.', 'return predictions belongs inside the function but outside the loop. If the input is empty, the loop runs zero times and the empty list is still returned.'],
    bridge: 'You can now attempt the core course’s first Python quest without having to learn function syntax at the same time as machine learning.',
  },
  {
    slug: 'visual-math', title: 'Read the math as a picture', subtitle: 'Coordinates · slope · weighted sums · probability',
    why: 'You do not need an entire math degree before your first model. Start with a point, a line, a weighted sum, and a fraction.',
    example: 'def line_y(x, slope, intercept):\n    return slope * x + intercept\n\nfeatures = [2, 3]\nweights = [4, 1]\nscore = features[0] * weights[0] + features[1] * weights[1]\nprobability = 3 / 10\nprint(line_y(2, 3, 1), score, probability)',
    walkthrough: [
      { code: '(x, y)', explanation: 'A coordinate pair locates a point: move x steps across, then y steps up. In a prediction plot, x can be an input and y a predicted output.' },
      { code: 'slope * x + intercept', explanation: 'A line follows y = slope × x + intercept. The intercept is y when x = 0. The slope says how much y changes when x increases by 1.' },
      { code: 'features[0] * weights[0] + features[1] * weights[1]', explanation: 'A vector is an ordered list of numbers. A weighted sum multiplies matching entries and adds them: [2, 3] with weights [4, 1] gives 2 × 4 + 3 × 1 = 11. A bias is an extra constant added afterward.' },
      { code: 'probability = 3 / 10', explanation: 'For ten equally likely items, three marked items give probability 3/10 = 0.3 = 30%. Probabilities range from 0 to 1. A model score is not automatically a probability, and ten observed outcomes do not guarantee the next ten.' },
    ],
    prediction: { question: 'For y = 2 × x + 1, what is y when x = 3?', choices: ['5', '6', '7'], answer: 2, explanation: 'Multiply first: 2 × 3 = 6. Then add the intercept: 6 + 1 = 7. The point is (3, 7).' },
    task: 'Complete line_y and weighted_score using the formulas above. weighted_score receives exactly two features and two weights. Then compute probability for 3 marked items out of 10 equally likely items.',
    starter: 'def line_y(x, slope, intercept):\n    return 0\n\ndef weighted_score(features, weights, bias):\n    return 0\n\nprobability = 0\nprint(line_y(3, 2, 1))\nprint(weighted_score([2, 3], [4, 1], 1))\nprint(probability)',
    tests: 'assert line_y(3, 2, 1) == 7, "A line uses slope * x + intercept."\nassert line_y(0, 5, -2) == -2, "At x = 0, the intercept is the output."\nassert line_y(-2, 0.5, 1) == 0, "Support negative inputs and fractional slopes."\nassert weighted_score([2, 3], [4, 1], 1) == 12, "Multiply matching entries, add both, then add bias."\nassert weighted_score([0, -2], [5, 3], 2) == -4, "Use both supplied weights and preserve signs."\nassert abs(probability - 0.3) < 1e-9, "Three of ten equally likely items means 3 / 10."\nprint("Passed: coordinates on a line, weighted sums, and a probability.")',
    solution: 'def line_y(x, slope, intercept):\n    return slope * x + intercept\n\ndef weighted_score(features, weights, bias):\n    return features[0] * weights[0] + features[1] * weights[1] + bias\n\nprobability = 3 / 10\nprint(line_y(3, 2, 1))\nprint(weighted_score([2, 3], [4, 1], 1))\nprint(probability)',
    hints: ['line_y should return slope * x + intercept.', 'The weighted sum is features[0] * weights[0] + features[1] * weights[1] + bias. Probability here is 3 / 10.'],
    bridge: 'Lines lead into regression, weighted sums into neural networks, and probabilities into classification. More math will arrive when you need it.',
  },
]
