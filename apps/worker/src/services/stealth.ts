const ZERO_WIDTH_CHARS = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
const PUNCTUATION_VARIANTS: Record<string, string[]> = {
  '。': ['。', '．'],
  '！': ['！', '!'],
  '→': ['→', '⇒', '▶'],
};

export function addJitter(minMs: number, maxMs: number): Promise<void> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export function varyTemplate(template: string): string {
  // Find positions outside of {placeholder} tokens to avoid corrupting them
  const safePositions: number[] = [];
  let inPlaceholder = false;
  for (let i = 0; i < template.length; i++) {
    if (template[i] === '{') { inPlaceholder = true; continue; }
    if (template[i] === '}') { inPlaceholder = false; continue; }
    if (!inPlaceholder) safePositions.push(i);
  }
  let result = template;
  if (safePositions.length > 0) {
    const idx = safePositions[Math.floor(Math.random() * safePositions.length)];
    const zwc = ZERO_WIDTH_CHARS[Math.floor(Math.random() * ZERO_WIDTH_CHARS.length)];
    result = result.slice(0, idx) + zwc + result.slice(idx);
  }

  for (const [original, variants] of Object.entries(PUNCTUATION_VARIANTS)) {
    if (result.includes(original) && Math.random() > 0.5) {
      const variant = variants[Math.floor(Math.random() * variants.length)];
      result = result.replace(original, variant);
    }
  }

  return result;
}

const hourlyCounters = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(accountId: string, maxPerHour: number = 30): boolean {
  const now = Date.now();
  const counter = hourlyCounters.get(accountId);
  if (!counter || now > counter.resetAt) {
    hourlyCounters.set(accountId, { count: 0, resetAt: now + 3600_000 });
    return true;
  }
  return counter.count < maxPerHour;
}

export function incrementRateLimit(accountId: string): void {
  const counter = hourlyCounters.get(accountId);
  if (counter) counter.count++;
}
