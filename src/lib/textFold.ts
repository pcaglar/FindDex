// Search folding: "İpek", "ipek", "IPEK" and "ıpek" must all match, and "Yildiz" must find "Yıldız".
// SQLite's lower()/LIKE only understand ASCII, so the same character table drives both a JS
// function (for the search term) and a generated SQL expression (for the stored columns).
// Both sides share one table, so they can never disagree; scripts/test-core-fixes.ts verifies that.

const LOWERCASE_FOLDS: Record<string, string> = {
  // Turkish
  'ı': 'i', 'ş': 's', 'ğ': 'g', 'ü': 'u', 'ö': 'o', 'ç': 'c',
  // Common Latin accents
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'ā': 'a', 'ą': 'a', 'æ': 'ae',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ē': 'e', 'ę': 'e', 'ě': 'e',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ī': 'i',
  'ñ': 'n', 'ń': 'n', 'ň': 'n',
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ø': 'o', 'ō': 'o', 'œ': 'oe',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ū': 'u', 'ů': 'u',
  'ý': 'y', 'ÿ': 'y',
  'ć': 'c', 'č': 'c', 'ď': 'd', 'đ': 'd', 'ł': 'l', 'ř': 'r', 'ś': 's', 'š': 's', 'ť': 't',
  'ź': 'z', 'ż': 'z', 'ž': 'z', 'ß': 'ss',
};

// Uppercase counterparts. SQLite lower() leaves them untouched, so each one is folded explicitly.
// "İ" (dotted capital I) is the Turkish special case; plain "I" is handled by ASCII lowercasing.
const FOLD_PAIRS: [string, string][] = [
  ...Object.entries(LOWERCASE_FOLDS),
  ['İ', 'i'],
  ...Object.entries(LOWERCASE_FOLDS)
    .map(([char, replacement]) => [char.toUpperCase(), replacement] as [string, string])
    .filter(([upper]) => upper.length === 1 && !(upper in LOWERCASE_FOLDS) && upper !== 'I'),
];

const FOLD_MAP = new Map(FOLD_PAIRS);
const FOLD_PATTERN = new RegExp(`[${[...FOLD_MAP.keys()].join('')}]`, 'g');

/** Lowercases ASCII only (exactly what SQLite's lower() does) after folding accents. */
export function foldText(value: string): string {
  return value
    .replace(FOLD_PATTERN, (char) => FOLD_MAP.get(char) ?? char)
    .replace(/[A-Z]/g, (char) => char.toLowerCase());
}

/** SQL expression that folds `expression` exactly like foldText(). `expression` must be trusted SQL. */
export function foldSql(expression: string): string {
  let sql = expression;
  for (const [char, replacement] of FOLD_PAIRS) sql = `replace(${sql}, '${char}', '${replacement}')`;
  return `lower(${sql})`;
}
