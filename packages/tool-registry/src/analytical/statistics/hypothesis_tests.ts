import { HypothesisTestParams, HypothesisTestResult, HypothesisTestType } from './types.js';
import { StatisticsToolError } from './errors.js';

export class HypothesisTestingTool {
  public static runTest(params: HypothesisTestParams): HypothesisTestResult {
    const { testType, alpha = 0.05 } = params;

    switch (testType) {
      case 'two_sample_ttest':
        return this.runTwoSampleTTest(params.groupA, params.groupB || [], alpha);
      case 'paired_ttest':
        return this.runPairedTTest(params.groupA, params.groupB || [], alpha);
      case 'one_way_anova':
        return this.runOneWayAnova(params.groupsAnova || [params.groupA, params.groupB || []], alpha);
      case 'mann_whitney_u':
        return this.runMannWhitneyU(params.groupA, params.groupB || [], alpha);
      case 'chi_square_independence':
        return this.runChiSquare(params.contingencyTable || [], alpha);
      default:
        throw new StatisticsToolError(`Unsupported test type: '${testType}'`, 'UNSUPPORTED_TEST');
    }
  }

  private static runTwoSampleTTest(a: number[], b: number[], alpha: number): HypothesisTestResult {
    if (a.length < 2 || b.length < 2) {
      throw new StatisticsToolError('Both sample groups must have at least 2 observations for two-sample t-test', 'INSUFFICIENT_DATA');
    }

    const n1 = a.length, n2 = b.length;
    const m1 = a.reduce((x, y) => x + y, 0) / n1;
    const m2 = b.reduce((x, y) => x + y, 0) / n2;

    const v1 = a.reduce((acc, x) => acc + (x - m1) * (x - m1), 0) / (n1 - 1);
    const v2 = b.reduce((acc, x) => acc + (x - m2) * (x - m2), 0) / (n2 - 1);

    const se = Math.sqrt(v1 / n1 + v2 / n2);
    const tStat = (m1 - m2) / (se || 1e-9);

    // Welch-Satterthwaite degrees of freedom
    const df = Math.pow(v1 / n1 + v2 / n2, 2) /
      (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1) || 1);

    const pValue = this.approximateTPValue(Math.abs(tStat), df);
    const isSignificant = pValue < alpha;

    // Cohen's d
    const pooledStd = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2 || 1));
    const cohensD = (m1 - m2) / (pooledStd || 1e-9);

    let effectDesc = 'Negligible';
    const absD = Math.abs(cohensD);
    if (absD >= 0.8) effectDesc = 'Large effect';
    else if (absD >= 0.5) effectDesc = 'Medium effect';
    else if (absD >= 0.2) effectDesc = 'Small effect';

    const interpretation = isSignificant
      ? `Statistically significant difference detected between groups (t=${tStat.toFixed(3)}, p=${pValue.toFixed(4)}, df=${df.toFixed(1)}, ${effectDesc}). Means: ${m1.toFixed(2)} vs ${m2.toFixed(2)}.`
      : `No statistically significant difference detected (t=${tStat.toFixed(3)}, p=${pValue.toFixed(4)}, df=${df.toFixed(1)}). Means: ${m1.toFixed(2)} vs ${m2.toFixed(2)}.`;

    return {
      testType: 'two_sample_ttest',
      testStatistic: Number(tStat.toFixed(4)),
      pValue: Number(pValue.toFixed(4)),
      isSignificant,
      alpha,
      degreesOfFreedom: Number(df.toFixed(1)),
      effectSize: Number(cohensD.toFixed(4)),
      effectSizeInterpretation: effectDesc,
      interpretation,
    };
  }

  private static runPairedTTest(a: number[], b: number[], alpha: number): HypothesisTestResult {
    const n = Math.min(a.length, b.length);
    if (n < 2) {
      throw new StatisticsToolError('Paired t-test requires at least 2 pairs', 'INSUFFICIENT_DATA');
    }

    const diffs: number[] = [];
    for (let i = 0; i < n; i++) {
      diffs.push(a[i] - b[i]);
    }

    const meanDiff = diffs.reduce((x, y) => x + y, 0) / n;
    const varDiff = diffs.reduce((acc, d) => acc + (d - meanDiff) * (d - meanDiff), 0) / (n - 1);
    const se = Math.sqrt(varDiff / n);
    const tStat = meanDiff / (se || 1e-9);
    const df = n - 1;

    const pValue = this.approximateTPValue(Math.abs(tStat), df);
    const isSignificant = pValue < alpha;

    const cohensD = meanDiff / (Math.sqrt(varDiff) || 1e-9);

    return {
      testType: 'paired_ttest',
      testStatistic: Number(tStat.toFixed(4)),
      pValue: Number(pValue.toFixed(4)),
      isSignificant,
      alpha,
      degreesOfFreedom: df,
      effectSize: Number(cohensD.toFixed(4)),
      interpretation: isSignificant
        ? `Statistically significant paired difference (mean diff = ${meanDiff.toFixed(2)}, t=${tStat.toFixed(3)}, p=${pValue.toFixed(4)}).`
        : `No statistically significant paired difference (mean diff = ${meanDiff.toFixed(2)}, t=${tStat.toFixed(3)}, p=${pValue.toFixed(4)}).`,
    };
  }

  private static runOneWayAnova(groups: number[][], alpha: number): HypothesisTestResult {
    const validGroups = groups.filter(g => g.length > 0);
    const k = validGroups.length;
    if (k < 2) {
      throw new StatisticsToolError('ANOVA requires at least 2 groups with data', 'INSUFFICIENT_DATA');
    }

    let grandSum = 0, totalN = 0;
    const groupMeans: number[] = [];
    const groupSizes: number[] = [];

    for (const g of validGroups) {
      const gSum = g.reduce((x, y) => x + y, 0);
      const gMean = gSum / g.length;
      groupMeans.push(gMean);
      groupSizes.push(g.length);
      grandSum += gSum;
      totalN += g.length;
    }

    const grandMean = grandSum / totalN;

    if (totalN <= k) {
      throw new StatisticsToolError(`ANOVA requires total sample size (${totalN}) greater than number of groups (${k})`, 'INSUFFICIENT_DATA');
    }

    let ssb = 0; // Between-group sum of squares
    let ssw = 0; // Within-group sum of squares

    for (let i = 0; i < k; i++) {
      ssb += groupSizes[i] * Math.pow(groupMeans[i] - grandMean, 2);
      for (const val of validGroups[i]) {
        ssw += Math.pow(val - groupMeans[i], 2);
      }
    }

    const dfBetween = k - 1;
    const dfWithin = totalN - k;

    const msb = ssb / (dfBetween || 1);
    const msw = ssw / (dfWithin || 1);

    const fStat = msb / (msw || 1e-9);
    const pValue = this.approximateFPValue(fStat, dfBetween, dfWithin);
    const isSignificant = pValue < alpha;

    // Eta-squared
    const etaSquared = ssb / (ssb + ssw || 1);

    return {
      testType: 'one_way_anova',
      testStatistic: Number(fStat.toFixed(4)),
      pValue: Number(pValue.toFixed(4)),
      isSignificant,
      alpha,
      degreesOfFreedom: dfBetween,
      effectSize: Number(etaSquared.toFixed(4)),
      effectSizeInterpretation: `Eta-squared = ${etaSquared.toFixed(3)} (${(etaSquared * 100).toFixed(1)}% variance explained)`,
      interpretation: isSignificant
        ? `Statistically significant variance across ${k} groups (F=${fStat.toFixed(2)}, p=${pValue.toFixed(4)}). At least one group differs significantly.`
        : `No statistically significant difference between group means (F=${fStat.toFixed(2)}, p=${pValue.toFixed(4)}).`,
    };
  }

  private static runMannWhitneyU(a: number[], b: number[], alpha: number): HypothesisTestResult {
    const n1 = a.length, n2 = b.length;
    if (n1 < 2 || n2 < 2) {
      throw new StatisticsToolError('Mann-Whitney U requires at least 2 samples per group', 'INSUFFICIENT_DATA');
    }

    const combined = [
      ...a.map(val => ({ val, group: 'A' })),
      ...b.map(val => ({ val, group: 'B' })),
    ].sort((x, y) => x.val - y.val);

    let rankSumA = 0;
    for (let i = 0; i < combined.length; i++) {
      if (combined[i].group === 'A') {
        rankSumA += i + 1;
      }
    }

    const u1 = rankSumA - (n1 * (n1 + 1)) / 2;
    const u2 = n1 * n2 - u1;
    const uStat = Math.min(u1, u2);

    const meanU = (n1 * n2) / 2;
    const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const z = (uStat - meanU) / (stdU || 1e-9);

    const pValue = 2 * (1 - this.normalCdf(Math.abs(z)));
    const isSignificant = pValue < alpha;

    return {
      testType: 'mann_whitney_u',
      testStatistic: Number(uStat.toFixed(1)),
      pValue: Number(Math.max(0, Math.min(1, pValue)).toFixed(4)),
      isSignificant,
      alpha,
      interpretation: isSignificant
        ? `Non-parametric Mann-Whitney U test indicates significant distributional difference (U=${uStat.toFixed(1)}, p=${pValue.toFixed(4)}).`
        : `Non-parametric Mann-Whitney U test shows no significant difference (U=${uStat.toFixed(1)}, p=${pValue.toFixed(4)}).`,
    };
  }

  private static runChiSquare(table: number[][], alpha: number): HypothesisTestResult {
    const r = table.length;
    const c = table[0]?.length || 0;
    if (r < 2 || c < 2) {
      throw new StatisticsToolError('Chi-square contingency table must be at least 2x2', 'INVALID_INPUT');
    }

    const rowSums = table.map(row => row.reduce((x, y) => x + y, 0));
    const colSums = Array(c).fill(0);
    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        colSums[j] += table[i][j];
      }
    }
    const totalN = rowSums.reduce((x, y) => x + y, 0);

    let chiSq = 0;
    const is2x2 = r === 2 && c === 2;

    for (let i = 0; i < r; i++) {
      for (let j = 0; j < c; j++) {
        const expected = (rowSums[i] * colSums[j]) / (totalN || 1);
        const observed = table[i][j];
        const diff = Math.abs(observed - expected);
        const term = is2x2 && diff > 0.5 ? Math.pow(diff - 0.5, 2) : Math.pow(diff, 2);
        chiSq += term / (expected || 1e-9);
      }
    }

    const df = (r - 1) * (c - 1);
    const pValue = this.approximateChiSquarePValue(chiSq, df);
    const isSignificant = pValue < alpha;

    // Cramér's V
    const minDim = Math.min(r - 1, c - 1);
    const cramersV = Math.sqrt(chiSq / (totalN * minDim || 1));

    return {
      testType: 'chi_square_independence',
      testStatistic: Number(chiSq.toFixed(4)),
      pValue: Number(pValue.toFixed(4)),
      isSignificant,
      alpha,
      degreesOfFreedom: df,
      effectSize: Number(cramersV.toFixed(4)),
      effectSizeInterpretation: `Cramér's V = ${cramersV.toFixed(3)}`,
      interpretation: isSignificant
        ? `Statistically significant association between categorical variables (Chi-Sq=${chiSq.toFixed(2)}, df=${df}, p=${pValue.toFixed(4)}).`
        : `No statistically significant association between categorical variables (Chi-Sq=${chiSq.toFixed(2)}, df=${df}, p=${pValue.toFixed(4)}).`,
    };
  }

  private static approximateTPValue(t: number, df: number): number {
    const x = df / (df + t * t);
    const z = (Math.pow(x, 1 / 3) * (1 - 2 / (9 * df)) - 1) / Math.sqrt(2 / (9 * df));
    const p = 2 * (1 - this.normalCdf(Math.abs(t)));
    return Math.max(0, Math.min(1, p));
  }

  private static approximateFPValue(F: number, df1: number, df2: number): number {
    if (F <= 0) return 1.0;
    const term1 = 1 - 2 / (9 * df2);
    const term2 = 1 - 2 / (9 * df1);
    const fPow = Math.pow(F, 1 / 3);
    const numerator = term1 * fPow - term2;
    const denominator = Math.sqrt((2 / (9 * df2)) * Math.pow(F, 2 / 3) + 2 / (9 * df1));
    const z = numerator / (denominator || 1e-9);
    return Math.max(0, Math.min(1, 1 - this.normalCdf(z)));
  }

  private static approximateChiSquarePValue(chiSq: number, df: number): number {
    if (chiSq <= 0) return 1.0;
    const z = Math.sqrt(2 * chiSq) - Math.sqrt(2 * df - 1);
    return Math.max(0, Math.min(1, 1 - this.normalCdf(z)));
  }

  private static normalCdf(z: number): number {
    return 0.5 * (1 + this.approxErf(z / Math.SQRT2));
  }

  private static approxErf(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return sign * y;
  }
}
