export interface ExtractedNumericClaim {
  rawText: string;
  extractedNumber: number;
  claimType: 'currency' | 'percentage' | 'integer' | 'decimal';
  unit?: string;
  contextSentence: string;
  sourceCitationId?: string; // e.g. [cite: tool_123] or [cite: doc_456]
}

export interface ClaimVerificationResult {
  claim: ExtractedNumericClaim;
  isVerified: boolean;
  matchedLineageRecordId?: string;
  matchedToolName?: string;
  actualLoggedValue?: number;
  deviation?: number;
  status: 'verified' | 'unsupported' | 'inconsistent' | 'unverified';
  auditReason: string;
}

export interface CriticAuditReport {
  sessionId: string;
  totalClaimsAudited: number;
  verifiedCount: number;
  unsupportedCount: number;
  inconsistentCount: number;
  isApproved: boolean;
  auditPassRate: number; // 0.0 to 1.0 (1.0 = 100% verified)
  claims: ClaimVerificationResult[];
  rejectionReasons: string[];
}
