import { computePagination } from '../../utils/pagination';

describe('computePagination', () => {
  it('uses default limit when no settings are provided', () => {
    const result = computePagination({ settings: null, resourceKey: 'content' });
    expect(result.limit).toBe(10);
    expect(result.maxLimit).toBe(100);
  });

  it('uses override limit when present and no limit param is provided', () => {
    const settings = {
      pagination: {
        defaultLimit: 10,
        maxLimit: 100,
        overrides: {
          content: { limit: 25, maxLimit: 50 },
        },
      },
    } as any;

    const result = computePagination({ settings, resourceKey: 'content' });
    expect(result.limit).toBe(25);
    expect(result.maxLimit).toBe(50);
  });

  it('clamps limit param to maxLimit', () => {
    const settings = {
      pagination: {
        defaultLimit: 10,
        maxLimit: 100,
        overrides: {
          scormPackages: { limit: 20, maxLimit: 30 },
        },
      },
    } as any;

    const result = computePagination({
      settings,
      resourceKey: 'scormPackages',
      limitParam: 60,
    });
    expect(result.limit).toBe(30);
  });

  it('uses limit param when valid and within bounds', () => {
    const settings = {
      pagination: {
        defaultLimit: 10,
        maxLimit: 100,
      },
    } as any;

    const result = computePagination({ settings, resourceKey: 'content', limitParam: 15 });
    expect(result.limit).toBe(15);
  });
});
