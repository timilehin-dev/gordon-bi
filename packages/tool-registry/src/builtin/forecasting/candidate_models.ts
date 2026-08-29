import { ModelBacktestScore, ForecastPoint } from './types.js';

export class ForecastingEngine {
  /**
   * Linear Trend Model: Y = a + b * t
   */
  public static fitLinear(values: number[]): { a: number; b: number; stdError: number } {
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let t = 0; t < n; t++) {
      sumX += t;
      sumY += values[t];
      sumXY += t * values[t];
      sumXX += t * t;
    }

    const b = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const a = (sumY - b * sumX) / n;

    let sse = 0;
    for (let t = 0; t < n; t++) {
      const pred = a + b * t;
      sse += Math.pow(values[t] - pred, 2);
    }
    const stdError = Math.sqrt(Math.max(0, sse / (n > 2 ? n - 2 : 1)));

    return { a, b, stdError };
  }

  /**
   * Exponential Smoothing (ETS) with alpha tuning
   */
  public static fitEts(values: number[], alpha = 0.3): { smoothed: number[]; lastLevel: number; stdError: number } {
    const n = values.length;
    const smoothed: number[] = [values[0]];

    for (let t = 1; t < n; t++) {
      smoothed.push(alpha * values[t] + (1 - alpha) * smoothed[t - 1]);
    }

    let sse = 0;
    for (let t = 1; t < n; t++) {
      sse += Math.pow(values[t] - smoothed[t - 1], 2);
    }
    const stdError = Math.sqrt(Math.max(0, sse / (n > 1 ? n - 1 : 1)));

    return { smoothed, lastLevel: smoothed[smoothed.length - 1], stdError };
  }

  /**
   * Rolling Backtest scoring over the last k periods
   */
  public static backtest(values: number[], testPeriods = 3): ModelBacktestScore[] {
    const n = values.length;
    if (n < 6) {
      return [
        { modelName: 'linear_trend', rmse: 0, mape: 0, mae: 0 },
        { modelName: 'exponential_smoothing', rmse: 0, mape: 0, mae: 0 },
      ];
    }

    const train = values.slice(0, n - testPeriods);
    const actuals = values.slice(n - testPeriods);

    // 1. Evaluate Linear
    const linearFit = this.fitLinear(train);
    const linearPreds = actuals.map((_, i) => linearFit.a + linearFit.b * (train.length + i));
    const linearScores = this.calcErrorMetrics(actuals, linearPreds);

    // 2. Evaluate ETS
    const etsFit = this.fitEts(train, 0.3);
    const etsPreds = actuals.map(() => etsFit.lastLevel);
    const etsScores = this.calcErrorMetrics(actuals, etsPreds);

    return [
      { modelName: 'linear_trend', ...linearScores },
      { modelName: 'exponential_smoothing', ...etsScores },
    ];
  }

  private static calcErrorMetrics(actuals: number[], preds: number[]): { rmse: number; mape: number; mae: number } {
    let sse = 0;
    let sae = 0;
    let sumApe = 0;
    const n = actuals.length;

    for (let i = 0; i < n; i++) {
      const err = actuals[i] - preds[i];
      sse += err * err;
      sae += Math.abs(err);
      if (actuals[i] !== 0) {
        sumApe += Math.abs(err / actuals[i]);
      }
    }

    return {
      rmse: Number(Math.sqrt(sse / n).toFixed(4)),
      mae: Number((sae / n).toFixed(4)),
      mape: Number(((sumApe / n) * 100).toFixed(2)),
    };
  }

  /**
   * Generate Forecast horizon with 80% & 95% Confidence Intervals
   */
  public static generateForecasts(
    values: number[],
    horizon: number,
    model: 'linear_trend' | 'exponential_smoothing'
  ): { forecasts: ForecastPoint[]; slope: number; rmse: number } {
    const n = values.length;
    const forecasts: ForecastPoint[] = [];

    if (model === 'linear_trend') {
      const fit = this.fitLinear(values);
      const z80 = 1.282;
      const z95 = 1.960;

      for (let h = 1; h <= horizon; h++) {
        const t = n + h - 1;
        const forecast = fit.a + fit.b * t;
        const seH = fit.stdError * Math.sqrt(1 + 1 / n + Math.pow(t - (n - 1) / 2, 2) / (n * (n * n - 1) / 12 || 1));

        forecasts.push({
          periodIndex: t + 1,
          label: `Period +${h}`,
          forecast: Number(forecast.toFixed(2)),
          lower80: Number((forecast - z80 * seH).toFixed(2)),
          upper80: Number((forecast + z80 * seH).toFixed(2)),
          lower95: Number((forecast - z95 * seH).toFixed(2)),
          upper95: Number((forecast + z95 * seH).toFixed(2)),
        });
      }
      return { forecasts, slope: fit.b, rmse: fit.stdError };
    } else {
      const fit = this.fitEts(values);
      const z80 = 1.282;
      const z95 = 1.960;

      for (let h = 1; h <= horizon; h++) {
        const seH = fit.stdError * Math.sqrt(h);
        forecasts.push({
          periodIndex: n + h,
          label: `Period +${h}`,
          forecast: Number(fit.lastLevel.toFixed(2)),
          lower80: Number((fit.lastLevel - z80 * seH).toFixed(2)),
          upper80: Number((fit.lastLevel + z80 * seH).toFixed(2)),
          lower95: Number((fit.lastLevel - z95 * seH).toFixed(2)),
          upper95: Number((fit.lastLevel + z95 * seH).toFixed(2)),
        });
      }
      return { forecasts, slope: 0, rmse: fit.stdError };
    }
  }
}
