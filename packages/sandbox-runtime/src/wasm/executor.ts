import { createContext, runInContext } from 'node:vm';
import { WasmSandboxLimits, WasmExecutionResult, ConsoleLogRecord } from './types.js';

export class AdHocCodeSandbox {
  private defaultLimits: Required<WasmSandboxLimits>;

  constructor(limits: WasmSandboxLimits = {}) {
    this.defaultLimits = {
      maxMemoryBytes: limits.maxMemoryBytes || 128 * 1024 * 1024, // 128MB
      timeoutMs: limits.timeoutMs ?? 120000, // 120 seconds default (configurable)
      allowNetwork: false,
      allowFs: false,
      isUserApproved: false,
    };
  }

  public getDefaultTimeoutMs(): number {
    return this.defaultLimits.timeoutMs;
  }

  public setDefaultTimeoutMs(timeoutMs: number): void {
    if (timeoutMs <= 0) throw new Error('Timeout must be greater than 0ms');
    this.defaultLimits.timeoutMs = timeoutMs;
  }

  public async runSnippet<T = unknown>(
    code: string,
    inputs: Record<string, unknown> = {},
    customLimits?: WasmSandboxLimits
  ): Promise<WasmExecutionResult<T>> {
    const limits = { ...this.defaultLimits, ...customLimits };
    const startTime = Date.now();
    const logs: ConsoleLogRecord[] = [];

    // Helper functions for data analytics inside the sandbox
    const StatsHelper = Object.freeze({
      sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
      mean: (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0),
      min: (arr: number[]) => Math.min(...arr),
      max: (arr: number[]) => Math.max(...arr),
      median: (arr: number[]) => {
        if (!arr.length) return 0;
        const s = [...arr].sort((a, b) => a - b);
        const m = Math.floor(s.length / 2);
        return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
      },
      variance: (arr: number[]) => {
        if (arr.length <= 1) return 0;
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        return arr.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / (arr.length - 1);
      },
      stdDev: (arr: number[]) => {
        if (arr.length <= 1) return 0;
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        return Math.sqrt(arr.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / (arr.length - 1));
      },
      movingAverage: (arr: number[], windowSize: number) => {
        if (windowSize <= 0 || arr.length === 0) return [];
        const result: number[] = [];
        for (let i = 0; i <= arr.length - windowSize; i++) {
          const window = arr.slice(i, i + windowSize);
          result.push(window.reduce((a, b) => a + b, 0) / windowSize);
        }
        return result;
      },
      correlation: (x: number[], y: number[]) => {
        if (x.length !== y.length || x.length <= 1) return 0;
        const n = x.length;
        const meanX = x.reduce((a, b) => a + b, 0) / n;
        const meanY = y.reduce((a, b) => a + b, 0) / n;
        let num = 0, denX = 0, denY = 0;
        for (let i = 0; i < n; i++) {
          const dx = x[i] - meanX;
          const dy = y[i] - meanY;
          num += dx * dy;
          denX += dx * dx;
          denY += dy * dy;
        }
        const den = Math.sqrt(denX * denY);
        return den === 0 ? 0 : num / den;
      },
    });

    const DataOpsHelper = Object.freeze({
      groupBy: <R extends Record<string, any>>(arr: R[], key: keyof R) => {
        return arr.reduce((acc, item) => {
          const group = String(item[key]);
          if (!acc[group]) acc[group] = [];
          acc[group].push(item);
          return acc;
        }, {} as Record<string, R[]>);
      },
      sortBy: <R extends Record<string, any>>(arr: R[], key: keyof R, order: 'asc' | 'desc' = 'asc') => {
        return [...arr].sort((a, b) => {
          if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
          if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
          return 0;
        });
      },
      distinct: <T>(arr: T[]) => Array.from(new Set(arr)),
    });

    // Isolated sandbox with zero ambient I/O capabilities
    const sandboxContext = Object.create(null);
    sandboxContext.inputs = Object.freeze({ ...inputs });
    sandboxContext.Stats = StatsHelper;
    sandboxContext.DataOps = DataOpsHelper;
    sandboxContext.Math = Math;
    sandboxContext.Date = Date;
    sandboxContext.JSON = JSON;
    sandboxContext.Array = Array;
    sandboxContext.Object = Object;
    sandboxContext.Number = Number;
    sandboxContext.String = String;
    sandboxContext.Boolean = Boolean;
    sandboxContext.BigInt = BigInt;
    sandboxContext.Intl = Intl;
    sandboxContext.RegExp = RegExp;
    sandboxContext.Map = Map;
    sandboxContext.Set = Set;
    sandboxContext.Promise = Promise;
    sandboxContext.structuredClone = structuredClone;
    sandboxContext.TextEncoder = TextEncoder;
    sandboxContext.TextDecoder = TextDecoder;

    // Logging capture
    sandboxContext.console = {
      log: (...args: any[]) => {
        logs.push({ level: 'log', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: Date.now() });
      },
      info: (...args: any[]) => {
        logs.push({ level: 'info', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: Date.now() });
      },
      warn: (...args: any[]) => {
        logs.push({ level: 'warn', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: Date.now() });
      },
      error: (...args: any[]) => {
        logs.push({ level: 'error', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: Date.now() });
      },
    };

    const context = createContext(sandboxContext, {
      name: 'AdHocAgentSandbox',
      codeGeneration: { strings: false, wasm: false },
    });

    try {
      // Wrap code in self-executing async function to support both synchronous & async snippet returns
      const wrappedCode = `
        (async function() {
          "use strict";
          ${code}
        })()
      `;

      const executionPromise = runInContext(wrappedCode, context, {
        timeout: limits.timeoutMs,
        displayErrors: true,
      });

      // Await promise result with overall timeout guard
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Code execution timed out after ${limits.timeoutMs}ms`)), limits.timeoutMs);
      });

      const result = await Promise.race([executionPromise, timeoutPromise]);
      const durationMs = Date.now() - startTime;

      return {
        success: true,
        result: result as T,
        durationMs,
        logs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      return {
        success: false,
        error: err.message || String(err),
        durationMs,
        logs,
      };
    }
  }
}
