import { PiiDetectionRecord } from './types.js';

export class PiiScanner {
  // Regex heuristics for PII detection
  private static EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private static CREDIT_CARD_REGEX = /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$/;
  private static SSN_REGEX = /^(?:\d{3}-\d{2}-\d{4}|\d{9})$/;
  private static PHONE_REGEX = /^(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/;
  private static IP_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;

  public static scanColumn(columnName: string, values: unknown[]): PiiDetectionRecord | undefined {
    const stringValues = values.filter(v => v !== null && v !== undefined && v !== '').map(String);
    if (stringValues.length === 0) return undefined;

    const lowerCol = columnName.toLowerCase();

    // 1. Email check
    const emailMatches = stringValues.filter(v => this.EMAIL_REGEX.test(v.trim()));
    if (emailMatches.length / stringValues.length > 0.4 || lowerCol.includes('email')) {
      return {
        columnName,
        piiType: 'email',
        confidence: emailMatches.length ? emailMatches.length / stringValues.length : 0.8,
        sampleMatches: emailMatches.slice(0, 3).map(e => {
          const [user, domain] = e.split('@');
          return `${user.slice(0, 2)}***@${domain || 'example.com'}`;
        }),
        riskLevel: 'medium',
      };
    }

    // 2. SSN check
    const ssnMatches = stringValues.filter(v => this.SSN_REGEX.test(v.trim().replace(/\s/g, '')));
    if (ssnMatches.length / stringValues.length > 0.4 || lowerCol.includes('ssn') || lowerCol.includes('social_security')) {
      return {
        columnName,
        piiType: 'ssn',
        confidence: ssnMatches.length ? ssnMatches.length / stringValues.length : 0.9,
        sampleMatches: ssnMatches.slice(0, 3).map(s => s.replace(/\d(?=\d{4})/g, '*')), // Masked
        riskLevel: 'high',
      };
    }

    // 3. Credit Card check
    const ccMatches = stringValues.filter(v => this.CREDIT_CARD_REGEX.test(v.trim().replace(/[-\s]/g, '')));
    if (ccMatches.length / stringValues.length > 0.3 || lowerCol.includes('credit_card') || lowerCol.includes('card_number')) {
      return {
        columnName,
        piiType: 'credit_card',
        confidence: ccMatches.length ? ccMatches.length / stringValues.length : 0.95,
        sampleMatches: ccMatches.slice(0, 3).map(c => '****-****-****-' + c.slice(-4)),
        riskLevel: 'high',
      };
    }

    // 4. Phone check
    const phoneMatches = stringValues.filter(v => this.PHONE_REGEX.test(v.trim()));
    if (phoneMatches.length / stringValues.length > 0.4 || lowerCol.includes('phone') || lowerCol.includes('mobile')) {
      return {
        columnName,
        piiType: 'phone_number',
        confidence: phoneMatches.length ? phoneMatches.length / stringValues.length : 0.8,
        sampleMatches: phoneMatches.slice(0, 3).map(p => p.slice(0, 4) + '***' + p.slice(-4)),
        riskLevel: 'low',
      };
    }

    return undefined;
  }
}
