export interface ProjectSpec { slug: string; task: 'regression' | 'classification'; features: { name: string; label: string; unit: string; min: number; max: number }[]; title: string; target: string; description: string }
export const PROJECT_SPECS: Record<string, ProjectSpec> = {
  'price-a-home': { slug: 'price-a-home', title: 'House-price estimator', task: 'regression', target: 'Sale price ($1,000)', description: 'Fit a two-feature regression model, calibrate an interval on validation data, then measure untouched test error against the training-median baseline.', features: [{ name: 'area', label: 'Area', unit: 'sq ft', min: 500, max: 3000 }, { name: 'age', label: 'Home age', unit: 'years', min: 0, max: 50 }] },
  'catch-fraud': { slug: 'catch-fraud', title: 'Transaction review assistant', task: 'classification', target: 'Fraud label', description: 'Fit logistic regression and choose a review threshold on validation only: minimize 8×missed fraud + false alerts, within 40% review capacity. The synthetic sample is enriched—not the 0.3% real-world scenario in the brief.', features: [{ name: 'amount', label: 'Amount', unit: 'USD', min: 20, max: 2500 }, { name: 'velocity', label: 'Transactions in 1 hour', unit: 'count', min: 1, max: 20 }] },
  'keep-churn-healthy': { slug: 'keep-churn-healthy', title: 'Versioned churn monitor', task: 'classification', target: 'Churn label', description: 'Train a churn classifier, detect sustained input drift without calling it model failure, gate a candidate on labeled log loss, and test rollback to a preserved model.', features: [{ name: 'tenure', label: 'Customer tenure', unit: 'months', min: 1, max: 72 }, { name: 'tickets', label: 'Recent support tickets', unit: 'count', min: 0, max: 6 }] },
}
export function projectData(spec: ProjectSpec) {
  return Array.from({ length: 150 }, (_, id) => {
    const a = (id * 37 % 149) / 148, b = (id * 61 % 151) / 150
    const x = spec.features.map((f, j) => +(f.min + (f.max - f.min) * (j ? b : a)).toFixed(3))
    const noise = Math.sin(id * 2.31)
    const y = spec.task === 'regression' ? +(50 + .18 * x[0] - .7 * x[1] + 10 * noise).toFixed(3) : spec.slug === 'catch-fraud' ? Number(-6.5 + .0018 * x[0] + .28 * x[1] + .45 * noise > 0) : Number(-1.2 - .045 * x[0] + .9 * x[1] + .6 * noise > 0)
    return { id, period: id + 1, split: id < 90 ? 'train' : id < 120 ? 'validation' : 'test', x, y }
  })
}
const training = (classification: boolean) => `import math

def fit_model(X_train, y_train):
    # Fit preprocessing only on training rows. Constant columns use scale 1.
    n, d = len(X_train), len(X_train[0])
    means = [sum(row[j] for row in X_train) / n for j in range(d)]
    scales = [(sum((row[j]-means[j])**2 for row in X_train)/n)**0.5 or 1.0 for j in range(d)]
    Z = [[(row[j]-means[j])/scales[j] for j in range(d)] for row in X_train]
    weights, bias = [0.0]*d, ${classification ? '0.0' : 'sum(y_train)/n'}
    for epoch in range(700):
        scores = [bias + sum(w*z for w,z in zip(weights,row)) for row in Z]
        predictions = ${classification ? '[1/(1+math.exp(-max(-30,min(30,s)))) for s in scores]' : 'scores'}
        # TODO: residual = prediction minus actual, one per training row.
        errors = [0.0 for _ in y_train]
        # The averaged gradient updates all parameters simultaneously.
        gradient = [sum(errors[i]*Z[i][j] for i in range(n))/n for j in range(d)]
        weights = [w - 0.12*g for w,g in zip(weights,gradient)]
        bias -= 0.12*sum(errors)/n
    return dict(weights=weights, bias=bias, means=means, scales=scales)

def predict(model, rows):
    result = []
    for row in rows:
        score = model['bias'] + sum(w*(x-m)/s for w,x,m,s in zip(model['weights'],row,model['means'],model['scales']))
        result.append(${classification ? '1/(1+math.exp(-max(-30,min(30,score))))' : 'score'})
    return result
`
const extras: Record<string, string> = {
  'price-a-home': `
def calibrate_interval(actual, predictions):
    # Return the 90th-percentile absolute validation residual, using the
    # finite-sample rank ceil((n+1)*0.90), capped at n (one-based).
    raise NotImplementedError("Sort absolute residuals; return the rank above")
`,
  'catch-fraud': `
def choose_threshold(actual, probabilities):
    # Candidates 0.05,0.10,...,0.95,1.00. Keep review share <= 0.40.
    # Minimize 8*false_negatives + false_positives; ties choose LOWER threshold.
    # Threshold 1.00 produces no alerts because probabilities are < 1.
    raise NotImplementedError("Evaluate each policy on validation labels only")
`,
  'keep-churn-healthy': `
def monitor(reference, recent, previous_windows):
    # Max absolute mean shift in reference-standard-deviation units.
    # >0.8: 'watch' on the first window, 'investigate' after >=1 prior
    # shifted window. Otherwise 'stable'. Input drift is not label failure.
    raise NotImplementedError("Compute reference scales and live mean shifts")

def accept_candidate(incumbent_loss, candidate_loss):
    # Require finite, nonnegative log loss and at least 5% improvement.
    raise NotImplementedError("Compare candidate against incumbent")

def select_version(registry, version):
    # Return the preserved artifact. Unknown versions must raise KeyError.
    raise NotImplementedError("Look up the requested version")
`,
}
const solutions: Record<string, string> = {
  'price-a-home': `
def calibrate_interval(actual, predictions):
    residuals = sorted(abs(y-p) for y,p in zip(actual,predictions))
    rank = min(len(residuals), math.ceil((len(residuals)+1)*0.90))
    return residuals[rank-1]
`,
  'catch-fraud': `
def choose_threshold(actual, probabilities):
    candidates = []
    for i in range(1,21):
        threshold = i/20
        alerts = [p >= threshold for p in probabilities]
        if sum(alerts)/len(alerts) <= 0.40:
            fn = sum(y == 1 and not a for y,a in zip(actual,alerts))
            fp = sum(y == 0 and a for y,a in zip(actual,alerts))
            candidates.append((8*fn+fp, threshold))
    return min(candidates)[1]
`,
  'keep-churn-healthy': `
def monitor(reference, recent, previous_windows):
    d = len(reference[0])
    means = [sum(r[j] for r in reference)/len(reference) for j in range(d)]
    scales = [(sum((r[j]-means[j])**2 for r in reference)/len(reference))**0.5 or 1 for j in range(d)]
    shift = max(abs(sum(r[j] for r in recent)/len(recent)-means[j])/scales[j] for j in range(d))
    return ('investigate' if previous_windows >= 1 else 'watch') if shift > 0.8 else 'stable'

def accept_candidate(incumbent_loss, candidate_loss):
    return math.isfinite(incumbent_loss) and incumbent_loss >= 0 and math.isfinite(candidate_loss) and 0 <= candidate_loss <= incumbent_loss*0.95

def select_version(registry, version):
    return registry[version]
`,
}
export const projectStarter = (spec: ProjectSpec) => training(spec.task === 'classification') + extras[spec.slug]
export const projectSolution = (spec: ProjectSpec) => training(spec.task === 'classification').replace('errors = [0.0 for _ in y_train]', 'errors = [p-y for p,y in zip(predictions,y_train)]') + solutions[spec.slug]

export interface FittedModel { weights: number[]; bias: number; means: number[]; scales: number[] }
export interface ProjectArtifact { version: 1; slug: string; model: FittedModel; metrics: Record<string, number>; threshold: number; interval: number; vectors: { x: number[]; prediction: number }[]; checks: string[] }
export function predictArtifact(spec: ProjectSpec, model: FittedModel, x: number[]) {
  if (x.length !== spec.features.length || !x.every(Number.isFinite)) throw new Error('Enter a finite number for every feature.')
  const score = model.bias + model.weights.reduce((sum, w, i) => sum + w * (x[i] - model.means[i]) / model.scales[i], 0)
  return spec.task === 'regression' ? score : 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, score))))
}
export function validateArtifact(spec: ProjectSpec, value: unknown): ProjectArtifact {
  const a = value as ProjectArtifact, d = spec.features.length
  if (!a || a.version !== 1 || a.slug !== spec.slug || !a.model || !Number.isFinite(a.model.bias) || !['weights', 'means', 'scales'].every(k => { const v = a.model[k as 'weights']; return Array.isArray(v) && v.length === d && v.every(Number.isFinite) }) || a.model.scales.some(s => s <= 0)) throw new Error('Invalid fitted model. Check its dimensions and finite preprocessing values.')
  if (!Number.isFinite(a.threshold) || a.threshold < 0 || a.threshold > 1 || !Number.isFinite(a.interval) || a.interval < 0 || !a.metrics || !Object.values(a.metrics).every(v => Number.isFinite(v) && v >= 0) || !Array.isArray(a.vectors) || a.vectors.length < 3 || !Array.isArray(a.checks) || a.checks.length < 3 || !a.checks.every(c => typeof c === 'string' && c.length > 0)) throw new Error('Evaluation report is incomplete.')
  const required = spec.task === 'regression' ? ['test_mae', 'baseline_mae', 'test_interval_coverage', 'interval_radius'] : ['test_log_loss', 'baseline_log_loss', 'test_precision', 'test_recall', 'test_review_share', 'true_positive', 'false_positive', 'false_negative', 'true_negative', ...(spec.slug === 'catch-fraud' ? ['validation_review_share'] : ['validation_log_loss', 'rejected_candidate_validation_log_loss'])]
  if (!required.every(k => Number.isFinite(a.metrics[k]) && a.metrics[k] >= 0) || Object.entries(a.metrics).some(([k, v]) => /coverage|precision|recall|share|threshold/.test(k) && v > 1)) throw new Error('Missing or invalid project metrics.')
  if (!a.vectors.every(v => Number.isFinite(v.prediction) && Math.abs(predictArtifact(spec, a.model, v.x) - v.prediction) < 1e-6)) throw new Error('Python predictions do not match the exported model. Keep predict() consistent with the artifact.')
  return a
}

export function projectHarness(spec: ProjectSpec) {
  // Training code receives no held-out rows. This is a learning exercise, not an
  // adversarial examination; learners can inspect the versioned dataset export.
  return `import math, copy, json
rows = json.loads(${JSON.stringify(JSON.stringify(projectData(spec)))})
task, slug = ${JSON.stringify(spec.task)}, ${JSON.stringify(spec.slug)}
train, validation, test = [[r for r in rows if r['split']==split] for split in ['train','validation','test']]
X, y = [r['x'] for r in train], [r['y'] for r in train]
fit, predict = learner['fit_model'], learner['predict']
original = copy.deepcopy((X,y))
model = fit(X,y)
assert (X,y)==original, 'Do not modify training inputs'
d = len(X[0])
def finite(v): return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
assert isinstance(model,dict) and finite(model.get('bias')), 'Return a finite model bias'
for field in ['weights','means','scales']:
    assert len(model.get(field,[]))==d and all(finite(v) for v in model[field]), 'Model dimensions/values: '+field
assert all(s>0 for s in model['scales']), 'Scales must be positive'
expected_means = [sum(r[j] for r in X)/len(X) for j in range(d)]
expected_scales = [(sum((r[j]-expected_means[j])**2 for r in X)/len(X))**0.5 or 1 for j in range(d)]
assert all(abs(a-b)<1e-7 for a,b in zip(model['means'],expected_means)), 'Means must be fitted on training rows only'
assert all(abs(a-b)<1e-7 for a,b in zip(model['scales'],expected_scales)), 'Use population training standard deviations'
def independent(m, xs):
    scores = [m['bias']+sum(w*(x-mu)/s for w,x,mu,s in zip(m['weights'],r,m['means'],m['scales'])) for r in xs]
    return scores if task=='regression' else [1/(1+math.exp(-max(-30,min(30,s)))) for s in scores]
def checked_predict(m, xs):
    original_m, original_x = copy.deepcopy(m), copy.deepcopy(xs)
    p = predict(m,xs)
    assert m==original_m and xs==original_x, 'Prediction must not mutate model or rows'
    assert len(p)==len(xs) and all(finite(v) for v in p), 'Return one finite prediction per row'
    assert all(abs(a-b)<1e-6 for a,b in zip(p,independent(m,xs))), 'predict must match the serialized model'
    if task!='regression': assert all(0<v<1 for v in p), 'Return probabilities, not hard labels'
    return p
v_y, t_y = [r['y'] for r in validation], [r['y'] for r in test]
v_p, t_p = checked_predict(model,[r['x'] for r in validation]), checked_predict(model,[r['x'] for r in test])
# A second fit checks learning, changing targets, and constant-column handling.
probe_x = [[i,7] for i in range(12)]
probe_y = [2*i+3 for i in range(12)] if task=='regression' else [int(i>=6) for i in range(12)]
probe = fit(copy.deepcopy(probe_x),list(probe_y))
assert all(finite(s) and s>0 for s in probe['scales']) and probe['scales'][1]==1, 'Constant columns use scale 1'
probe2_y = [v+10 for v in probe_y] if task=='regression' else [1-v for v in probe_y]
probe2 = fit(copy.deepcopy(probe_x),probe2_y)
p1,p2 = checked_predict(probe,probe_x),checked_predict(probe2,probe_x)
assert max(abs(a-b) for a,b in zip(p1,p2)) > (5 if task=='regression' else .5), 'The model must learn from changed labels'
threshold, interval = .5, 0.0
metrics = {}
checks = ['Training-only preprocessing and immutable inputs', 'Finite learned parameters, constant features, changed labels', 'Python / portable inference parity']
def mae(ys,ps): return sum(abs(y-p) for y,p in zip(ys,ps))/len(ys)
def logloss(ys,ps): return -sum(y*math.log(max(1e-12,p))+(1-y)*math.log(max(1e-12,1-p)) for y,p in zip(ys,ps))/len(ys)
if task=='regression':
    baseline = sorted(y)[len(y)//2-1:len(y)//2+1]
    baseline = sum(baseline)/len(baseline)
    metrics = {'test_mae':mae(t_y,t_p), 'baseline_mae':mae(t_y,[baseline]*len(t_y))}
    assert metrics['test_mae'] < metrics['baseline_mae']*.5, 'Beat the median baseline by at least 50% MAE'
    interval = learner['calibrate_interval'](v_y,v_p)
    residuals = sorted(abs(y-p) for y,p in zip(v_y,v_p))
    expected = residuals[min(len(residuals),math.ceil((len(residuals)+1)*.9))-1]
    assert finite(interval) and abs(interval-expected)<1e-6, 'Use the validation-only 90% residual rank'
    assert learner['calibrate_interval']([0,2,4],[0,0,0])==4, 'Small-sample interval rank must be capped at n'
    metrics['test_interval_coverage'] = sum(abs(y-p)<=interval for y,p in zip(t_y,t_p))/len(t_y)
    metrics['interval_radius'] = interval
    checks.append('Validation-calibrated interval; held-out MAE and coverage')
else:
    base = sum(y)/len(y)
    metrics = {'test_log_loss':logloss(t_y,t_p), 'baseline_log_loss':logloss(t_y,[base]*len(t_y))}
    assert metrics['test_log_loss'] < metrics['baseline_log_loss']*.8, 'Beat the constant-rate baseline by at least 20% log loss'
    if slug=='catch-fraud':
        def expected_threshold(ys,ps):
            choices=[]
            for i in range(1,21):
                t=i/20; alerts=[p>=t for p in ps]
                if sum(alerts)/len(alerts)<=.4:
                    choices.append((8*sum(y and not a for y,a in zip(ys,alerts))+sum(not y and a for y,a in zip(ys,alerts)),t))
            return min(choices)[1]
        threshold = learner['choose_threshold'](list(v_y),list(v_p))
        assert abs(threshold-expected_threshold(v_y,v_p))<1e-9, 'Choose the lowest-cost capacity-feasible validation threshold; tie goes lower'
        for ys,ps in [([0]*5,[.1,.2,.3,.4,.5]),([1,0,1,0,0],[.8,.8,.2,.1,.1]),([1,1],[.8,.9])]:
            assert abs(learner['choose_threshold'](ys,ps)-expected_threshold(ys,ps))<1e-9, 'Threshold edge case: ties, no positives, or capacity'
        metrics['validation_review_share']=sum(p>=threshold for p in v_p)/len(v_p)
        checks.append('Validation-only cost and capacity policy + edge cases')
    else:
        monitor = learner['monitor']
        shifted=[[x+2*s for x,s in zip(row,model['scales'])] for row in X]
        assert monitor(copy.deepcopy(X),copy.deepcopy(X),0)=='stable', 'Healthy window must stay stable'
        assert monitor(copy.deepcopy(X),copy.deepcopy(shifted),0)=='watch', 'One shifted window is a watch'
        assert monitor(copy.deepcopy(X),copy.deepcopy(shifted),1)=='investigate', 'Sustained input drift means investigate, not automatic rollback'
        assert monitor(copy.deepcopy(X),copy.deepcopy(X),2)=='stable', 'Healthy data clears the consecutive-drift count'
        gate=learner['accept_candidate']
        assert gate(.5,.4) and gate(.5,.475) and not gate(.5,.49) and not gate(.5,float('nan')) and not gate(float('inf'),.1) and not gate(float('nan'),.1) and not gate(.5,-.1), 'Candidate gate requires finite nonnegative loss and 5% improvement'
        bad=copy.deepcopy(model); bad['weights']=[-w for w in model['weights']]; bad['bias']=-model['bias']
        validation_loss=logloss(v_y,v_p)
        bad_loss=logloss(v_y,independent(bad,[r['x'] for r in validation]))
        assert not gate(validation_loss,bad_loss), 'Reject the degraded labeled candidate'
        registry={'stable-v1':copy.deepcopy(model),'candidate-v2':bad}
        restored=learner['select_version'](registry,'stable-v1')
        assert checked_predict(restored,[r['x'] for r in test])==t_p, 'Rollback must restore incumbent predictions'
        try: learner['select_version'](registry,'missing')
        except KeyError: pass
        else: raise AssertionError('Unknown model version must raise KeyError')
        metrics['rejected_candidate_validation_log_loss']=bad_loss
        metrics['validation_log_loss']=validation_loss
        checks.append('Healthy/transient/sustained drift, rejected candidate, exact rollback')
    alerts=[p>=threshold for p in t_p]
    tp=sum(y and a for y,a in zip(t_y,alerts)); fp=sum(not y and a for y,a in zip(t_y,alerts)); fn=sum(y and not a for y,a in zip(t_y,alerts)); tn=len(t_y)-tp-fp-fn
    metrics.update(test_precision=tp/(tp+fp) if tp+fp else 0, test_recall=tp/(tp+fn) if tp+fn else 0, true_positive=tp,false_positive=fp,false_negative=fn,true_negative=tn,test_review_share=sum(alerts)/len(alerts),threshold=threshold)
artifact = dict(version=1,slug=slug,model=model,metrics=metrics,threshold=threshold,interval=interval,vectors=[dict(x=r['x'],prediction=p) for r,p in zip(test[:5],t_p[:5])],checks=checks)
json.dumps(artifact,allow_nan=False)
print('PASS: '+str(len(train))+' train / '+str(len(validation))+' validation / '+str(len(test))+' held-out test rows')
for check in checks: print('✓ '+check)
`
}
