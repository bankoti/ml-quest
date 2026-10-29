import type { CSSProperties } from 'react'
import { BEGINNER_UNITS } from './beginnerContent'
import { LESSONS, STAGES, getLesson, getStageForLesson } from './curriculum'

interface LearningMapProps {
  completedLessons: string[]
  completedCode: string[]
  starterCompleted?: string[]
}

interface Topic {
  title: string
  slug?: string
  introductory?: boolean
}

interface TopicGroup {
  id: string
  title: string
  kind: string
  description: string
  topics: Topic[]
}

const TOPIC_GROUPS: TopicGroup[] = [
  {
    id: 'supervised', title: 'Supervised learning', kind: 'Learning from labeled examples',
    description: 'Predict a number with regression or a category with classification. Start here after the foundations.',
    topics: [
      { title: 'Linear regression', slug: 'linear-regression' },
      { title: 'Polynomial features', slug: 'feature-engineering', introductory: true },
      { title: 'Ridge regularization', slug: 'regularization' },
      { title: 'Logistic regression', slug: 'logistic-classification' },
      { title: 'K-nearest neighbors', slug: 'knn-classification' },
      { title: 'Support vector machines', slug: 'support-vector-machines' },
      { title: 'Decision trees', slug: 'decision-trees' },
      { title: 'Naive Bayes & Lasso' },
    ],
  },
  {
    id: 'unsupervised', title: 'Unsupervised learning', kind: 'Finding structure without target labels',
    description: 'Explore clusters, compressed representations, and unusual examples. Discovered groups are not automatically true categories.',
    topics: [
      { title: 'K-means clustering', slug: 'clustering' },
      { title: 'Principal component analysis', slug: 'dimensionality-reduction' },
      { title: 'Anomaly detection', slug: 'anomaly-detection' },
      { title: 'Collaborative filtering', slug: 'recommender-systems', introductory: true },
      { title: 'DBSCAN & hierarchical clustering' },
      { title: 't-SNE, UMAP & SVD' },
      { title: 'Association rules: Apriori & FP-Growth' },
    ],
  },
  {
    id: 'ensembles', title: 'Ensemble learning', kind: 'Combining models',
    description: 'A technique that crosses categories: combine diverse models or fit successive corrections. Our labs use supervised examples.',
    topics: [
      { title: 'Random forests & bagging', slug: 'ensemble-power' },
      { title: 'Gradient boosting', slug: 'gradient-boosting' },
      { title: 'Stacking & voting ensembles' },
      { title: 'Production boosting libraries' },
    ],
  },
  {
    id: 'deep', title: 'Deep learning', kind: 'Learning layered representations',
    description: 'See the mechanisms in small, inspectable experiments. These are introductions, not comprehensive architecture courses.',
    topics: [
      { title: 'Neural networks & backpropagation', slug: 'neural-networks', introductory: true },
      { title: 'Convolution & visual features', slug: 'computer-vision', introductory: true },
      { title: 'Attention & transformer foundations', slug: 'language-and-attention', introductory: true },
      { title: 'Recurrent & graph neural networks' },
      { title: 'Autoencoders & variational autoencoders' },
      { title: 'Training complete CNNs & transformers' },
    ],
  },
  {
    id: 'semi-supervised', title: 'Semi-supervised learning', kind: 'Mixing labeled and unlabeled data',
    description: 'Use a small labeled set together with unlabeled examples. Incorrect pseudo-labels can reinforce a model’s mistakes.',
    topics: [{ title: 'Self-training & pseudo-labels' }, { title: 'Co-training & consistency methods' }],
  },
  {
    id: 'self-supervised', title: 'Self-supervised learning', kind: 'Creating a training signal from data',
    description: 'Build targets from the examples themselves, such as predicting a hidden token. A training objective, not one architecture.',
    topics: [{ title: 'Masked & next-token prediction' }, { title: 'Contrastive representation learning' }, { title: 'Bootstrap representation learning' }],
  },
  {
    id: 'transfer', title: 'Transfer learning', kind: 'Reusing what a model learned',
    description: 'Start with learned representations and adapt them to a new task. Useful with vision, language, and other kinds of models.',
    topics: [{ title: 'Frozen feature extraction' }, { title: 'Fine-tuning & adaptation' }],
  },
  {
    id: 'generative', title: 'Generative modeling', kind: 'Modeling and producing data',
    description: 'Learn structure that supports creating new samples. Attention is a useful prerequisite, but it is not a full generative-AI course.',
    topics: [{ title: 'Autoregressive language generation' }, { title: 'Diffusion models' }, { title: 'Generative adversarial networks' }, { title: 'Multimodal generation' }],
  },
  {
    id: 'reinforcement', title: 'Reinforcement learning', kind: 'Learning through actions and rewards',
    description: 'Choose actions over time, balancing exploration with reward. The consequences of an action may arrive much later.',
    topics: [{ title: 'Q-learning & SARSA' }, { title: 'Deep Q-networks' }, { title: 'Policy gradients & actor–critic' }],
  },
  {
    id: 'graphical', title: 'Probabilistic graphical models', kind: 'Representing probabilistic dependencies',
    description: 'Use graphs to describe relationships between random variables. These are distinct from graph neural networks.',
    topics: [{ title: 'Bayesian networks' }, { title: 'Markov random fields' }, { title: 'Hidden Markov models' }],
  },
]

const STAGE_PREPARATION: Record<string, string[]> = {
  '01': [],
  '02': ['machines-that-learn', 'train-test-split', 'beat-the-baseline'],
  '03': ['linear-regression', 'train-test-split'],
  '04': ['train-test-split', 'logistic-classification'],
  '05': ['data-is-the-curriculum', 'knn-classification'],
  '06': ['gradient-descent', 'regularization', 'precision-and-recall'],
}

function PreparationLinks({ slugs }: { slugs: string[] }) {
  return <>{slugs.map((slug, index) => {
    const lesson = getLesson(slug)
    return lesson ? <span key={slug}>{index > 0 && ' · '}<a href={`#/lesson/${slug}`}>{lesson.title}</a></span> : null
  })}</>
}

export function LearningMap({ completedLessons, completedCode, starterCompleted = [] }: LearningMapProps) {
  const concepts = new Set(completedLessons)
  const code = new Set(completedCode)
  const conceptCount = LESSONS.filter(lesson => concepts.has(lesson.slug)).length
  const codeCount = LESSONS.filter(lesson => code.has(lesson.slug)).length
  const next = LESSONS.find(lesson => !concepts.has(lesson.slug) || !code.has(lesson.slug))
  const nextCodeOnly = !!next && concepts.has(next.slug) && !code.has(next.slug)
  const nextHref = next ? `#/lesson/${next.slug}${nextCodeOnly ? '/code' : ''}` : '#/projects'
  const firstStage = next ? getStageForLesson(next.slug)?.number : STAGES[0]?.number
  const starterCount = BEGINNER_UNITS.filter(unit => starterCompleted.includes(unit.slug)).length
  const needsFoundations = conceptCount === 0 && codeCount === 0 && starterCount < BEGINNER_UNITS.length
  const isNew = needsFoundations && starterCount === 0

  return <main className="learning-map">
    <header className="map-intro">
      <div>
        <p className="section-kicker">Your field guide to machine learning</p>
        <h1>A path to follow.<br /><em>A world to explore.</em></h1>
        <p className="map-lede">Start with the basics, build working intuition, then choose a direction. The guided path is a sequence; the topic map shows how the field fits together.</p>
        <div className="map-actions">
          <a className="button primary" href={needsFoundations ? '#/starter' : nextHref}>{isNew ? 'Start from zero' : needsFoundations ? 'Continue foundations' : next ? nextCodeOnly ? 'Continue with Python' : 'Continue the core path' : 'Apply your skills'} <span aria-hidden="true">→</span></a>
          <a className="text-action" href="#/">Back to course home</a>
        </div>
      </div>
      <aside className="map-progress" aria-label="Your core course progress">
        <p className="map-eyebrow">Two kinds of evidence</p>
        <div><label htmlFor="map-concept-progress">Concept checks <strong>{conceptCount} / {LESSONS.length}</strong></label><progress id="map-concept-progress" value={conceptCount} max={LESSONS.length} /></div>
        <div><label htmlFor="map-code-progress">Python quests <strong>{codeCount} / {LESSONS.length}</strong></label><progress id="map-code-progress" value={codeCount} max={LESSONS.length} /></div>
        <p>A correct checkpoint and passing code are recorded separately. Opening a lesson does not mark it complete.</p>
        <a href={nextHref}>{next ? <><span>{nextCodeOnly ? 'Next unfinished Python quest' : 'Next unfinished core lesson'}</span><strong>{next.title} <span aria-hidden="true">↗</span></strong></> : <><span>All core checks passed</span><strong>Build an applied project <span aria-hidden="true">↗</span></strong></>}</a>
      </aside>
    </header>

    <section className="map-guided" aria-labelledby="map-guided-heading">
      <div className="map-section-heading">
        <div><p className="section-kicker">01 / The guided path</p><h2 id="map-guided-heading">Learn in a useful order.</h2></div>
        <p>Preparation links are recommendations, not locked doors. Already comfortable with a topic? Jump ahead, or return whenever you need it.</p>
      </div>
      <article className="map-starter-card">
        <span className="map-stage-number" aria-hidden="true">00</span>
        <div><p className="map-eyebrow">Before the core · beginner preparation</p><h3>Python and math, without the mystery.</h3><p>Practice the small building blocks the labs use: values, lists, functions, weighted sums, and model notation.</p><span className="map-starter-status">{starterCount ? `${starterCount} / ${BEGINNER_UNITS.length} foundations completed` : 'No programming experience assumed'}</span></div>
        <a className="button ghost" href="#/starter">Open beginner preparation <span aria-hidden="true">→</span></a>
      </article>
      <ol className="map-stages">
        {STAGES.map(stage => {
          const stageConcepts = stage.lessons.filter(lesson => concepts.has(lesson.slug)).length
          const stageCode = stage.lessons.filter(lesson => code.has(lesson.slug)).length
          const preparation = STAGE_PREPARATION[stage.number] || []
          return <li key={stage.number} style={{ '--map-accent': stage.accent } as CSSProperties}>
            <details className="map-stage" open={stage.number === firstStage}>
              <summary>
                <span className="map-stage-number" aria-hidden="true">{stage.number}</span>
                <span className="map-stage-name"><span>{stage.shortTitle} · {stage.lessons.length} lessons</span><strong>{stage.title}</strong></span>
                <span className="map-stage-counts"><span>{stageConcepts}/{stage.lessons.length} concepts</span><span>{stageCode}/{stage.lessons.length} Python</span></span>
                <span className="map-expand" aria-hidden="true">+</span>
              </summary>
              <div className="map-stage-body">
                <p>{stage.description}</p>
                <p className="map-preparation"><strong>Helpful first: </strong>{preparation.length ? <PreparationLinks slugs={preparation} /> : <a href="#/starter">Beginner preparation</a>}</p>
                <ol className="map-lessons">{stage.lessons.map(lesson => <li key={lesson.slug}>
                  <a href={`#/lesson/${lesson.slug}`}><strong>{lesson.title}</strong><span>{lesson.description}</span></a>
                  <div className="map-lesson-evidence"><span className={concepts.has(lesson.slug) ? 'is-complete' : ''}>{concepts.has(lesson.slug) ? '✓ Concept passed' : 'Concept to do'}</span><span className={code.has(lesson.slug) ? 'is-complete' : ''}>{code.has(lesson.slug) ? '✓ Python passed' : 'Python to do'}</span></div>
                </li>)}</ol>
              </div>
            </details>
          </li>
        })}
      </ol>
      <div className="map-practice-links">
        <a href="#/compare"><span>Compare</span><strong>Same data. Different models. <span aria-hidden="true">↗</span></strong><p>Compare fitted prediction curves and their errors on the same training and validation examples.</p></a>
        <a href="#/projects"><span>Apply</span><strong>Build an end-to-end project. <span aria-hidden="true">↗</span></strong><p>Frame the problem, train and evaluate, then export a working predictor.</p></a>
        <a href="#/reference"><span>Look up</span><strong>Keep the essentials nearby. <span aria-hidden="true">↗</span></strong><p>Revisit vocabulary, formulas, and model-selection reminders as you learn.</p></a>
      </div>
    </section>

    <section className="map-landscape" aria-labelledby="map-landscape-heading">
      <div className="map-section-heading"><div><p className="section-kicker">02 / The bigger picture</p><h2 id="map-landscape-heading">Know what is here.<br />See what comes beyond.</h2></div><p>This is a map of learning paradigms, model families, and techniques—not a list of interchangeable algorithms. Available lessons cover the core; advanced tracks below are not yet taught.</p></div>
      <aside className="map-overlap" aria-labelledby="map-overlap-heading">
        <h3 id="map-overlap-heading">The branches overlap.</h3>
        <p>A transformer is an <strong>architecture</strong>. It can learn with a <strong>self-supervised objective</strong>, be adapted through <strong>transfer learning</strong>, and perform a <strong>generative task</strong>. These labels describe different aspects of the same system.</p>
        <p>Likewise, a random forest can do regression or classification. A vision transformer belongs to the transformer family—not to convolutional networks.</p>
      </aside>
      <div className="map-legend" aria-label="Topic coverage key"><span><i className="map-key core" aria-hidden="true" />Core lesson = explanation, experiment, checkpoint, Python</span><span><i className="map-key intro" aria-hidden="true" />Intro lab = a mechanism, not a full specialization</span><span><i className="map-key unavailable" aria-hidden="true" />Not yet taught = scope marker, not a lesson</span></div>
      <div className="map-topic-grid">{TOPIC_GROUPS.map(group => <article className="map-topic-group" key={group.id} aria-labelledby={`map-topic-${group.id}`}>
        <p className="map-eyebrow">{group.kind}</p><h3 id={`map-topic-${group.id}`}>{group.title}</h3><p>{group.description}</p>
        <ul>{group.topics.map(topic => <li key={topic.title}>{topic.slug && getLesson(topic.slug) ? <a href={`#/lesson/${topic.slug}`} className={topic.introductory ? 'map-topic-intro' : 'map-topic-core'}><span>{topic.title}</span><small>{topic.introductory ? 'Intro lab' : 'Core lesson'} <span aria-hidden="true">↗</span></small></a> : <div className="map-topic-unavailable"><span>{topic.title}</span><small>Not yet taught</small></div>}</li>)}</ul>
      </article>)}</div>
      <div className="map-footnote"><strong>What keeps the whole map honest?</strong><p>Data quality, baselines, leakage checks, evaluation, and monitoring. They sit on the guided path because knowing an algorithm’s name is not the same as knowing whether a system works.</p><p>One naming trap: Linear Discriminant Analysis (LDA) uses labels, so it is supervised. It should not be placed under unsupervised dimensionality reduction.</p></div>
    </section>
  </main>
}

export function LessonMapContext({ slug }: { slug: string }) {
  const stage = getStageForLesson(slug)
  if (!stage) return null
  const index = stage.lessons.findIndex(lesson => lesson.slug === slug)
  const previous = index > 0 ? [stage.lessons[index - 1].slug] : STAGE_PREPARATION[stage.number] || []
  return <nav className="lesson-map-context" aria-label="Lesson position and preparation">
    <div><a href="#/map">Learning map <span aria-hidden="true">↗</span></a><span>Stage {stage.number} · {stage.shortTitle} · Lesson {index + 1} of {stage.lessons.length}</span></div>
    <p><strong>Helpful first: </strong>{previous.length ? <PreparationLinks slugs={previous.slice(0, 2)} /> : <a href="#/starter">Beginner preparation</a>}<span className="lesson-map-optional"> · optional refresher</span></p>
  </nav>
}
