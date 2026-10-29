/** Original preparation material, not questions supplied by Intuit or another employer. */
export interface InterviewPythonDrill {
  slug: string
  title: string
  minutes: number
  task: string
  functionName: string
  starter: string
  tests: string
  solution: string
  hints: string[]
}

export interface InterviewCase {
  slug: string
  title: string
  role: string
  minutes: number
  brief: string
  facts: string[]
  prompts: string[]
  rubric: { criterion: string; weak: string; strong: string }[]
  outline: string[]
  twist: { prompt: string; answer: string }
}

const CHECKS = `import copy
import math
import random

def _expect_value_error(call, message):
    try:
        call()
    except ValueError:
        return
    raise AssertionError(message)

def _close(actual, expected, message):
    assert math.isclose(actual, expected, rel_tol=1e-9, abs_tol=1e-9), message
`

export const INTERVIEW_PYTHON: InterviewPythonDrill[] = [
  {
    slug: 'panel-features',
    title: 'Build leakage-safe panel features',
    minutes: 35,
    functionName: 'panel_features',
    task: 'Implement panel_features(rows, window=3). Each input dictionary has sku (nonempty string), day (integer calendar-day index), and units (finite nonnegative number). Return new dictionaries with exactly sku, day, lag1, rolling_mean, sorted by (sku, day), without changing the input. lag1 is this SKU’s units on day−1, or None if that calendar day is missing. rolling_mean uses the previous window calendar days, excludes the current day, and is None unless every required day is observed. Missing observations are unknown, not automatically zero. Raise ValueError for duplicate SKU/day pairs, invalid values, or a nonpositive/noninteger window. Explain why a row-based rolling window on sparse observations, a cross-SKU lag, or a window including today would violate the contract. This is a one-day-ahead feature builder, not permission to use realized intermediate lags in a fixed-origin multi-day forecast.',
    starter: `def panel_features(rows, window=3):
    """Return sorted, calendar-aware features without mutating rows."""
    # TODO: validate keys, index each SKU/day, and look strictly backward.
    return []`,
    solution: `def panel_features(rows, window=3):
    import math
    if type(window) is not int or window < 1:
        raise ValueError("window must be a positive integer")
    values = {}
    for row in rows:
        sku, day, units = row["sku"], row["day"], row["units"]
        if not isinstance(sku, str) or not sku or type(day) is not int:
            raise ValueError("invalid SKU or calendar day")
        if isinstance(units, bool) or not isinstance(units, (int, float)) or not math.isfinite(units) or units < 0:
            raise ValueError("units must be finite and nonnegative")
        if (sku, day) in values:
            raise ValueError("duplicate SKU/day")
        values[sku, day] = units
    result = []
    for sku, day in sorted(values):
        history = [values.get((sku, day - offset)) for offset in range(1, window + 1)]
        rolling = None if any(value is None for value in history) else sum(history) / window
        result.append({"sku": sku, "day": day, "lag1": values.get((sku, day - 1)), "rolling_mean": rolling})
    return result`,
    tests: `${CHECKS}
rows = [{"sku": "B", "day": 2, "units": 300}, {"sku": "A", "day": 4, "units": 1000},
        {"sku": "A", "day": 1, "units": 2}, {"sku": "B", "day": 1, "units": 100},
        {"sku": "A", "day": 3, "units": 6}, {"sku": "A", "day": 2, "units": 4}]
before = copy.deepcopy(rows)
result = panel_features(rows)
assert result == [
    {"sku": "A", "day": 1, "lag1": None, "rolling_mean": None},
    {"sku": "A", "day": 2, "lag1": 2, "rolling_mean": None},
    {"sku": "A", "day": 3, "lag1": 4, "rolling_mean": None},
    {"sku": "A", "day": 4, "lag1": 6, "rolling_mean": 4},
    {"sku": "B", "day": 1, "lag1": None, "rolling_mean": None},
    {"sku": "B", "day": 2, "lag1": 100, "rolling_mean": None}], "Sort within SKU and exclude today's target"
assert rows == before, "Do not mutate input data"
gap = panel_features([{"sku": "A", "day": 0, "units": 9}, {"sku": "A", "day": 2, "units": 0}], 1)
assert gap[-1]["lag1"] is None and gap[-1]["rolling_mean"] is None, "A missing calendar day is not the previous observation or zero"
assert panel_features([], 2) == []
assert panel_features([{"sku": "A", "day": -1, "units": 0}, {"sku": "A", "day": 0, "units": 3}], 1)[-1]["rolling_mean"] == 0, "Observed zero is valid history"
rng = random.Random(73)
panel = [{"sku": sku, "day": day, "units": rng.randint(0, 50)} for sku in ["tea", "milk"] for day in range(24) if not (sku == "tea" and day in [4, 9])]
rng.shuffle(panel)
lookup = {(r["sku"], r["day"]): r["units"] for r in panel}
for width in [1, 2, 7]:
    output = panel_features(panel, width)
    assert [(r["sku"], r["day"]) for r in output] == sorted(lookup), "Keep exactly the observed target rows"
    for row in output:
        sku, day = row["sku"], row["day"]
        prior = [lookup.get((sku, d)) for d in range(day - width, day)]
        assert row["lag1"] == lookup.get((sku, day - 1))
        if None in prior:
            assert row["rolling_mean"] is None
        else:
            _close(row["rolling_mean"], sum(prior) / width, "Use only this SKU's prior calendar days")
changed = [dict(r, units=r["units"] + 99999) if r["day"] >= 15 else dict(r) for r in panel]
assert [r for r in panel_features(changed) if r["day"] <= 15] == [r for r in panel_features(panel) if r["day"] <= 15], "Current/future targets cannot change earlier features"
for invalid in [0, -1, 1.5, True]:
    _expect_value_error(lambda: panel_features([], invalid), "Reject invalid window")
_expect_value_error(lambda: panel_features(rows + [dict(rows[0])]), "Duplicate keys need an explicit aggregation policy")
for invalid in [-1, float("nan"), float("inf"), True]:
    _expect_value_error(lambda: panel_features([{"sku": "A", "day": 0, "units": invalid}]), "Reject invalid units")
print("Passed: panel isolation, calendar gaps, zero history, nonmutation, and future perturbation.")`,
    hints: [
      'Build a dictionary keyed by (sku, day). Validate duplicates before assigning; silently overwriting a duplicate changes the target definition.',
      'For a target day t, request exactly t−1 through t−window. A missing key is None; a stored zero is real data. Do not sort/mutate the caller’s list in place.',
      'A complete window has window observed values. Test causality by changing units on/after day t: features for day t and earlier must not change. Fixed-origin forecasts need a separate plan for unobserved future lags.',
    ],
  },
  {
    slug: 'rolling-origin',
    title: 'Backtest a multi-step seasonal baseline',
    minutes: 35,
    functionName: 'rolling_origin',
    task: 'Implement rolling_origin(y, min_train, horizon, step=1, season=7) for finite numeric observations in time order. Each origin o is a count: training is y[:o], and testing is y[o:o+horizon]. Use origins min_train, min_train+step, … only while the complete horizon is available. Forecast every horizon step by repeating the final season values of that training prefix, including when horizon exceeds season. Return dictionaries with origin, train_size, predictions, actual, mae. A later origin may legitimately train on observations that were test data for an earlier origin; a single origin must never read its future to construct predictions. Return [] if no full origin fits. Raise ValueError for nonpositive/noninteger controls, min_train<season, or nonfinite/nonnumeric observations. No libraries beyond Python’s standard library. After coding, explain why a one-step rolling update would answer a different business question from this fixed-origin multi-step baseline.',
    starter: `def rolling_origin(y, min_train, horizon, step=1, season=7):
    """Evaluate a fixed-origin forecast at each expanding training prefix."""
    # TODO: use only the last complete season within each prefix.
    return []`,
    solution: `def rolling_origin(y, min_train, horizon, step=1, season=7):
    import math
    if any(type(value) is not int or value < 1 for value in [min_train, horizon, step, season]):
        raise ValueError("controls must be positive integers")
    if min_train < season:
        raise ValueError("training must contain a complete season")
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) for value in y):
        raise ValueError("observations must be finite numbers")
    result = []
    for origin in range(min_train, len(y) - horizon + 1, step):
        train = y[:origin]
        last_season = train[-season:]
        predictions = [last_season[h % season] for h in range(horizon)]
        actual = list(y[origin:origin + horizon])
        mae = sum(abs(a - p) for a, p in zip(actual, predictions)) / horizon
        result.append({"origin": origin, "train_size": len(train), "predictions": predictions, "actual": actual, "mae": mae})
    return result`,
    tests: `${CHECKS}
y = list(range(1, 19))
before = list(y)
result = rolling_origin(y, 6, 8, step=4, season=3)
assert [row["origin"] for row in result] == [6, 10], "Only complete horizons; origin is an exclusive training end"
assert result[0] == {"origin": 6, "train_size": 6, "predictions": [4, 5, 6, 4, 5, 6, 4, 5], "actual": list(range(7, 15)), "mae": 45 / 8}, "Repeat the last TRAIN season, not future seasonal observations"
assert result[1]["predictions"] == [8, 9, 10, 8, 9, 10, 8, 9]
assert y == before
weekly = [2, 5, 8, 1, 4, 9, 3] * 7
for row in rolling_origin(weekly, 14, 15, step=5):
    assert row["mae"] == 0 and len(row["predictions"]) == 15, "Multi-week forecast must wrap the training season"
assert rolling_origin([1, 2, 3], 3, 1, season=2) == [], "Do not score a partial future"
assert rolling_origin([], 7, 2) == []
assert rolling_origin([-4, -1, -4], 1, 1, season=1)[0]["mae"] == 3, "Signed cash-flow-like values are allowed"
rng = random.Random(90)
series = [rng.uniform(-20, 80) for _ in range(60)]
for season, horizon in [(1, 12), (7, 17), (4, 3)]:
    folds = rolling_origin(series, 14, horizon, 6, season)
    for fold in folds:
        origin = fold["origin"]
        expected = [series[origin - season + j % season] for j in range(horizon)]
        assert fold["train_size"] == origin and fold["predictions"] == expected
        assert fold["actual"] == series[origin:origin + horizon]
        _close(fold["mae"], sum(abs(a-p) for a, p in zip(fold["actual"], expected)) / horizon, "Score all horizon steps")
    modified = series[:14] + [value + 10000 for value in series[14:]]
    assert rolling_origin(modified, 14, horizon, 6, season)[0]["predictions"] == folds[0]["predictions"], "Perturbing all post-origin outcomes must not change that origin's predictions"
for args in [(3, 2, 1, 7), (7, 0, 1, 7), (7, 2, 0, 7), (7, 2, 1, 0), (7, 2.5, 1, 7)]:
    _expect_value_error(lambda: rolling_origin(series, *args), "Reject invalid split controls")
_expect_value_error(lambda: rolling_origin([float("nan")], 1, 1, season=1), "Reject nonfinite observations")
print("Passed: expanding prefixes, complete horizons, multi-season wrapping, and leakage perturbation.")`,
    hints: [
      'At origin o, train[-season:] is a frozen cycle of length season. The forecast at zero-based horizon j is cycle[j % season].',
      'range(min_train, len(y)−horizon+1, step) includes the final origin whose entire future exists. Do not truncate a fold or divide its error by the wrong horizon.',
      'Using y[o+j−season] leaks actual future demand once j reaches season. Repeat the original training cycle instead. For real experiments, also inspect errors by horizon and reserve a final untouched test period after model selection.',
    ],
  },
  {
    slug: 'forecast-metrics',
    title: 'Implement metrics without hiding undefined scores',
    minutes: 30,
    functionName: 'forecast_scores',
    task: 'Implement forecast_scores(train, actual, predicted, season=1, tau=0.5). Return a dictionary with mae, mase, wape, pinball. MAE averages absolute test errors. MASE divides test MAE by the mean absolute seasonal difference |train[t]−train[t−season]| computed only from train. If train is too short or that scale is zero, MASE is None. WAPE is sum absolute errors / sum absolute actual values, not a percent; return None when that denominator is zero. Standard pinball averages tau*max(y−q,0)+(1−tau)*max(q−y,0), with no factor of two. Interpret predicted as point predictions for MAE/MASE/WAPE and as tau-quantile predictions for pinball; meaningful model comparison requires choosing the intended target functional. Empty matched test arrays return all four values as None. Raise ValueError for unequal test lengths, invalid season/tau, or nonfinite/nonnumeric values. Preserve zeros rather than adding an arbitrary epsilon. Explain why MASE<1 compares with the training naive scale, not necessarily with an actual held-out naive forecast.',
    starter: `def forecast_scores(train, actual, predicted, season=1, tau=0.5):
    """Score aligned forecasts with a training-only MASE denominator."""
    # TODO: handle undefined denominators explicitly.
    return {"mae": None, "mase": None, "wape": None, "pinball": None}`,
    solution: `def forecast_scores(train, actual, predicted, season=1, tau=0.5):
    import math
    if type(season) is not int or season < 1:
        raise ValueError("season must be a positive integer")
    if isinstance(tau, bool) or not isinstance(tau, (int, float)) or not math.isfinite(tau) or not 0 < tau < 1:
        raise ValueError("tau must lie strictly between zero and one")
    if len(actual) != len(predicted):
        raise ValueError("forecasts and actuals must align")
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) for values in [train, actual, predicted] for value in values):
        raise ValueError("all values must be finite numbers")
    if not actual:
        return {"mae": None, "mase": None, "wape": None, "pinball": None}
    errors = [a - p for a, p in zip(actual, predicted)]
    mae = sum(abs(error) for error in errors) / len(errors)
    differences = [abs(train[t] - train[t - season]) for t in range(season, len(train))]
    scale = sum(differences) / len(differences) if differences else 0
    denominator = sum(abs(value) for value in actual)
    pinball = sum(tau * max(error, 0) + (1 - tau) * max(-error, 0) for error in errors) / len(errors)
    return {"mae": mae, "mase": mae / scale if scale else None,
            "wape": sum(abs(error) for error in errors) / denominator if denominator else None,
            "pinball": pinball}`,
    tests: `${CHECKS}
result = forecast_scores([1, 3, 2, 4], [0, 6], [2, 4], tau=0.9)
_close(result["mae"], 2, "MAE uses aligned test errors")
_close(result["mase"], 1.2, "MASE scale is (2+1+2)/3 from training only")
_close(result["wape"], 2 / 3, "WAPE includes zero actual rows without dividing by each row")
_close(result["pinball"], 1, "Standard pinball has no extra factor of two")
assert forecast_scores([2, 2, 2], [3], [3])["mase"] is None, "Zero training variation is undefined, even for a perfect prediction"
assert forecast_scores([1], [5], [4], season=2)["mase"] is None
zero = forecast_scores([0, 1], [0, 0], [1, 2])
assert zero["wape"] is None and zero["mae"] == 1.5 and zero["mase"] == 1.5
assert forecast_scores([], [], []) == {"mae": None, "mase": None, "wape": None, "pinball": None}
_close(forecast_scores([2, 9, 4, 12], [3, 7], [1, 9], season=2)["mase"], 0.8, "Use the requested seasonal lag")
_close(forecast_scores([], [10], [6], tau=0.9)["pinball"], 3.6, "Underprediction at tau=.9 costs .9 per unit")
_close(forecast_scores([], [6], [10], tau=0.9)["pinball"], 0.4, "Overprediction at tau=.9 costs .1 per unit")
_close(forecast_scores([0, 1], [-2, 2], [0, 0])["wape"], 1, "Use absolute actuals in the WAPE denominator")
shifted = forecast_scores([1, 3, 2, 4], [1000, 1006], [1002, 1004])
assert shifted["mase"] == result["mase"], "Changing test scale must not change the training MASE denominator"
data = [[0, 2, 1], [0, 4], [1, 3]]
before = copy.deepcopy(data)
forecast_scores(*data)
assert data == before
_expect_value_error(lambda: forecast_scores([], [1], []), "Do not silently truncate mismatched arrays")
for tau in [0, 1, -0.1, float("nan")]:
    _expect_value_error(lambda: forecast_scores([], [], [], tau=tau), "Validate tau even for empty arrays")
for season in [0, -1, 1.5, True]:
    _expect_value_error(lambda: forecast_scores([], [], [], season=season), "Validate the seasonal period")
for values in [([float("inf")], [1], [1]), ([], [float("nan")], [1]), ([], [1], [None])]:
    _expect_value_error(lambda: forecast_scores(*values), "Reject invalid observations and predictions")
print("Passed: train-only scaling, seasonal lag, undefined denominators, signed actuals, and asymmetric pinball.")`,
    hints: [
      'Compute errors y−prediction once. The MASE denominator comes from train only; the WAPE denominator comes from absolute test actuals. They answer different questions.',
      'When a scale is zero, None communicates that the ratio is undefined. Returning zero, infinity, or an epsilon-dependent huge number would conceal that condition.',
      'At tau=.9 an underprediction of 4 costs 3.6, while an overprediction of 4 costs .4. At tau=.5 this convention equals half MAE. Report calibration and operational cost alongside these scores.',
    ],
  },
  {
    slug: 'empirical-newsvendor',
    title: 'Turn demand samples into a cost-optimal order',
    minutes: 30,
    functionName: 'empirical_newsvendor',
    task: 'Implement empirical_newsvendor(samples, underage, overage) for equally weighted nonnegative demand samples. Return quantity, quantile, expected_cost in a dictionary. Let tau=underage/(underage+overage). For 0<tau<=1, choose the smallest observed quantity whose empirical CDF is at least tau (the lower/generalized-inverse empirical quantile, not an interpolated percentile). If underage is zero choose quantity=0, the smallest feasible nonnegative optimum. expected_cost is the average of underage*max(d−quantity,0)+overage*max(quantity−d,0). Allow one cost to be zero; reject empty samples, negative/nonfinite/nonnumeric inputs, or both costs zero with ValueError. Do not mutate samples. Explain the assumptions: risk-neutral single-period decision, known fixed marginal costs, exogenous demand, no capacity or pack constraints. This exercise chooses an empirical optimum; it does not establish that a small sample estimates the true tail reliably.',
    starter: `def empirical_newsvendor(samples, underage, overage):
    """Choose the lower empirical quantile and evaluate mismatch cost."""
    # TODO: asymmetric costs determine the quantile, not the sample mean.
    return {"quantity": 0, "quantile": 0, "expected_cost": 0}`,
    solution: `def empirical_newsvendor(samples, underage, overage):
    import math
    values = list(samples)
    if not values:
        raise ValueError("an empirical distribution needs observations")
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0 for value in values + [underage, overage]):
        raise ValueError("samples and costs must be finite nonnegative numbers")
    if underage + overage <= 0:
        raise ValueError("at least one cost must be positive")
    tau = underage / (underage + overage)
    ordered = sorted(values)
    quantity = 0
    if tau > 0:
        quantity = next(value for index, value in enumerate(ordered, 1) if index / len(ordered) >= tau)
    expected_cost = sum(underage * max(demand - quantity, 0) + overage * max(quantity - demand, 0) for demand in values) / len(values)
    return {"quantity": quantity, "quantile": tau, "expected_cost": expected_cost}`,
    tests: `${CHECKS}
samples = [40, 40, 60, 60, 60, 60, 60, 100, 100, 100]
before = list(samples)
result = empirical_newsvendor(samples, 8, 5)
assert result["quantity"] == 60, "The cost-optimal order is 60, not the mean 68"
_close(result["quantile"], 8 / 13, "Use the critical fractile")
_close(result["expected_cost"], 116, "Average underage and overage cost over the empirical demand distribution")
assert samples == before
assert empirical_newsvendor([1, 2, 3, 4], 1, 1)["quantity"] == 2, "At a CDF jump boundary, return the smallest satisfying observation, not interpolated 2.5"
assert empirical_newsvendor([0, 0, 10, 10], 1, 1)["quantity"] == 0
assert empirical_newsvendor([8, 9], 0, 3) == {"quantity": 0, "quantile": 0, "expected_cost": 0}, "With no underage cost, zero is a feasible optimum"
assert empirical_newsvendor([8, 9], 3, 0)["quantity"] == 9
assert empirical_newsvendor([0], 2, 3)["expected_cost"] == 0
fractional = empirical_newsvendor([0.5, 1.25, 3.5], 3, 1)
assert fractional["quantity"] == 3.5
rng = random.Random(44)
for _ in range(20):
    values = [rng.randint(0, 25) for _ in range(13)]
    cu, co = rng.randint(1, 9), rng.randint(1, 9)
    answer = empirical_newsvendor(values, cu, co)
    q, tau = answer["quantity"], cu / (cu + co)
    assert sum(value <= q for value in values) / len(values) >= tau
    assert sum(value < q for value in values) / len(values) < tau, "Choose the lower empirical quantile"
    costs = {candidate: sum(cu * max(d-candidate, 0) + co * max(candidate-d, 0) for d in values) / len(values) for candidate in set([0] + values)}
    _close(answer["expected_cost"], min(costs.values()), "Chosen order must minimize empirical mismatch cost")
for args in [([], 1, 1), ([1], 0, 0), ([1], -1, 1), ([-1], 1, 1), ([float("nan")], 1, 1), ([1], float("inf"), 1)]:
    _expect_value_error(lambda: empirical_newsvendor(*args), "Reject undefined distributions and invalid costs")
print("Passed: lower empirical quantiles, ties, one-sided costs, nonmutation, and brute-force cost optimality.")`,
    hints: [
      'Sort a copy of the samples. Walk from smallest upward until cumulative count / sample count reaches tau. An interpolated percentile can miss the requested tie-breaking rule.',
      'For demand [40,40,60,60,60,60,60,100,100,100] and costs 8/5, tau≈.615 and F(60)=.7. The mean 68 answers a squared-error question, not this asymmetric-cost question.',
      'Check your answer by evaluating empirical cost at every distinct observed demand and at zero. With a fixed setup cost, pack sizes, limited capacity or interacting SKUs, optimize over feasible decisions rather than applying the unconstrained quantile blindly.',
    ],
  },
  {
    slug: 'inventory-ledger',
    title: 'Simulate a lost-sales base-stock ledger',
    minutes: 40,
    functionName: 'simulate_inventory',
    task: 'Implement simulate_inventory(demand, base_stock, lead_time, initial_stock=0). Days are zero-indexed. At each day: receive orders due at the start; sell min(on-hand, demand); lose unmet demand permanently (no backlog); then order max(0, base_stock−inventory_position), where pre-order inventory position is remaining on-hand plus all outstanding pipeline. An order placed at the END of day t arrives at the START of t+lead_time+1; even lead_time=0 means next morning, not instant receipt. Return one dictionary per day with day, demand, arrivals, sold, lost, onHand, onOrder, inventoryPosition, order. onOrder and inventoryPosition are CLOSING values including the new order; orders arriving after the simulation ends remain in onOrder. There is no initial pipeline, no capacity constraint, and excess initial stock is not discarded. Quantities must be finite nonnegative numbers and lead_time a nonnegative integer; otherwise raise ValueError. Empty demand returns []. Explain conservation of units, why ordering from shelf stock alone double-orders pipeline, and why observed sales alone cannot reveal lost demand in real data.',
    starter: `def simulate_inventory(demand, base_stock, lead_time, initial_stock=0):
    """Receive, sell, lose unmet demand, then order against inventory position."""
    # TODO: track each order's future arrival day.
    return []`,
    solution: `def simulate_inventory(demand, base_stock, lead_time, initial_stock=0):
    import math
    if type(lead_time) is not int or lead_time < 0:
        raise ValueError("lead_time must be a nonnegative integer")
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0 for value in list(demand) + [base_stock, initial_stock]):
        raise ValueError("quantities must be finite and nonnegative")
    on_hand = initial_stock
    pipeline = []
    rows = []
    for day, requested in enumerate(demand):
        arrivals = sum(quantity for due, quantity in pipeline if due == day)
        pipeline = [(due, quantity) for due, quantity in pipeline if due > day]
        on_hand += arrivals
        sold = min(on_hand, requested)
        lost = requested - sold
        on_hand -= sold
        outstanding = sum(quantity for _, quantity in pipeline)
        order = max(0, base_stock - (on_hand + outstanding))
        if order > 0:
            pipeline.append((day + lead_time + 1, order))
        on_order = sum(quantity for _, quantity in pipeline)
        rows.append({"day": day, "demand": requested, "arrivals": arrivals, "sold": sold,
                     "lost": lost, "onHand": on_hand, "onOrder": on_order,
                     "inventoryPosition": on_hand + on_order, "order": order})
    return rows`,
    tests: `${CHECKS}
rows = simulate_inventory([4, 7, 3, 6], 10, 1, 10)
assert [r["arrivals"] for r in rows] == [0, 0, 4, 6], "End-of-day t order arrives at start t+L+1"
assert [r["sold"] for r in rows] == [4, 6, 3, 6]
assert [r["lost"] for r in rows] == [0, 1, 0, 0], "Lost sales do not become a later backlog"
assert [r["onHand"] for r in rows] == [6, 0, 1, 1]
assert [r["onOrder"] for r in rows] == [4, 10, 9, 9], "Closing pipeline includes orders beyond the test horizon"
assert [r["order"] for r in rows] == [4, 6, 3, 6], "Subtract outstanding pipeline before replenishing"
assert [r["inventoryPosition"] for r in rows] == [10, 10, 10, 10]
assert rows[0] == {"day": 0, "demand": 4, "arrivals": 0, "sold": 4, "lost": 0, "onHand": 6, "onOrder": 4, "inventoryPosition": 10, "order": 4}
fast = simulate_inventory([5, 5, 5], 5, 0)
assert [r["arrivals"] for r in fast] == [0, 5, 5] and [r["lost"] for r in fast] == [5, 0, 0], "L=0 still waits until next morning"
assert simulate_inventory([], 10, 2) == []
excess = simulate_inventory([2, 1], 5, 3, 20)
assert [r["onHand"] for r in excess] == [18, 17] and [r["order"] for r in excess] == [0, 0], "Do not destroy excess initial stock"
assert simulate_inventory([3], 0, 0)[0]["lost"] == 3
assert simulate_inventory([0, 0], 5, 2)[-1]["onOrder"] == 5, "Pipeline must prevent repeated target-sized orders"
assert simulate_inventory([1.5, 0.5], 2, 0, 2)[0]["onHand"] == 0.5
rng = random.Random(67)
for lead in [0, 1, 4, 30]:
    demand = [rng.randint(0, 12) for _ in range(24)]
    before = list(demand)
    output = simulate_inventory(demand, 15, lead, 7)
    assert demand == before and len(output) == len(demand)
    stock, pipeline = 7, 0
    for day, row in enumerate(output):
        due = output[day-lead-1]["order"] if day-lead-1 >= 0 else 0
        _close(row["arrivals"], due, "Receipt schedule must match order history")
        _close(row["sold"], min(stock + due, demand[day]), "Serve only physically available inventory")
        _close(row["lost"] + row["sold"], demand[day], "Every requested unit is sold or lost")
        _close(row["onHand"], stock + due - row["sold"], "Conserve shelf stock")
        _close(row["onOrder"], pipeline - due + row["order"], "Conserve pipeline stock")
        _close(row["order"], max(0, 15 - (row["onHand"] + pipeline - due)), "Base replenishment on pre-order inventory position")
        _close(row["inventoryPosition"], row["onHand"] + row["onOrder"], "Report closing inventory position")
        assert min(row["sold"], row["lost"], row["onHand"], row["onOrder"], row["order"]) >= 0
        stock, pipeline = row["onHand"], row["onOrder"]
for args in [([1], 2, -1, 0), ([1], 2, 0.5, 0), ([-1], 2, 1, 0), ([1], -2, 1, 0), ([1], 2, 1, -1), ([float("nan")], 2, 1, 0)]:
    _expect_value_error(lambda: simulate_inventory(*args), "Reject invalid quantities or lead time")
print("Passed: exact ledger fixture, lead-time timing, pipeline-aware orders, lost sales, and conservation.")`,
    hints: [
      'Store pipeline entries as (arrival_day, quantity). Receive and remove entries due today before serving demand. Schedule a new order for day+lead_time+1.',
      'After demand, calculate pre-order IP = on_hand + sum(pipeline). Only then calculate max(0, target−IP). Report closing onOrder after appending the new order.',
      'For demand [4,7,3,6], target=10, lead_time=1, initial_stock=10, arrivals are [0,0,4,6], lost sales [0,1,0,0], and orders [4,6,3,6]. Check shelf and pipeline conservation separately; do not replenish the unit that was never sold as though it were backlogged.',
    ],
  },
  {
    slug: 'sql-calendar-features',
    title: 'Write SQL windows over a complete calendar',
    minutes: 40,
    functionName: 'feature_sql',
    task: 'Implement feature_sql() returning one read-only SQLite SELECT query as a Python string. Tables: calendar(day TEXT PRIMARY KEY) is a complete contiguous ISO-date calendar; skus(sku TEXT PRIMARY KEY); sales(sku TEXT, day TEXT, units REAL) may contain several transaction rows per SKU/day or no transaction row. For this drill ONLY, the ingestion contract guarantees a complete transaction feed and an active, available SKU on every calendar date, so an absent sale means a known zero (not unknown/censored demand). First aggregate duplicate transactions, scaffold every SKU × calendar date, then join daily sales and replace absent sales with zero. Return columns sku, day, units, lag1, rolling3 in that order, sorted by sku/day. lag1 is prior calendar-day units; rolling3 averages exactly three preceding calendar days, excludes today, and is NULL until three prior days exist. First-day lag1 is NULL. The tests execute your SQL against multiple in-memory databases. Use PARTITION BY sku and an explicit ROWS frame; merely applying LAG to sparse transaction rows is not a daily lag. Explain how you would preserve unknown availability/late-ingestion days rather than invent zero demand in production.',
    starter: `def feature_sql():
    """Return a calendar-scaffolded, SKU-partitioned feature query."""
    return "SELECT sku, day, units, NULL AS lag1, NULL AS rolling3 FROM sales ORDER BY sku, day"`,
    solution: `def feature_sql():
    return """
    WITH daily AS (
        SELECT sku, day, SUM(units) AS units
        FROM sales
        GROUP BY sku, day
    ), panel AS (
        SELECT k.sku, c.day, COALESCE(d.units, 0.0) AS units
        FROM skus AS k CROSS JOIN calendar AS c
        LEFT JOIN daily AS d ON d.sku = k.sku AND d.day = c.day
    )
    SELECT sku, day, units,
           LAG(units, 1) OVER ordered AS lag1,
           CASE WHEN COUNT(*) OVER prior = 3
                THEN AVG(units) OVER prior ELSE NULL END AS rolling3
    FROM panel
    WINDOW ordered AS (PARTITION BY sku ORDER BY day),
           prior AS (PARTITION BY sku ORDER BY day ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING)
    ORDER BY sku, day
    """`,
    tests: `${CHECKS}
import sqlite3
from datetime import date, timedelta

def _check_sql(sku_names, days, transactions):
    connection = sqlite3.connect(":memory:")
    try:
        connection.executescript("CREATE TABLE calendar(day TEXT PRIMARY KEY); CREATE TABLE skus(sku TEXT PRIMARY KEY); CREATE TABLE sales(sku TEXT, day TEXT, units REAL);")
        connection.executemany("INSERT INTO calendar VALUES (?)", [(d,) for d in reversed(days)])
        connection.executemany("INSERT INTO skus VALUES (?)", [(s,) for s in reversed(sku_names)])
        connection.executemany("INSERT INTO sales VALUES (?,?,?)", transactions)
        query = feature_sql()
        assert isinstance(query, str) and query.strip(), "Return the SQL text, not precomputed rows"
        cursor = connection.execute(query)
        assert [column[0] for column in cursor.description] == ["sku", "day", "units", "lag1", "rolling3"], "Preserve the requested feature schema"
        actual = cursor.fetchall()
        totals = {(sku, day): 0.0 for sku in sku_names for day in days}
        for sku, day, units in transactions:
            totals[sku, day] += units
        expected = []
        for sku in sorted(sku_names):
            for index, day in enumerate(days):
                lag = totals[sku, days[index-1]] if index else None
                rolling = sum(totals[sku, d] for d in days[index-3:index]) / 3 if index >= 3 else None
                expected.append((sku, day, totals[sku, day], lag, rolling))
        assert len(actual) == len(expected), "Scaffold all SKU/calendar rows and aggregate duplicate transactions first"
        for got, wanted in zip(actual, expected):
            assert got[:2] == wanted[:2], "Order and partition by SKU/date"
            for a, b in zip(got[2:], wanted[2:]):
                if b is None:
                    assert a is None, "Insufficient prior calendar history must remain NULL"
                else:
                    assert a is not None, "An observed no-sale calendar day is a known zero in this fixture"
                    _close(a, b, "Calendar window or current-row exclusion is incorrect")
    finally:
        connection.close()

days = [(date(2025, 1, 1) + timedelta(days=i)).isoformat() for i in range(5)]
_check_sql(["A", "B"], days, [("A", days[0], 1), ("A", days[0], 1), ("A", days[2], 8), ("A", days[3], 100), ("B", days[1], 30), ("B", days[4], 3)])
rng = random.Random(29)
days = [(date(2024, 2, 26) + timedelta(days=i)).isoformat() for i in range(11)]
transactions = [(sku, day, rng.randint(0, 25)) for sku in ["oats", "tea"] for day in days for _ in range(rng.randint(0, 3))]
rng.shuffle(transactions)
_check_sql(["oats", "tea", "never-sold"], days, transactions)
_check_sql(["quiet"], ["2025-01-01"], [])
_check_sql([], days, [])
print("Passed: actual SQLite execution, duplicate aggregation, complete calendar, SKU isolation, NULL warm-up, and current-row exclusion.")`,
    hints: [
      'Use one CTE to SUM transactions by sku/day and a second for skus CROSS JOIN calendar LEFT JOIN daily totals. Without the scaffold, ROWS counts observed sale rows rather than elapsed calendar days.',
      'LAG(units) OVER (PARTITION BY sku ORDER BY day) supplies yesterday after scaffolding. For rolling3, specify ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING, not CURRENT ROW.',
      'COUNT(*) over the same preceding frame distinguishes one/two historical days from a full three-day window. CASE returns NULL until the count is three. Zero-fill is justified here only by the explicit completeness/availability contract; production missingness needs an observation/availability flag.',
    ],
  },
]

export const INTERVIEW_CASES: InterviewCase[] = [
  {
    slug: 'demand-28-day', title: 'Design a 28-day demand forecasting system', role: 'Data scientist · forecasting system design', minutes: 35,
    brief: 'Original timed mock: a retailer needs daily SKU × store forecasts to plan replenishment over the next 28 days. Give a structured proposal, defend a modest first model, and identify the experiment that would most reduce uncertainty. Use 5 minutes to clarify, 20 to design, and 10 for challenge questions. Rubric ratings are your own assessment, not automatic grading of prose.',
    facts: [
      'There are 200 stores, 5,000 active SKUs, two years of daily sales, prices, promotions, and inventory snapshots. Some SKU/store histories are short or mostly zero.',
      'Forecasts are issued every Monday before opening. Supplier lead times range from 3 to 14 days. Purchase orders can be revised weekly, not after seeing every future daily sale.',
      'Historical sales may be capped by availability. Promotion plans can change; the database stores their latest values unless you request version history.',
      'The team proposes one global WAPE number. Merchandising cares about missed sales, waste and inventory tied up, with different costs for fresh food and durable goods.',
    ],
    prompts: [
      'What are the target, forecast origin, hierarchy, horizon, and information-availability contract? Is the target unconstrained demand or observed sales?',
      'Design an expanding/rolling-origin evaluation and a seasonal-naive baseline for all 28 horizons. Which historical information would you withhold?',
      'Choose a first model, a challenger, pooling strategy, and treatment of intermittent/cold-start series. State what you would not build in week one.',
      'Specify point, distributional and business metrics; show how they change an actual replenishment decision.',
      'Propose one informative ablation and the next production-monitoring/action loop.',
    ],
    rubric: [
      { criterion: 'Target and as-of contract', weak: 'Uses sales as uncensored demand and joins the latest promotion table.', strong: 'Separates sales from latent demand, records availability and versioned covariates, and defines exactly what is known before each Monday origin.' },
      { criterion: 'Temporal evaluation', weak: 'Randomly splits rows or evaluates only one-day forecasts with future observed lags.', strong: 'Uses full 28-day fixed-origin folds, train-only transformations, realistic future covariates, horizon slices, seasonal-naive comparisons, and a held-out final period.' },
      { criterion: 'Model and research judgment', weak: 'Selects a deep architecture without a baseline or data diagnosis.', strong: 'Starts with seasonal naive and an interpretable/global lagged model or appropriate ETS baseline; justifies pooling, intermittent-demand treatment, and one falsifiable ablation.' },
      { criterion: 'Uncertainty and decision value', weak: 'Optimizes a single pooled WAPE and assumes all 95th percentiles add.', strong: 'Reports scale-aware and segment metrics, signed bias, quantile calibration and cost; uses joint lead-time demand scenarios with SKU-specific costs/constraints.' },
      { criterion: 'Operations and communication', weak: 'Says deploy and monitor accuracy without ownership or action.', strong: 'Defines freshness/availability checks, fallback baselines, calibration/drift slices, business guardrails, retraining triggers, and a concise recommendation with explicit uncertainty.' },
    ],
    outline: [
      'Frame the decision first: weekly order timing, lead-time protection, expected margin/waste costs, and what forecast granularity the decision actually needs.',
      'Audit item/store identity, calendar completeness, availability and promotion revision history. Do not silently turn unknown stockouts or missing feeds into zero demand.',
      'Freeze feature availability per historical Monday. Use multiple 28-day evaluation windows; fit transformations per training prefix and report horizon-specific plus cumulative lead-time results.',
      'Benchmark seasonal naive; compare a defensible ETS or pooled lag/holiday/promotion model. Reserve complexity for demonstrated residual structure, data volume and measurable decision benefit.',
      'Evaluate MASE/RMSSE where their scales exist, macro and volume-weighted slices, bias and pinball/coverage. Simulate replenishment with realistic timing/cost constraints rather than equating lower error with higher profit.',
      'Run an availability-aware versus raw-sales ablation and report assumptions/sensitivity. Launch with fallbacks, decision logs and a controlled operational evaluation.',
    ],
    twist: { prompt: 'Your 28-day model uses yesterday’s actual sales as a lag feature for every future date. Its backtest is excellent. What is wrong?', answer: 'At Monday’s fixed origin, actual sales for future Tuesday onward do not exist. That evaluation is a sequence of one-step forecasts, not a 28-day forecast issued Monday. Build direct horizon-specific models with origin-known features, or recursively generate intermediate predictions and evaluate the whole path. A multi-week seasonal-naive baseline must repeat the frozen last observed week, not borrow subsequent actual weeks.' },
  },
  {
    slug: 'inventory-cost', title: 'Choose inventory under asymmetric costs', role: 'Applied scientist · probability and optimization', minutes: 40,
    brief: 'Original timed mock: solve a small inventory decision by hand, then explain exactly which assumptions support the result. Use 10 minutes for the discrete calculation, 15 for replenishment logic, and 15 for sensitivity and discussion. Score your reasoning with the rubric; a self-rating is not proof of mastery.',
    facts: [
      'Single-period demand is 40, 60 or 100 units with probabilities 0.2, 0.5 and 0.3. Each unit short costs 8; each unit left over costs 5.',
      'A colleague recommends ordering the mean demand, 68. Another recommends a 95% demand quantile because “95% service is always best.”',
      'A separate continuously reviewed item has independent daily forecast errors with standard deviation 12, daily mean demand 50, and fixed four-day lead time. Use a normal lead-time-demand approximation and z_0.95=1.645 for this calculation.',
      'That second item has 80 on hand, 200 on order and 20 backordered. Ignore double-counted commitments; all pipeline is reliable and within the policy’s accounting scope.',
    ],
    prompts: [
      'Derive the critical fractile from marginal underage/overage cost and calculate an optimal discrete quantity.',
      'Compute expected mismatch cost at quantities 40, 60, 68 and 100. Why is the mean not generally optimal?',
      'Calculate a 95% cycle-service reorder point for the separate item. Should the present inventory position trigger ordering?',
      'Explain cycle service versus fill rate, continuous versus periodic review, and random versus fixed lead time.',
      'What changes under capacity limits, pack sizes, perishability, substitution, uncertain costs or non-normal heavy tails?',
    ],
    rubric: [
      { criterion: 'Cost-based decision', weak: 'Chooses mean demand or 95% by habit.', strong: 'Derives tau=8/13≈0.615, selects the smallest q with F(q)≥tau, and obtains q=60 under the stated single-period assumptions.' },
      { criterion: 'Numerical verification', weak: 'States an answer without checking both shortage and leftover costs.', strong: 'Computes costs 224, 116, 124.8 and 160 for q=40,60,68,100 and uses them to explain the decision rather than merely reciting a formula.' },
      { criterion: 'Lead-time and inventory position', weak: 'Uses daily standard deviation without scaling or orders because only 80 units are on the shelf.', strong: 'Computes mean lead-time demand 200, SD 24, reorder point about 239.48 (240 whole units), and IP=80+200−20=260, so no trigger under the stated policy.' },
      { criterion: 'Service-level interpretation', weak: 'Calls a 95% cycle-service target a 95% unit fill rate.', strong: 'Distinguishes no-stockout-cycle probability from fraction of units immediately served; recognizes expected shortage and order quantity matter for fill rate and lost-sales policies differ.' },
      { criterion: 'Assumptions and extensions', weak: 'Applies square-root lead-time scaling and the quantile formula unconditionally.', strong: 'States independence/normal approximation, adds lead-time variability or covariance when needed, protects L+R for periodic review, and optimizes feasible quantities under constraints.' },
    ],
    outline: [
      'Write C(q,D)=8(D−q)+ +5(q−D)+ and tau=8/(8+5). The CDF is .2 at 40 and .7 at 60, so 60 is the lower critical quantile.',
      'Explicitly enumerate each demand scenario. At q=60 the low-demand leftover contribution is .2×20×5=20 and high-demand shortage contribution is .3×40×8=96: total 116.',
      'For the separate fixed-L item, mean is 4×50=200 and independent daily errors give SD=sqrt(4)×12=24. Reorder point is 200+1.645×24≈239.48.',
      'Use IP=260, not physical shelf stock 80, to evaluate the reorder trigger. State whether policy is continuous (s,Q), (s,S), or periodic (R,S), and when arrivals occur.',
      'Discuss assumptions: iid daily increments, independent lead time if random, no unmodeled predictable mean shifts, and an appropriate tail approximation. For random L, Var(D_L)=E[L]σ²+Var(L)μ² under that model.',
      'For a three-day periodic review interval, protection becomes seven days: normal order-up-to target≈350+1.645×12×sqrt(7)≈402.23, rounded up to 403 if whole units and that service target apply. Costs may justify a different target.',
    ],
    twist: { prompt: 'The supplier sometimes delays deliveries precisely during demand surges. Can you still use E[L]σ²+Var(L)μ²?', answer: 'Not without checking the independence and iid assumptions. Demand and lead time are now related; conditioning on L changes the demand process. Estimate or simulate their joint distribution and the cumulative demand over the realized protection interval. With serial dependence even fixed-L variance includes cross-day covariance. Do not add marginal daily quantiles or substitute a convenient square-root rule for this risk.' },
  },
  {
    slug: 'research-policy', title: 'Better WAPE, worse stockouts: design the research', role: 'Research scientist · identification and experimentation', minutes: 45,
    brief: 'Original timed mock: a new forecasting model lowers reported WAPE by 10%, but a pilot has more stockouts and lower margin. The VP asks whether the model should be rolled out. Give a research plan that separates measurement failure, forecasting failure and decision-policy effects. Use 10 minutes to diagnose, 20 to design the study, and 15 to defend it. Rubric assessment is manual.',
    facts: [
      'The historical labels are recorded sales, not unconstrained demand. The pilot changes replenishment quantities and some promotional prices.',
      'High-volume staples dominate pooled WAPE; expensive intermittent spare parts and perishable goods have very different costs.',
      'Stores share warehouse stock, and customers substitute between nearby stores/products. Inventory can remain on hand for several weeks.',
      'A proposal would switch the new policy on and off every hour and use an ordinary independent-row t-test on daily forecast errors.',
    ],
    prompts: [
      'Give at least four testable explanations for lower WAPE but worse business outcomes and the evidence each requires.',
      'Define the decision/policy estimand and distinguish offline forecast comparison from a causal claim about replenishment or pricing.',
      'Design an ethical controlled evaluation: randomization unit, duration, carryover, interference, primary metric, guardrails and power.',
      'Explain how you would use historical data without pretending stockout demand or observational price elasticity is fully identified.',
      'What result would lead you to stop, revise or expand the rollout? How would you communicate an inconclusive result?',
    ],
    rubric: [
      { criterion: 'Diagnosis and measurement', weak: 'Assumes WAPE proves the model is better and blames operations without evidence.', strong: 'Tests bias, segment weighting, denominator/trend shifts, horizon mismatch, stockout censoring, pipeline timing and tail calibration against a fixed evaluation contract.' },
      { criterion: 'Identification', weak: 'Treats observational price coefficients or before/after differences as causal effects.', strong: 'Defines the policy estimand, separates forecast/ordering/price changes, recognizes censoring and endogeneity, and states overlap and identification assumptions for observational analysis.' },
      { criterion: 'Experimental design', weak: 'Uses hourly switchbacks despite weeks of inventory carryover or ignores shared-stock interference.', strong: 'Justifies store/warehouse/geographic cluster assignment or sufficiently long blocks/washout; addresses substitution, spillovers, pre-period balance and intention-to-treat.' },
      { criterion: 'Inference and power', weak: 'Counts correlated SKU-day rows as independent sample size and stops at the first favorable p-value.', strong: 'Pre-specifies a primary business outcome, practical effect threshold and analysis plan; powers on independent clusters/time structure and uses dependence-aware uncertainty with planned monitoring.' },
      { criterion: 'Research judgment and safeguards', weak: 'Demands rollout or rejection from an inconclusive pilot.', strong: 'Uses a falsifiable ablation, operational guardrails and stopping criteria; reports effect sizes/intervals, uncertainty, heterogeneous costs and a proportionate next experiment.' },
    ],
    outline: [
      'Freeze the comparison: same eligible series, dates, issue times and label definitions. Slice bias and error by horizon, availability, value, intermittency and perishability; verify the WAPE denominator has not changed the story.',
      'Audit whether sales fell because availability fell. Treat stockout observations as censored; request stockout timing and availability exposure, then use sensitivity bounds or a justified censored-demand model rather than inventing exact demand.',
      'Separate model quality from policy quality with an ablation and a faithfully timed inventory simulator. Offline replay has assumptions and is not causal proof when prices, availability or customer behavior respond to the policy.',
      'Define an intention-to-treat effect on contribution margin per assigned store/week, with fill rate, waste, availability and working-capital guardrails. Keep unrelated pricing changes fixed or randomize them in an adequately powered design.',
      'Choose assignment units that limit shared-inventory/substitution spillovers. Let the experiment span replenishment and carryover cycles; account for clustering and time dependence in power and analysis.',
      'Validate assignment/telemetry before interpretation, pre-specify primary comparisons, monitor safety and report intervals plus practical significance. An inconclusive result is not evidence of equivalence or automatic rollout permission.',
    ],
    twist: { prompt: 'Randomization is unavailable. A doubly robust estimator gives a positive policy effect. Does that solve the problem?', answer: 'No. Double robustness concerns certain nuisance-model misspecification under an identification framework; it does not eliminate unmeasured confounding, interference, poor overlap or censored outcomes. State the assumptions, inspect support, use suitable cross-fitting and dependence-aware inference, run sensitivity analyses and seek a credible source of exogenous variation. Present the result as conditional evidence, not a proven intervention effect.' },
  },
  {
    slug: 'cashflow-craft', title: 'Craft demo: a small-business cash-flow early warning', role: 'Intuit-aligned original practice · customer impact and technical depth', minutes: 60,
    brief: 'Original Intuit-aligned practice, not an authentic Intuit interview question or a guarantee of its interview format. Prepare a concise customer-first craft demonstration for a 28-day small-business cash-flow warning product. Use 15 minutes to outline, 15 to present aloud, 20 for technical challenge questions and 10 to self-score. Intuit’s public hiring guidance describes craft demonstrations and deeper discussions; confirm your actual process with your recruiter.',
    facts: [
      'An owner needs to know whether cash could fall below the next payroll obligation, not merely whether next month’s revenue forecast has low RMSE.',
      'Available data include transactions, invoices, due dates, scheduled payroll, bank balances and connection timestamps. Actual payment dates and final transaction categories may arrive or be revised later.',
      'Some businesses have sparse history, seasonal income and delayed bank feeds. Customers must understand uncertainty and have meaningful control over alerts and any suggested action.',
      'A sample business starts with $12,000 and owes $10,000 payroll in ten days. A $9,000 invoice is due in seven days, but historical payment timing varies. Other expenses continue during the horizon.',
      'The prototype is an informational warning, not an autonomous transfer or credit decision. Any future financing eligibility or personalized financial recommendation needs separate risk, compliance and product review.',
    ],
    prompts: [
      'State the customer problem and decision in one minute. What measurable benefit and potential harm would you prioritize?',
      'Design an as-of data contract and a baseline for receipt timing, outflows and projected cash balance. What information must be excluded at each forecast origin?',
      'How would you estimate the probability of crossing a cash threshold before payroll, preserving dependence between future days?',
      'Describe offline evaluation, cold-start fallback, interpretability and a safe product experiment. Separate prediction quality from whether alerts help customers.',
      'Present one result or original synthetic illustration, its limitations, an ownership/monitoring plan and a practical next step. Be explicit about what you personally built versus proposed.',
    ],
    rubric: [
      { criterion: 'Customer and decision clarity', weak: 'Leads with a model architecture and equates revenue accuracy with customer benefit.', strong: 'Frames a specific payroll/cash-shortfall decision, explains false-alert versus missed-warning costs, and defines customer-centered success and possible harm.' },
      { criterion: 'Data trust and leakage', weak: 'Uses realized future payment dates, final revised labels or stale bank balances without qualification.', strong: 'Uses versioned/as-of invoices and transactions, distinguishes due from actual paid dates, checks connection freshness, preserves missingness, and explains consent/access boundaries.' },
      { criterion: 'Probabilistic reasoning', weak: 'Adds daily marginal 95th percentiles or treats the invoice due date as a guaranteed receipt.', strong: 'Models uncertain receipt timing and outflows, generates coherent joint cash paths, estimates threshold-crossing risk, and evaluates calibration near customer-relevant horizons.' },
      { criterion: 'Evaluation and responsible delivery', weak: 'Claims accurate forecasts automatically make alerts beneficial or recommends autonomous financial action.', strong: 'Benchmarks temporal predictions, evaluates business/time slices and cold starts, designs an opt-in controlled alert study, monitors guardrails, and keeps financial actions outside the prototype’s authority.' },
      { criterion: 'Craft communication and ownership', weak: 'Overloads slides, invents results, or cannot distinguish personal work from team contributions.', strong: 'Tells a concise problem→evidence→decision story, shows a clear original/demo result, explains tradeoffs and limitations, names personal contributions, and answers technical challenges directly.' },
    ],
    outline: [
      'Open with the owner’s decision: “Can I meet payroll, and when should I review cash?” Define the horizon, threshold, warning lead time, expected usefulness and the cost of needless anxiety or a missed warning.',
      'Draw the as-of data boundary: current known cash, issued invoices and due dates, scheduled obligations, and transaction versions available then. Delay/revision flags and bank freshness affect whether a prediction should be shown.',
      'Start with scheduled outflows and empirical customer/segment payment-delay distributions; compare a calendar/seasonal baseline before a richer pooled model. Use an honest fallback for limited history rather than presenting false precision.',
      'Generate joint receipt/outflow paths and propagate cash_t=cash_0+cumulative inflows−cumulative outflows. Estimate P(min cash before payroll < threshold); the relevant event is a path crossing, not just the final-day mean.',
      'Backtest at historical origins with actual data availability. Measure receipt/cash forecast error, pinball and calibrated shortfall probabilities; slice by history length, business segment and feed freshness.',
      'Explain the alert with drivers, uncertainty and data freshness, and let the customer control it. Test whether opted-in warnings improve informed action with customer-value and harm guardrails; measure causal alert benefit separately from predictive accuracy.',
      'Close with a demonstrable original example, limitations, a decision log, fallback/incident owner, and the smallest safe next experiment. Do not claim an A+ outcome or represent practice material as employer-provided.',
    ],
    twist: { prompt: 'A product manager wants to automatically move money or offer credit whenever predicted shortfall probability exceeds 30%. What do you say?', answer: 'A calibrated risk estimate is not authorization or an approved financial policy. Keep this prototype informational and explain false positives, uncertain inputs and customer consequences. A new action requires explicit customer control/consent, risk and compliance review, appropriate eligibility/fairness safeguards, operational rollback and a separately evaluated decision policy. Do not infer that a single predictive threshold is appropriate for every customer or intervention.' },
  },
]

export const INTERVIEW_SOURCES: Record<string, { title: string; url: string }> = {
  'fpp-accuracy': { title: 'Forecasting: Principles and Practice · forecast accuracy (5.8)', url: 'https://otexts.com/fpp3/toolbox.html' },
  'fpp-tscv': { title: 'Forecasting: Principles and Practice · time-series cross-validation (5.10)', url: 'https://otexts.com/fpp3/toolbox.html' },
  'fpp-distribution': { title: 'Forecasting: Principles and Practice · distributional forecast accuracy (5.9)', url: 'https://otexts.com/fpp3/toolbox.html' },
  'fpp-arima': { title: 'Forecasting: Principles and Practice · ARIMA models', url: 'https://otexts.com/fpp3/arima.html' },
  'fpp-ets': { title: 'Forecasting: Principles and Practice · exponential smoothing', url: 'https://otexts.com/fpp3/exponential-smoothing.html' },
  'fpp-croston': { title: 'Forecasting: Principles and Practice · practical forecasting / intermittent demand (13.2)', url: 'https://otexts.com/fpp3/practical.html' },
  'fpp-hierarchy': { title: 'Forecasting: Principles and Practice · hierarchical forecasting', url: 'https://otexts.com/fpp3/hierarchical-forecasting.html' },
  'fpp-regression': { title: 'Forecasting: Principles and Practice · regression and future predictors', url: 'https://otexts.com/fpp3/regression.html' },
  'mit-newsvendor': { title: 'MIT OpenCourseWare · Single Period Inventory Models', url: 'https://ocw.mit.edu/courses/esd-260j-logistics-systems-fall-2006/755a26f6aaebae8928294146a2484cd4_lect14.pdf' },
  'mit-inventory': { title: 'MIT OpenCourseWare · Inventory Management: Probabilistic Demand', url: 'https://ocw.mit.edu/courses/esd-260j-logistics-systems-fall-2006/8b53c45fd26ffff706d815131e8d177e_lect11.pdf' },
  'mit-lost-sales': { title: 'MIT OpenCourseWare · More Probabilistic Demand', url: 'https://ocw.mit.edu/courses/esd-260j-logistics-systems-fall-2006/bc18dd1b2543535a61f826d00a8c6e42_lect12.pdf' },
  'sklearn-lagged': { title: 'scikit-learn · Lagged features for time series forecasting', url: 'https://scikit-learn.org/stable/auto_examples/applications/plot_time_series_lagged_features.html' },
  'athey-policy': { title: 'Athey & Wager · Policy Learning with Observational Data', url: 'https://arxiv.org/abs/1702.02896' },
  'intuit-hiring': { title: 'Intuit · Official hiring process', url: 'https://www.intuit.com/careers/hiring-process/' },
  'hyndman-wape': { title: 'Rob Hyndman · WAPE: Weighted Absolute Percentage Error', url: 'https://robjhyndman.com/hyndsight/wape.html' },
  'croston-models': { title: 'Shenstone & Hyndman · Stochastic Models Underlying Croston’s Method for Intermittent Demand Forecasting', url: 'https://robjhyndman.com/papers/croston.pdf' },
  'sba-bias': { title: 'Syntetos & Boylan · On the bias of intermittent demand estimates', url: 'https://www.sciencedirect.com/science/article/pii/S0925527300001432' },
  'sba-variance': { title: 'Syntetos & Boylan · On the variance of intermittent demand estimates', url: 'https://www.sciencedirect.com/science/article/pii/S0925527310002306' },
  'proper-scores': { title: 'Gneiting & Raftery · Strictly Proper Scoring Rules, Prediction, and Estimation', url: 'https://sites.stat.washington.edu/people/raftery/Research/PDF/Gneiting2007jasa.pdf' },
  'demand-censoring': { title: 'INSEAD · Demand Estimation and Ordering Under Censoring: Stock-Out Timing Is (Almost) All You Need', url: 'https://www.insead.edu/faculty-research/publications/journal-articles/demand-estimation-and-ordering-under-censoring-stock' },
  'price-endogeneity': { title: 'Besanko, Gupta & Jain · Logit Demand Estimation under Competitive Pricing Behavior', url: 'https://www.kellogg.northwestern.edu/academics-research/research/detail/1998/logit-demand-estimation-under-competitive-pricing-behavior-an-equilibrium/' },
  'switchback-design': { title: 'Bojinov, Simchi-Levi & Zhao · Design and Analysis of Switchback Experiments', url: 'https://arxiv.org/abs/2009.00148' },
  'experiment-srm': { title: 'Microsoft Research · Diagnosing Sample Ratio Mismatch in Online Controlled Experiments', url: 'https://www.microsoft.com/en-us/research/publication/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments-a-taxonomy-and-rules-of-thumb-for-practitioners/' },
  'forecast-comparison': { title: 'Diebold & Mariano · Comparing Predictive Accuracy', url: 'https://doi.org/10.1080/07350015.1995.10524599' },
}
