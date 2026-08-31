import { useMemo, useState } from 'react'

type Task = 'regression' | 'classification'
type NumericRow = Record<string, number>

interface Dataset {
  id: string
  name: string
  description: string
  columns: string[]
  rows: NumericRow[]
  feature: string
  target: string
  task: Task
}

interface ExperimentResult {
  task: Task
  trainCount: number
  testCount: number
  modelLabel: string
  primaryName: string
  primary: number
  baseline: number
  metrics: Array<{ label: string; value: string; note: string }>
  points: Array<{ x: number; y: number; prediction: number; split: 'train' | 'test' }>
  line?: { start: number; end: number }
  threshold?: number
}

const homeRows = Array.from({ length: 42 }, (_, index) => {
  const area = 720 + (index * 137) % 2380
  const bedrooms = 1 + (index * 3) % 5
  const age = (index * 11) % 58
  const distance = 1 + (index * 7) % 29
  const noise = ((index * 19) % 17 - 8) * 3.4
  return { area_sqft: area, bedrooms, age_years: age, distance_km: distance, price_k: Math.round(88 + area * .21 + bedrooms * 17 - age * 1.15 - distance * 3.2 + noise) }
})

const churnRows = Array.from({ length: 48 }, (_, index) => {
  const tenure = 1 + (index * 7) % 60
  const spend = 18 + (index * 13) % 105
  const tickets = (index * 5) % 9
  const usage = 2 + (index * 11) % 29
  const risk = tickets * 1.25 + spend / 42 - tenure / 18 - usage / 11 + ((index * 17) % 9 - 4) * .14
  return { tenure_months: tenure, monthly_spend: spend, support_tickets: tickets, usage_days: usage, churn: risk > 5.25 ? 1 : 0 }
})

export const BUILT_INS: Dataset[] = [
  { id: 'homes', name: 'Metro homes', description: 'Estimate sale price from size, rooms, age, and distance.', columns: ['area_sqft', 'bedrooms', 'age_years', 'distance_km', 'price_k'], rows: homeRows, feature: 'area_sqft', target: 'price_k', task: 'regression' },
  { id: 'churn', name: 'Subscription churn', description: 'Find customers at risk from behavior and support signals.', columns: ['tenure_months', 'monthly_spend', 'support_tickets', 'usage_days', 'churn'], rows: churnRows, feature: 'support_tickets', target: 'churn', task: 'classification' },
]

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const formatMetric = (value: number, digits = 2) => Number.isFinite(value) ? value.toFixed(digits) : '—'

function splitRows(rows: NumericRow[], trainShare: number) {
  const shuffled = rows.map((row, index) => ({ row, order: (index * 9301 + 49297) % 233280 })).sort((a, b) => a.order - b.order).map(item => item.row)
  const trainCount = clamp(Math.round(shuffled.length * trainShare / 100), 2, Math.max(2, shuffled.length - 2))
  return { train: shuffled.slice(0, trainCount), test: shuffled.slice(trainCount) }
}

function classificationMetrics(actual: number[], predicted: number[]) {
  let tp = 0; let fp = 0; let tn = 0; let fn = 0
  actual.forEach((value, index) => {
    if (value === 1 && predicted[index] === 1) tp += 1
    else if (value === 0 && predicted[index] === 1) fp += 1
    else if (value === 0 && predicted[index] === 0) tn += 1
    else fn += 1
  })
  const precision = tp / Math.max(tp + fp, 1)
  const recall = tp / Math.max(tp + fn, 1)
  return { accuracy: (tp + tn) / Math.max(actual.length, 1), precision, recall, f1: 2 * precision * recall / Math.max(precision + recall, Number.EPSILON) }
}

export function runExperiment(rows: NumericRow[], feature: string, target: string, task: Task, trainShare: number): ExperimentResult | null {
  const valid = rows.filter(row => Number.isFinite(row[feature]) && Number.isFinite(row[target]))
  if (valid.length < 8 || feature === target) return null
  const { train, test } = splitRows(valid, trainShare)
  const xTrain = train.map(row => row[feature])
  const yTrain = train.map(row => row[target])
  const xTest = test.map(row => row[feature])
  const yTest = test.map(row => row[target])

  if (task === 'regression') {
    const xMean = mean(xTrain); const yMean = mean(yTrain)
    const denominator = xTrain.reduce((sum, value) => sum + (value - xMean) ** 2, 0)
    const slope = denominator ? xTrain.reduce((sum, value, index) => sum + (value - xMean) * (yTrain[index] - yMean), 0) / denominator : 0
    const intercept = yMean - slope * xMean
    const predict = (value: number) => intercept + slope * value
    const predictions = xTest.map(predict)
    const mae = mean(predictions.map((value, index) => Math.abs(value - yTest[index])))
    const rmse = Math.sqrt(mean(predictions.map((value, index) => (value - yTest[index]) ** 2)))
    const testMean = mean(yTest)
    const r2Denominator = yTest.reduce((sum, value) => sum + (value - testMean) ** 2, 0)
    const r2 = r2Denominator ? 1 - predictions.reduce((sum, value, index) => sum + (value - yTest[index]) ** 2, 0) / r2Denominator : 0
    const baseline = mean(yTest.map(value => Math.abs(value - yMean)))
    const allX = valid.map(row => row[feature]); const minX = Math.min(...allX); const maxX = Math.max(...allX)
    return {
      task, trainCount: train.length, testCount: test.length, modelLabel: `ŷ = ${formatMetric(intercept)} + ${formatMetric(slope)}x`, primaryName: 'MAE', primary: mae, baseline,
      metrics: [
        { label: 'Test MAE', value: formatMetric(mae, 1), note: 'Typical absolute miss' },
        { label: 'Baseline MAE', value: formatMetric(baseline, 1), note: 'Predict the train mean' },
        { label: 'Test RMSE', value: formatMetric(rmse, 1), note: 'Punishes large misses' },
        { label: 'Test R²', value: formatMetric(r2), note: 'Variance explained' },
      ],
      points: [...train.map(row => ({ x: row[feature], y: row[target], prediction: predict(row[feature]), split: 'train' as const })), ...test.map(row => ({ x: row[feature], y: row[target], prediction: predict(row[feature]), split: 'test' as const }))],
      line: { start: predict(minX), end: predict(maxX) },
    }
  }

  const labelsTrain = yTrain.map(value => value > 0 ? 1 : 0)
  const labelsTest = yTest.map(value => value > 0 ? 1 : 0)
  const sorted = [...new Set(xTrain)].sort((a, b) => a - b)
  const candidates = sorted.flatMap((value, index) => index ? [(value + sorted[index - 1]) / 2] : [value])
  let best = { threshold: candidates[0], direction: 1, f1: -1, accuracy: -1 }
  for (const threshold of candidates) for (const direction of [1, -1]) {
    const predictions = xTrain.map(value => direction === 1 ? Number(value >= threshold) : Number(value <= threshold))
    const metrics = classificationMetrics(labelsTrain, predictions)
    if (metrics.f1 > best.f1 || (metrics.f1 === best.f1 && metrics.accuracy > best.accuracy)) best = { threshold, direction, f1: metrics.f1, accuracy: metrics.accuracy }
  }
  const predict = (value: number) => best.direction === 1 ? Number(value >= best.threshold) : Number(value <= best.threshold)
  const predictions = xTest.map(predict)
  const metrics = classificationMetrics(labelsTest, predictions)
  const majority = mean(labelsTrain) >= .5 ? 1 : 0
  const baselineMetrics = classificationMetrics(labelsTest, labelsTest.map(() => majority))
  return {
    task, trainCount: train.length, testCount: test.length, modelLabel: `Predict 1 when x ${best.direction === 1 ? '≥' : '≤'} ${formatMetric(best.threshold)}`, primaryName: 'F1', primary: metrics.f1, baseline: baselineMetrics.f1,
    metrics: [
      { label: 'Test F1', value: formatMetric(metrics.f1), note: 'Precision–recall balance' },
      { label: 'Baseline F1', value: formatMetric(baselineMetrics.f1), note: 'Predict the majority' },
      { label: 'Precision', value: formatMetric(metrics.precision), note: 'Trust in positive alerts' },
      { label: 'Recall', value: formatMetric(metrics.recall), note: 'Positive cases found' },
    ],
    points: [...train.map(row => ({ x: row[feature], y: Number(row[target] > 0), prediction: predict(row[feature]), split: 'train' as const })), ...test.map(row => ({ x: row[feature], y: Number(row[target] > 0), prediction: predict(row[feature]), split: 'test' as const }))],
    threshold: best.threshold,
  }
}

function parseCsvLine(line: string) {
  const cells: string[] = []; let cell = ''; let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"' && quoted && line[index + 1] === '"') { cell += '"'; index += 1 }
    else if (character === '"') quoted = !quoted
    else if (character === ',' && !quoted) { cells.push(cell.trim()); cell = '' }
    else cell += character
  }
  cells.push(cell.trim())
  return cells
}

export function parseCsv(text: string, fileName: string): Dataset {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 9) throw new Error('Use a CSV with a header and at least eight data rows.')
  const headers = parseCsvLine(lines[0]).map((header, index) => header || `column_${index + 1}`)
  const raw = lines.slice(1, 501).map(parseCsvLine)
  const numericColumns = headers.filter((_, column) => raw.every(row => row[column] !== '' && Number.isFinite(Number(row[column]))))
  if (numericColumns.length < 2) throw new Error('The playground needs at least two fully numeric columns.')
  const rows = raw.map(values => Object.fromEntries(numericColumns.map(column => [column, Number(values[headers.indexOf(column)])])))
  return { id: `upload-${Date.now()}`, name: fileName.replace(/\.csv$/i, ''), description: 'Local CSV · processed only in this browser', columns: numericColumns, rows, feature: numericColumns[0], target: numericColumns[numericColumns.length - 1], task: 'regression' }
}

function Plot({ result, feature, target }: { result: ExperimentResult; feature: string; target: string }) {
  const xValues = result.points.map(point => point.x); const yValues = result.points.map(point => point.y)
  const minX = Math.min(...xValues); const maxX = Math.max(...xValues); const minY = Math.min(...yValues); const maxY = Math.max(...yValues)
  const x = (value: number) => 8 + (value - minX) / Math.max(maxX - minX, 1) * 84
  const y = (value: number) => 88 - (value - minY) / Math.max(maxY - minY, 1) * 76
  return <div className="playground-plot"><div className="plot-title"><span>{target} ↑</span><b>{result.modelLabel}</b></div><svg viewBox="0 0 100 100" role="img" aria-label={`${target} by ${feature} with fitted model`} preserveAspectRatio="none"><line className="plot-axis" x1="7" y1="89" x2="94" y2="89"/><line className="plot-axis" x1="7" y1="8" x2="7" y2="89"/>{result.line && <line className="fit-line" x1={x(minX)} y1={y(result.line.start)} x2={x(maxX)} y2={y(result.line.end)}/>} {result.threshold !== undefined && <line className="fit-line threshold" x1={x(result.threshold)} y1="8" x2={x(result.threshold)} y2="89"/>}{result.points.map((point, index) => <circle key={index} className={`${point.split} class-${point.y > 0 ? 1 : 0}`} cx={x(point.x)} cy={y(point.y)} r={point.split === 'test' ? 2.2 : 1.55}/>)}</svg><div className="plot-legend"><span><i className="train"/> train</span><span><i className="test"/> hidden test</span><b>{feature} →</b></div></div>
}

export function Playground() {
  const [dataset, setDataset] = useState<Dataset>(BUILT_INS[0])
  const [feature, setFeature] = useState(dataset.feature)
  const [target, setTarget] = useState(dataset.target)
  const [task, setTask] = useState<Task>(dataset.task)
  const [trainShare, setTrainShare] = useState(75)
  const [result, setResult] = useState<ExperimentResult | null>(null)
  const [error, setError] = useState('')
  const validRows = useMemo(() => dataset.rows.filter(row => Number.isFinite(row[feature]) && Number.isFinite(row[target])), [dataset, feature, target])
  const beatsBaseline = result ? (result.task === 'regression' ? result.primary < result.baseline : result.primary > result.baseline) : false
  const chooseDataset = (next: Dataset) => { setDataset(next); setFeature(next.feature); setTarget(next.target); setTask(next.task); setResult(null); setError('') }
  const loadCsv = async (file?: File) => {
    if (!file) return
    try {
      if (file.size > 2_000_000) throw new Error('Choose a CSV smaller than 2 MB.')
      chooseDataset(parseCsv(await file.text(), file.name))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'That CSV could not be read.') }
  }
  const run = () => {
    const next = runExperiment(dataset.rows, feature, target, task, trainShare)
    if (!next) { setError('Choose different numeric feature and target columns with at least eight valid rows.'); return }
    setError(''); setResult(next)
  }
  const downloadBrief = () => {
    if (!result) return
    const direction = result.task === 'regression' ? (result.primary < result.baseline ? 'beat' : 'did not beat') : (result.primary > result.baseline ? 'beat' : 'did not beat')
    const markdown = `# ML Quest Experiment Brief\n\n## Question\nCan **${feature}** help predict **${target}** in the **${dataset.name}** dataset?\n\n## Data\n- ${validRows.length} usable rows\n- ${result.trainCount} training rows / ${result.testCount} hidden test rows\n- Task: ${task}\n\n## Model\nA transparent one-feature ${task === 'regression' ? 'linear regression' : 'threshold classifier'}: \`${result.modelLabel}\`\n\n## Result\n- ${result.primaryName}: ${formatMetric(result.primary)}\n- Baseline ${result.primaryName}: ${formatMetric(result.baseline)}\n- The model ${direction} the simple baseline on the hidden test set.\n${result.metrics.map(metric => `- ${metric.label}: ${metric.value}`).join('\n')}\n\n## Risks and next steps\n- Validate that ${feature} is available at prediction time and does not leak the outcome.\n- Inspect performance across important groups, time periods, and edge cases.\n- Add features only when they improve repeated validation, not just this test split.\n- Define the real decision, costs, monitoring, and rollback plan before deployment.\n`
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${dataset.id}-experiment-brief.md`; anchor.click(); URL.revokeObjectURL(url)
  }
  return <main className="playground-shell">
    <section className="playground-intro"><p className="eyebrow">Data playground · local & private</p><h1>Run the whole ML loop on a dataset.</h1><p>Choose the question, hide a test set, fit a transparent model, and make it beat a baseline. Nothing uploads; every calculation happens in this browser.</p></section>
    <section className="playground-workspace">
      <aside className="data-panel">
        <div className="panel-heading"><span>01 · Data</span><b>{dataset.rows.length} rows</b></div>
        <div className="dataset-choices">{BUILT_INS.map(item => <button key={item.id} className={dataset.id === item.id ? 'active' : ''} onClick={() => chooseDataset(item)}><b>{item.name}</b><span>{item.description}</span></button>)}</div>
        <label className="csv-upload"><input type="file" accept=".csv,text/csv" onChange={event => loadCsv(event.target.files?.[0])}/><span>＋ Load your CSV</span><small>Numeric columns · max 2 MB · stays on device</small></label>
        <div className="data-preview"><div><b>{dataset.name}</b><span>{dataset.columns.length} numeric columns</span></div><div className="data-table"><table><thead><tr>{dataset.columns.slice(0, 5).map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{dataset.rows.slice(0, 5).map((row, index) => <tr key={index}>{dataset.columns.slice(0, 5).map(column => <td key={column}>{row[column]}</td>)}</tr>)}</tbody></table></div></div>
      </aside>
      <section className="experiment-panel">
        <div className="panel-heading"><span>02 · Experiment</span><b>One feature, honest test</b></div>
        <div className="experiment-controls">
          <label>Feature <select value={feature} onChange={event => { setFeature(event.target.value); setResult(null) }}>{dataset.columns.map(column => <option key={column}>{column}</option>)}</select><small>Information available before the prediction</small></label>
          <label>Target <select value={target} onChange={event => { setTarget(event.target.value); setResult(null) }}>{dataset.columns.map(column => <option key={column}>{column}</option>)}</select><small>The outcome you want to predict</small></label>
          <fieldset><legend>Task</legend><div>{(['regression', 'classification'] as const).map(value => <button key={value} className={task === value ? 'active' : ''} onClick={() => { setTask(value); setResult(null) }}>{value}</button>)}</div><small>{task === 'regression' ? 'Predict a continuous number' : 'Treat zero as negative and nonzero as positive'}</small></fieldset>
          <label className="split-control"><span><b>Training share</b><strong>{trainShare}% train · {100 - trainShare}% test</strong></span><input type="range" min="60" max="90" step="5" value={trainShare} onChange={event => { setTrainShare(Number(event.target.value)); setResult(null) }}/><small>The model never sees the test rows while fitting.</small></label>
        </div>
        {error && <div className="playground-error"><b>Check the experiment</b><span>{error}</span></div>}
        <button className="button primary run-experiment" onClick={run}>Run honest experiment <span>→</span></button>
      </section>
    </section>
    <section className={`results-panel ${result ? 'ready' : ''}`}>
      <div className="panel-heading"><span>03 · Evidence</span><b>{result ? `${result.testCount} unseen rows scored` : 'Waiting for an experiment'}</b></div>
      {!result ? <div className="results-empty"><span>↗</span><h2>Your evidence will appear here.</h2><p>Fit a model above. The hidden test score and the simple baseline will arrive together.</p></div> : <>
        <div className="metric-grid">{result.metrics.map(metric => <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><p>{metric.note}</p></article>)}</div>
        <div className="evidence-grid"><Plot result={result} feature={feature} target={target}/><article className={`baseline-verdict ${beatsBaseline ? 'won' : ''}`}><span>Baseline verdict</span><h2>{beatsBaseline ? 'The model earned its complexity.' : 'The baseline still wins.'}</h2><p>{result.task === 'regression' ? `The model’s typical miss is ${formatMetric(Math.abs(result.baseline - result.primary), 1)} target units ${result.primary < result.baseline ? 'smaller' : 'larger'} than guessing the training mean.` : `Test F1 is ${formatMetric(result.primary)} versus ${formatMetric(result.baseline)} for predicting the majority class.`}</p><ul><li>Try a different feature.</li><li>Change the split and look for fragility.</li><li>Check whether the feature leaks the answer.</li></ul></article></div>
        <div className="brief-bar"><div><span>Portfolio artifact</span><b>Turn this run into an experiment brief.</b><p>Includes the question, split, model, evidence, baseline verdict, risks, and next steps.</p></div><button className="button primary" onClick={downloadBrief}>Download .md brief <span>↓</span></button></div>
      </>}
    </section>
  </main>
}
