import { LineageStore } from '@gordon/data-substrate';
import { ExtractedNumericClaim, ClaimVerificationResult } from './types.js';

export class LineageAuditor {
  private lineageStore: LineageStore;

  constructor(lineageStore: LineageStore) {
    this.lineageStore = lineageStore;
  }

  public auditClaim(sessionId: string, claim: ExtractedNumericClaim): ClaimVerificationResult {
    const trace = this.lineageStore.getTrace(sessionId);
    if (!trace) {
      return {
        claim,
        isVerified: false,
        status: 'unverified',
        auditReason: `Session '${sessionId}' not found in Lineage Store`,
      };
    }

    // 1. If explicit citation ID provided, look up direct record
    if (claim.sourceCitationId) {
      const toolExec = trace.toolExecutions.find(t => t.id === claim.sourceCitationId);
      if (toolExec) {
        return this.matchNumberInObject(claim, toolExec.rawOutput, toolExec.id, toolExec.toolName);
      }
    }

    // 2. Scan all tool executions in session trace for number matching
    for (const toolExec of trace.toolExecutions) {
      if (!toolExec.success) continue;
      const matchResult = this.matchNumberInObject(claim, toolExec.rawOutput, toolExec.id, toolExec.toolName);
      if (matchResult.isVerified) {
        return matchResult;
      }
    }

    // No matching logged tool result found
    return {
      claim,
      isVerified: false,
      status: 'unsupported',
      auditReason: `Number ${claim.rawText} (${claim.extractedNumber}) does not match any verified tool execution output in session lineage`,
    };
  }

  private matchNumberInObject(
    claim: ExtractedNumericClaim,
    rawOutputStr: string,
    toolId: string,
    toolName: string
  ): ClaimVerificationResult {
    let outputObj: any;
    try {
      outputObj = JSON.parse(rawOutputStr);
    } catch {
      outputObj = rawOutputStr;
    }

    const numbers = this.collectNumbersFromObject(outputObj);
    const target = claim.extractedNumber;

    for (const num of numbers) {
      // Relative tolerance check: within 0.1% or 0.05 absolute
      const diff = Math.abs(num - target);
      const isMatch = diff < 0.05 || (target !== 0 && diff / Math.abs(target) < 0.005);

      if (isMatch) {
        return {
          claim,
          isVerified: true,
          matchedLineageRecordId: toolId,
          matchedToolName: toolName,
          actualLoggedValue: num,
          deviation: diff,
          status: 'verified',
          auditReason: `Verified against tool '${toolName}' (${toolId}) logged value ${num}`,
        };
      }
    }

    return {
      claim,
      isVerified: false,
      matchedLineageRecordId: toolId,
      matchedToolName: toolName,
      status: 'inconsistent',
      auditReason: `Number ${claim.rawText} (${target}) does not match output values in cited tool '${toolName}'`,
    };
  }

  private collectNumbersFromObject(obj: any): number[] {
    const numbers: number[] = [];

    const traverse = (val: any) => {
      if (typeof val === 'number' && !isNaN(val)) {
        numbers.push(val);
      } else if (typeof val === 'string') {
        const parsed = parseFloat(val.replace(/,/g, ''));
        if (!isNaN(parsed)) numbers.push(parsed);
      } else if (Array.isArray(val)) {
        val.forEach(traverse);
      } else if (val !== null && typeof val === 'object') {
        Object.values(val).forEach(traverse);
      }
    };

    traverse(obj);
    return numbers;
  }
}
