import { LineageStore } from '@gordon/data-substrate';
import { ClaimExtractor } from './claim_extractor.js';
import { LineageAuditor } from './lineage_auditor.js';
import { CriticAuditReport, ClaimVerificationResult } from './types.js';

export class CriticVerifierAgent {
  private auditor: LineageAuditor;

  constructor(lineageStore: LineageStore) {
    this.auditor = new LineageAuditor(lineageStore);
  }

  public auditNarrative(sessionId: string, narrativeText: string): CriticAuditReport {
    const claims = ClaimExtractor.extractClaims(narrativeText);
    const verificationResults: ClaimVerificationResult[] = [];
    const rejectionReasons: string[] = [];

    let verifiedCount = 0;
    let unsupportedCount = 0;
    let inconsistentCount = 0;

    for (const claim of claims) {
      const result = this.auditor.auditClaim(sessionId, claim);
      verificationResults.push(result);

      if (result.isVerified) {
        verifiedCount++;
      } else {
        if (result.status === 'inconsistent') {
          inconsistentCount++;
          rejectionReasons.push(`Inconsistency: "${claim.contextSentence}" (Claimed: ${claim.rawText}, Logged: ${result.actualLoggedValue || 'none'})`);
        } else {
          unsupportedCount++;
          rejectionReasons.push(`Unsourced Claim: "${claim.contextSentence}" (Number ${claim.rawText} not found in execution lineage)`);
        }
      }
    }

    const totalClaims = claims.length;
    const auditPassRate = totalClaims > 0 ? Number((verifiedCount / totalClaims).toFixed(3)) : 1.0;
    const isApproved = unsupportedCount === 0 && inconsistentCount === 0;

    return {
      sessionId,
      totalClaimsAudited: totalClaims,
      verifiedCount,
      unsupportedCount,
      inconsistentCount,
      isApproved,
      auditPassRate,
      claims: verificationResults,
      rejectionReasons,
    };
  }
}
