type RuleMap = Map<string, Map<string, string>>;

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '');

const normalizeCss = (css: string): string =>
  stripComments(css).replace(/\s+/g, ' ').trim().toLowerCase();

const parseRules = (css: string): RuleMap => {
  const map: RuleMap = new Map();
  const normalized = normalizeCss(css);
  const blocks = normalized.split('}');
  blocks.forEach((block) => {
    const [selectorRaw, bodyRaw] = block.split('{');
    if (!selectorRaw || !bodyRaw) return;
    const selectors = selectorRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const body = bodyRaw.trim();
    if (!body) return;
    const declarations = body.split(';').map((decl) => decl.trim());
    selectors.forEach((selector) => {
      if (!map.has(selector)) {
        map.set(selector, new Map());
      }
      const propMap = map.get(selector)!;
      declarations.forEach((decl) => {
        if (!decl) return;
        const [property, value] = decl.split(':').map((part) => part.trim());
        if (!property || !value) return;
        propMap.set(property, value);
      });
    });
  });
  return map;
};

export type CssDiff = {
  selector: string;
  property: string;
  expected?: string;
  actual?: string;
  weight: number;
};

export const PASSING_STYLE_SCORE = 80;

export const scoreCss = (
  masterCss: string,
  candidateCss: string,
  comparedToVersion: number
): { value: number; diffs: CssDiff[]; comparedToVersion: number; passingStyleScore: number } => {
  const masterMap = parseRules(masterCss);
  const candidateMap = parseRules(candidateCss);

  let missing = 0;
  let extra = 0;
  let mismatch = 0;
  const diffs: CssDiff[] = [];

  masterMap.forEach((masterProps, selector) => {
    const candidateProps = candidateMap.get(selector);
    if (!candidateProps) {
      masterProps.forEach((expected, property) => {
        missing += 1;
        diffs.push({ selector, property, expected, weight: 2 });
      });
      return;
    }
    masterProps.forEach((expected, property) => {
      if (!candidateProps.has(property)) {
        missing += 1;
        diffs.push({ selector, property, expected, weight: 2 });
        return;
      }
      const actual = candidateProps.get(property);
      if (actual !== expected) {
        mismatch += 1;
        diffs.push({ selector, property, expected, actual, weight: 3 });
      }
    });
  });

  candidateMap.forEach((candidateProps, selector) => {
    const masterProps = masterMap.get(selector);
    if (!masterProps) {
      candidateProps.forEach((actual, property) => {
        extra += 1;
        diffs.push({ selector, property, actual, weight: 1 });
      });
      return;
    }
    candidateProps.forEach((actual, property) => {
      if (!masterProps.has(property)) {
        extra += 1;
        diffs.push({ selector, property, actual, weight: 1 });
      }
    });
  });

  const score = Math.max(0, 100 - (missing * 2 + extra * 1 + mismatch * 3));
  const sortedDiffs = diffs.sort((a, b) => b.weight - a.weight).slice(0, 10);

  return { value: score, diffs: sortedDiffs, comparedToVersion, passingStyleScore: PASSING_STYLE_SCORE };
};
