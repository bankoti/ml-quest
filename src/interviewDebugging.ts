// Original review exercise. The specimens are pseudocode, not an executable model.
export const BACKTEST_DEBUGGING = {
  title: 'Debug the backtest that looks too good',
  contract: [
    'You issue one horizon-7 demand forecast per existing SKU after the close of day o: its target is units on day o+7. Compare a direct regression with a recursive one-step baseline issued at that same cutoff.',
    'The offline panel has one row per SKU per calendar day, no gaps, and nonnegative units. Every day d is finalized at the close of d+2; available_day=d+2. There are no revisions. At cutoff o, only outcomes with available_day≤o are usable. The scorer may read later outcomes, but feature construction, fitting, and prediction may not.',
    'For each historical training origin t, construct features from the information that existed at t—not from the newest version available at o. At least seven finalized demand days are required for a feature row. Fit preprocessing only on eligible training features. An earlier forecast’s outcome may be used at a later origin once it becomes available.',
    'Use o=28 for the hand trace. Keep all forecasts fixed after issuance, evaluate both methods on the same SKU/day targets, and reserve a later final period after choosing the procedure on validation origins.',
  ],
  flawed: `# Deliberately faulty pandas-style pseudocode. Do not copy into a model.
rows = panel.sort_values(["sku", "day"])
g = rows.groupby("sku")["units"]
rows["lag1"] = g.shift(1)
rows["mean7"] = g.transform(lambda y: y.rolling(7).mean())
rows["target7"] = g.shift(-7)
rows = rows.dropna(subset=["lag1", "mean7", "target7"])
X = StandardScaler().fit_transform(rows[["lag1", "mean7"]])
train = rows.day <= origin
model.fit(X[train], rows.loc[train, "target7"])
direct7 = model.predict(X[rows.day == origin])

# For each SKU, compare with this supposedly fixed-origin baseline:
state = units[sku, origin]
for h in range(1, 8):
    baseline[h] = one_step(state)
    state = units[sku, origin + h]
score_same_target(direct7, baseline[7], units[sku, origin + 7])`,
  tasks: [
    'Spend 15 minutes marking every place the procedure reads unavailable information. Separate feature leakage, training-label eligibility, fitted preprocessing, and the baseline’s issuance contract.',
    'Spend 20 minutes writing repaired pseudocode. At o=28, name the latest usable outcome day, the seven days in the prediction feature window, the latest eligible training origin, and that row’s target day.',
    'Spend 15 minutes specifying adversarial tests: change unavailable outcomes, change another SKU, and change only final-period data. State exactly which outputs must remain unchanged and which may legitimately change.',
    'Use the last 10 minutes to defend your repair, then reveal the guide. Explain why leakage invalidates deployment-matched evidence without claiming that every individual leak necessarily lowers measured error.',
  ],
  repairs: [
    'Features: at origin t, the latest finalized outcome is day t−2. Use that as the latest-available lag, and average days t−8 through t−2 inclusive. The supplied lag reads t−1, and the rolling window reads through t; both violate the two-day reporting delay. Grouping correctly by SKU does not fix time leakage.',
    'Labels: a horizon-7 training target from origin t occurs on t+7 and becomes usable on t+9. At fitting cutoff o require t+9≤o, not just t≤o. For o=28, the latest training origin is 19, with target day 26 available on day 28. Its historical features still end on day 17.',
    'Preprocessing: build all eligible training feature rows first and fit the scaler only to those rows. Apply that fitted scaler unchanged to the origin-o features. Full-panel fitting lets validation/final periods influence the feature transformation even though it does not use labels directly.',
    'Fixed-origin baseline: start from the latest known outcome, day o−2. With a fitted, one-step transition fixed at cutoff o, recursively predict nine transitions to reach o+7; this includes two nowcast steps for the unfinalized days o−1 and o. Feed predictions back, never realized post-cutoff outcomes. If you instead refresh the baseline as data arrive, evaluate a different issuance policy and label it accordingly.',
  ],
  corrected: `# Pseudocode: feature_at(sku,t) reads only that SKU's outcomes
# available at t; latest = units[t-2], mean7 = mean(units[t-8:t-2]).
# Bounds above are inclusive; skip rows without all seven observations.
for origin in validation_origins:
    train = []
    for sku, t in historical_candidate_origins:
        if t + 9 <= origin and feature_window_is_complete(sku, t):
            train.append((feature_at(sku, t), units[sku, t + 7]))
    scaler.fit(training_features(train))
    model.fit(scaler.transform(training_features(train)), targets(train))
    # Fit any parameters of one_step only from transitions finalized by origin.
    for sku in eligible_skus:
        direct7 = model.predict(scaler.transform(feature_at(sku, origin)))
        state = units[sku, origin - 2]
        for day in range(origin - 1, origin + 8):  # nine transitions
            state = one_step(state)
        save_forecasts(origin, sku, direct7, state)
# Only the scorer now reads target-day actuals; selection uses validation.
# Freeze the procedure before running an untouched later final evaluation.`,
  trace: 'At o=28: latest usable outcome=26; prediction mean window=days 20–26; latest training origin=19; its target=day 26 and its feature window=days 11–17. The recursive baseline starts at day 26 and predicts days 27 through 35, nine transitions. If one_step(x)=x+1 and units on day 26=10, the horizon-7 forecast is 19, not 17.',
  probes: [
    'Unavailable-outcome perturbation: change units on days 27 and later, keeping all earlier data and the cutoff fixed at 28. Training/scaler state and both issued forecasts must remain identical. The day-35 actual and scored errors may change. A later origin may legitimately change once those outcomes are available.',
    'Historical-snapshot test: changing day t−1 must not change feature_at(sku,t), even if that value is available at the eventual model-fitting cutoff. Changing a required day t−2 may change it. Test the exact boundary, not merely whether the code uses shift().',
    'Entity isolation: with fitted model/scaler held fixed, changing SKU B must not alter SKU A’s feature row or prediction. Refitting a global model on changed, eligible B history may legitimately change A’s prediction; do not demand invariance to shared training evidence.',
    'Final-period isolation: change only final-period outcomes strictly after the last validation target day; start final evaluation only after all validation labels needed for selection are available. Validation fits, forecasts, scores, and the selected procedure must remain unchanged. Changing a validation target after its forecast origin may change validation scores and selection, so that is a different test. Final-period errors may change.',
  ],
}
