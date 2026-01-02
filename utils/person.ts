export type PersonNameInput =
  | string
  | {
      first?: string;
      middle?: string;
      last?: string;
      display?: string;
    }
  | null
  | undefined;

export const normalizePersonName = (name: PersonNameInput) => {
  if (!name) {
    return undefined;
  }
  if (typeof name !== 'string') {
    return {
      first: name.first?.trim() || '',
      middle: name.middle?.trim() || undefined,
      last: name.last?.trim() || '',
      display: name.display?.trim() || undefined,
    };
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const middle = parts.length > 2 ? parts.slice(1, -1).join(' ') : undefined;
  return {
    first,
    middle,
    last,
  };
};

export const getPersonDisplayName = (name: PersonNameInput) => {
  if (!name) return '';
  if (typeof name === 'string') return name;
  if (name.display) return name.display;
  const first = name.first ? String(name.first).trim() : '';
  const last = name.last ? String(name.last).trim() : '';
  const middleInitial = name.middle ? ` ${String(name.middle).trim()[0]?.toUpperCase()}.` : '';
  if (!first && !last) return '';
  return `${last}, ${first}${middleInitial}`.trim();
};
