export interface DayLesson {
  opening: string
  explanation: string[]
  example: { question: string; steps: string[]; takeaway: string }
  check: { question: string; answer: string }
  finish: string
}

// Small, original teaching examples. These are explanations, not measured results.
export const DAY_LESSONS: Record<number, DayLesson> = {
  1: {
    opening: 'Imagine you run a small shop. Tomorrow you must decide how much milk to order. Before choosing a model, ask: what would I need to know to make that decision well?',
    explanation: [
      'You need an estimate of what customers will want, the stock you already have, and the consequences of ordering too much or too little. A forecast predicts something; an ordering policy uses that prediction to choose an action. We will keep those two jobs separate throughout the week.',
      'Now suppose you stocked eight cartons and sold all eight. Did customers want exactly eight? We cannot tell: a ninth customer may have left empty-handed. Sales tell us what was served, not necessarily everything people wanted. This is called censored demand. If ten cartons were available throughout the day and only six sold, six is a more credible demand observation under this simple model.',
      'We also need a clock. The forecast origin is the moment we make the prediction; the horizon is how far ahead we predict. A payment recorded on Sunday but not received by our system until Tuesday cannot provide its final value to a Monday forecast. This distinction matters more than the name of the algorithm.',
    ],
    example: { question: 'Suppose four equally likely demand outcomes are 0, 0, 0 and 12. Should our single-number prediction be 0 or 3?', steps: [
      'The mean is (0+0+0+12)/4 = 3. A median, the middle value of the sorted outcomes, is 0.',
      'For prediction 3, squared errors are 9, 9, 9 and 81. Their average is 27. For prediction 0, their average is 144/4 = 36. The mean is better under squared error.',
      'For prediction 3, absolute errors total 3+3+3+9 = 18, averaging 4.5. For prediction 0, they total 12, averaging 3. The median is better under absolute error.',
    ], takeaway: 'Neither prediction is universally best. First decide which mistakes matter. A good prediction of zero under absolute error does not mean positive demand is impossible.' },
    check: { question: 'A shop sells all five available units. Can you label demand as exactly five? What else would you ask for?', answer: 'No. Under the simple lost-sales model, demand was at least five. Ask when stock ran out and whether availability was reliable throughout the day. Sales alone cannot reveal exactly how many customers were turned away.' },
    finish: 'You can describe a target, prediction time, horizon and decision in ordinary language, explain why future information is excluded, and show why changing the error measure can change the best prediction. If this is still difficult, repeat the four-outcome calculation before adding more formulas.',
  },
  2: {
    opening: 'Before we ask a model to find a pattern, let’s see whether we can describe the pattern ourselves. Does the shop repeat its weekly rhythm, slowly grow, or suddenly change?',
    explanation: [
      'A time series is simply a sequence of observations ordered in time. A trend is a persistent change in its level. Seasonality is repetition at a known calendar interval, such as busy Saturdays. A sudden change of opening hours can create a new regime rather than a pattern we should blindly repeat.',
      'Our first forecast will be deliberately simple. A naive forecast repeats the last observation. A seasonal-naive forecast repeats the last observed season. These are baselines: they tell us what a more elaborate model must improve upon. Simple does not mean useless.',
      'Later we will compare two model families. Exponential smoothing, often discussed under ETS models, updates estimates of level, trend and seasonality. ARIMA models describe time dependence, often after differencing—subtracting earlier values to remove some changing structure. Both require assumptions; neither wins just because its name sounds more technical. A residual is an observed value minus its fitted prediction, useful for inspecting patterns the model missed.',
    ],
    example: { question: 'A series repeats 10, 20, 10, 20, 10, 20. Forecast the next two values, then compare with actual outcomes 12 and 18.', steps: [
      'The naive forecast repeats the latest value: [20, 20]. Its absolute errors are |12−20|=8 and |18−20|=2, averaging 5.',
      'The seasonal-naive forecast repeats the last two-value season: [10, 20]. Its absolute errors are 2 and 2, averaging 2.',
      'Seasonal naive wins this particular comparison. To check whether the advantage persists, move the prediction time forward and repeat the comparison using only information available then.',
    ], takeaway: 'Use the pattern to justify the baseline, then use repeated future-facing tests to justify a preference. One favorable example is not evidence that a method will always win.' },
    check: { question: 'If you must predict six steps ahead from this origin, may you replace the second predicted season with the actual values that arrive later?', answer: 'No. Repeat the last known season three times. Using later actuals would answer a different question: how well can we forecast after receiving new information? That is not the original fixed-origin six-step task.' },
    finish: 'You can sketch trend and seasonality, compute both baselines, and explain what smoothing and time-dependence models try to capture. If the vocabulary feels slippery, explain the two-number example first and then attach the terms to it.',
  },
  3: {
    opening: 'Yesterday we forecast one series. Today imagine forecasting thousands of products. Some have two years of history; a new product has almost none. How can we share useful information without mixing up their identities?',
    explanation: [
      'A panel is a collection of related time series—for example, daily sales for many products and stores. A local model learns separately for each series. A global model learns from several series together. Sharing information can help a new product, but can also hurt if unrelated products are forced to behave alike.',
      'A lag is an earlier observation used as an input. A one-day lag for product A must come from product A on the previous calendar day, not from product B or merely the preceding row. Missing data and observed zero sales are different. We only fill a missing sale with zero when a trustworthy data contract tells us that no sale really occurred.',
      'For several future days, we have another choice. Direct forecasting predicts each future horizon from information known now. Recursive forecasting predicts the next step and feeds that prediction into later steps. Actual future sales are not available to either method. For products that sell rarely, we also need to distinguish how often a sale occurs from how large a nonzero sale is.',
    ],
    example: { question: 'Product A sells 2, 4, 6 and 100 units on days 1–4. What is the three-day trailing mean used to predict day 4?', steps: [
      'Stand at the prediction time before day 4. The available previous values are 2, 4 and 6.',
      'Their mean is (2+4+6)/3 = 4. The day-4 outcome, 100, must not enter its own input.',
      'If day 2 is missing, we do not have three observed calendar days. Under the Python drill’s contract, return an unknown value rather than silently treat day 2 as zero. The SQL drill uses a different, explicit complete-feed contract that does permit zero-filling absent transactions.',
    ], takeaway: 'A feature is valid because of what was known at prediction time, not because a data-frame operation runs without an error.' },
    check: { question: 'You forecast Tuesday and Wednesday on Monday morning. Can Wednesday’s inputs include Tuesday’s actual sales?', answer: 'No: Tuesday has not happened. Use inputs available Monday for a direct forecast, or Tuesday’s predicted sales in a recursive forecast. Explain which strategy you chose and evaluate it under the same information restriction.' },
    finish: 'You can build a lag without crossing products or time boundaries, explain when pooling helps or hurts, and describe how product forecasts relate to category totals. If coding fails, trace three rows by hand before changing the model.',
  },
  4: {
    opening: 'A model’s backtest looks excellent. Before being impressed, ask: did it really predict the future, or did the evaluation accidentally let it see part of the answer?',
    explanation: [
      'A backtest replays earlier prediction moments. At each origin, hide everything that would still have been unknown, fit using eligible history, and predict the full required horizon. Rolling-origin evaluation repeats this process at several origins. A final untouched period is reserved for assessing choices already made, not for choosing them again.',
      'Reporting delays matter. If outcomes arrive two days late, a day-28 prediction cannot use day-27 outcomes even though the event has already happened. Training labels also need to have arrived. Preprocessing, such as learning a mean for scaling, must obey the same boundary.',
      'We will then ask how to judge uncertainty. Calibration asks whether predicted probabilities agree with observed frequencies across comparable cases. Sharpness asks how concentrated the predictions are. A narrow interval is not useful if it regularly misses the outcome. A quantile is a value below which a specified fraction of a distribution lies; it lets us express asymmetric risk.',
    ],
    example: { question: 'At origin 28, outcomes through day 26 are available. A training example at origin u predicts the outcome seven days later. What is the latest training origin whose target is available?', steps: [
      'The target date is u+7. To have observed its label, require u+7 ≤ 26.',
      'Subtract seven: u ≤ 19. Origin 19 is eligible; origin 20 targets day 27, which is still unavailable.',
      'This checks label eligibility only. Each historical example must also have inputs constructed from the information available at its own historical origin. Passing one cutoff check does not make the whole pipeline leakage-safe.',
    ], takeaway: 'Draw the timeline before writing the split. The training cutoff is determined by target horizon and reporting delay, not just by whether a row appears before the evaluation date.' },
    check: { question: 'An interval is made narrower and its observed coverage falls far below the advertised level. Is that automatically an improvement?', answer: 'No. It is sharper but poorly calibrated at that advertised level. Compare coverage and a suitable interval or quantile score on the same held-out cases. Do not reward narrowness without accounting for misses.' },
    finish: 'You can identify a leaking feature or label, explain the purpose of the final holdout, and defend an uncertainty score. If the cutoff is confusing, mark origin, target date and availability date as three separate points on paper.',
  },
  5: {
    opening: 'Now we have a forecast. How much should we order? The answer is not automatically the forecast mean: leftover bread and missed sales have different costs.',
    explanation: [
      'Start with a one-period decision. An underage cost is the penalty for one unit too few; an overage cost is the penalty for one unit too many. An extra unit helps when demand exceeds the order and hurts when it is left over. Balancing those possibilities gives a cost-based demand quantile, called the critical fractile.',
      'Next we add time. Lead time is the delay between placing an order and receiving it. Inventory position is on-hand stock plus reliable outstanding orders minus backorders. It prevents us from ordering again simply because units already on their way are not yet on the shelf.',
      'Keep two service measures distinct. Cycle service concerns the probability of a cycle without a shortage. Unit fill rate concerns the fraction of requested units supplied immediately. Neither should be described simply as “service” when making a numerical claim.',
    ],
    example: { question: 'Demand is 40, 60 or 100 with probabilities 0.2, 0.5 and 0.3. A short unit costs 8; a leftover costs 5. Why choose 60 rather than mean demand 68?', steps: [
      'The target cumulative probability is 8/(8+5) ≈ 0.615. Demand is at most 40 with probability 0.2 and at most 60 with probability 0.7. The first quantity reaching the target is 60.',
      'At order 60, the low-demand scenario leaves 20 units: weighted cost 0.2×20×5=20. The high-demand scenario is short by 40: weighted cost 0.3×40×8=96. Total expected mismatch cost is 116.',
      'At order 68, the three weighted costs are 28, 20 and 76.8, totaling 124.8. The mean is more expensive under this loss. This one-period example assumes no extra constraints and does not by itself specify a multi-period replenishment policy.',
    ], takeaway: 'Choose the action using the cost of being wrong, not a familiar service percentage. Then add delivery timing, pipeline stock and operational constraints before treating it as a real ordering policy.' },
    check: { question: 'There are 80 units on hand, 200 on order and 20 backordered. If the reorder trigger is 240 units of inventory position, does this state trigger another order?', answer: 'Inventory position is 80+200−20=260, above 240, so not under the stated trigger. This assumes the pipeline is reliable and included in the policy’s scope. It does not guarantee no shortage before the next delivery.' },
    finish: 'You can explain the extra-unit tradeoff, calculate a simple cost-based order and trace inventory through a delivery and sale. If the formulas feel abstract, enumerate the three demand scenarios again.',
  },
  6: {
    opening: 'A mathematically attractive order may not fit the warehouse. A model with lower forecast error may not improve profit. Today we ask two questions: can we carry out the decision, and what evidence would show that it helps?',
    explanation: [
      'A constraint describes what is allowed: a budget, shelf capacity, pack size or expiry rule. An objective describes what we want to improve. Optimization searches for a good decision among the allowed choices. It is not enough to find an ideal order and then round it casually if rounding changes feasibility.',
      'Prediction and causality answer different questions. Predictive evaluation asks how well we estimate outcomes. A causal study asks how outcomes change because we adopt an intervention. Before/after comparisons can mix policy effects with seasonality, prices or supply changes.',
      'An experiment should assign treatment at a unit where spillovers can be managed. Stores sharing a warehouse can affect each other. Inventory left over for weeks creates carryover, so switching a policy hourly does not reset the system. We need credible independent evidence, not simply many rows of data.',
    ],
    example: { question: 'Suppose an item comes in packs of six, each unit costs 2, and the purchase budget is 30. A separate cost calculation suggests 14 units. What can we actually order?', steps: [
      'The budget permits at most 30/2=15 units. Pack sizes permit only multiples of six.',
      'The feasible quantities are 0, 6 and 12. Rounding 14 upward to 18 violates the budget because 18×2=36.',
      'We still need the expected shortage and leftover cost at each feasible quantity to choose the best one. Twelve is the largest feasible quantity, not automatically the optimal one. This toy calculation illustrates feasibility, not a full multi-item solver.',
    ], takeaway: 'First state the objective and feasible set. Then compare feasible actions. For a rollout, apply the same discipline to the evidence: a positive estimate alone does not establish useful benefit.' },
    check: { question: 'Estimated margin improvement is 2%, but its uncertainty interval ranges from −1% to +5%. Can you say the policy is proven to improve margin?', answer: 'No. The interval is compatible with harm and benefit under the analysis assumptions. Report the estimate and uncertainty, inspect pre-agreed safety criteria, and decide whether more evidence is worth collecting. Inconclusive is not the same as equivalent.' },
    finish: 'You can write a simple feasible decision problem, explain why a comparison may be confounded, and propose a bounded experiment with a clear outcome and safety limits. Do not invent a duration or sample size without the variance and dependence information needed to justify it.',
  },
  7: {
    opening: 'Today is not about collecting more terminology. It is about turning the week’s ideas into a clear conversation: what is the problem, why this approach, what does the calculation show, and what would change your recommendation?',
    explanation: [
      'Start an answer with the decision and information boundary. Then work one small example. State the assumptions before using a formula, and explain what the result means for the decision. Only then discuss extensions. This makes your reasoning easier to follow and exposes mistakes early.',
      'Use the mock cases as practice, not scripts to memorize. Keep worked examples closed until you finish an attempt. If you have already seen a case, change a cost, delivery delay or reporting assumption and solve the variant. Familiarity with an answer is not the same as being able to reconstruct it.',
      'When reviewing, find the first place your reasoning went wrong. A wrong arithmetic operation needs a different repair from an invalid target or a leaking split. For your project presentation, distinguish work you actually did, team contributions, measured results and proposed next steps.',
    ],
    example: { question: 'Revisit the three-demand inventory example, but reduce the leftover cost from 5 to 1 while keeping shortage cost at 8. How should the recommendation change?', steps: [
      'First predict the direction: extra stock is now less costly, so a higher order becomes more attractive.',
      'The critical fraction becomes 8/(8+1)=8/9≈0.889. The cumulative probability at 60 is only 0.7; at 100 it is 1. The new selected quantity is 100.',
      'Check the costs: ordering 60 costs 0.2×20×1 + 0.3×40×8 = 100. Ordering 100 costs 0.2×60×1 + 0.5×40×1 = 32. Explain both the numerical answer and the economic reason it moved.',
    ], takeaway: 'A useful rehearsal tests whether you can adapt the reasoning when conditions change. Do not claim a measured business improvement from this synthetic example.' },
    check: { question: 'You reach a plausible answer but cannot explain which assumption makes the formula valid. What should you repair before the interview?', answer: 'Return to the decision and data-generating assumptions, then derive or trace a small example. Memorizing another formula will not repair that gap. Practice saying what would make your result invalid and what you would do instead.' },
    finish: 'You have two reviewed attempts, a corrected explanation of your most consequential mistakes, and a truthful project story. This is evidence of useful practice—not a guarantee of interview readiness. Stop adding new topics and preserve time to rest.',
  },
}
