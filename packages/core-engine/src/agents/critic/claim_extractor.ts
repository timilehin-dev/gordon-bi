import { ExtractedNumericClaim } from './types.js';

export class ClaimExtractor {
  public static extractClaims(narrativeText: string): ExtractedNumericClaim[] {
    const claims: ExtractedNumericClaim[] = [];
    const rawSentences = narrativeText
      .split(/(?<=[.?!])\s+(?=[A-Z#"'\n]|\b[A-Z])/)
      .flatMap(s => s.split(/\n+/))
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const sentence of rawSentences) {
      // Extract citation if present: [cite: tool_123] or [cite: doc_456]
      const citeMatch = sentence.match(/\[(?:cite|ref):\s*([a-zA-Z0-9_\-:]+)\]/i);
      const citationId = citeMatch ? citeMatch[1] : undefined;

      const capturedRanges: Array<{ start: number; end: number }> = [];

      // 1. Currency patterns: $12,345.67, -$500.00
      for (const match of sentence.matchAll(/(-?)\$([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|\d+(?:\.\d+)?)/g)) {
        const raw = match[0];
        const start = match.index!;
        const end = start + raw.length;
        capturedRanges.push({ start, end });

        const sign = match[1] === '-' ? -1 : 1;
        const numVal = sign * parseFloat(match[2].replace(/,/g, ''));
        if (!isNaN(numVal)) {
          claims.push({
            rawText: raw,
            extractedNumber: numVal,
            claimType: 'currency',
            unit: '$',
            contextSentence: sentence,
            sourceCitationId: citationId,
          });
        }
      }

      // 2. Percentage patterns: 24.5%, -12%, 32%
      for (const match of sentence.matchAll(/(-?\d+(?:\.\d+)?)\s*%/g)) {
        const raw = match[0];
        const start = match.index!;
        const end = start + raw.length;
        capturedRanges.push({ start, end });

        const numVal = parseFloat(match[1]);
        if (!isNaN(numVal)) {
          claims.push({
            rawText: raw,
            extractedNumber: numVal,
            claimType: 'percentage',
            unit: '%',
            contextSentence: sentence,
            sourceCitationId: citationId,
          });
        }
      }

      // 3. General numbers: decimals, integers with commas, negative decimals
      for (const match of sentence.matchAll(/(-?\b[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?|-?\b\d+\.\d+)/g)) {
        const raw = match[0];
        const start = match.index!;
        const end = start + raw.length;

        // Skip if inside already captured currency/percentage range
        const overlaps = capturedRanges.some(r => (start >= r.start && start < r.end) || (end > r.start && end <= r.end));
        if (overlaps) continue;

        const numVal = parseFloat(raw.replace(/,/g, ''));
        const isYear = numVal >= 1990 && numVal <= 2035 && !raw.includes('.');

        if (!isNaN(numVal) && !isYear) {
          claims.push({
            rawText: raw,
            extractedNumber: numVal,
            claimType: raw.includes('.') ? 'decimal' : 'integer',
            contextSentence: sentence,
            sourceCitationId: citationId,
          });
        }
      }
    }

    return claims;
  }
}
