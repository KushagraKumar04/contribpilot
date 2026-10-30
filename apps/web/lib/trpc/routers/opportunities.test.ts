import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const Effort = z.enum(['XS', 'S', 'M', 'L']);

const ListInput = z.object({
  analysisId: z.string().uuid(),
  types: z.array(z.string()).optional(),
  efforts: z.array(Effort).optional(),
  beginnerOnly: z.boolean().optional(),
  minScore: z.number().min(0).max(100).optional(),
  sort: z.enum(['score', 'freshness', 'confidence']).default('score'),
  limit: z.number().int().min(1).max(200).default(100)
});

const FeedbackInput = z.object({
  opportunityId: z.string().uuid(),
  rating: z.union([z.literal(-1), z.literal(1)])
});

describe('opportunities.list input', () => {
  it('accepts a minimal valid input', () => {
    const parsed = ListInput.parse({ analysisId: '00000000-0000-0000-0000-000000000000' });
    expect(parsed.sort).toBe('score');
    expect(parsed.limit).toBe(100);
  });

  it('accepts multiple types and efforts', () => {
    const parsed = ListInput.parse({
      analysisId: '00000000-0000-0000-0000-000000000000',
      types: ['labeled_issue', 'docs_gap'],
      efforts: ['XS', 'S'],
      beginnerOnly: true,
      sort: 'freshness',
      limit: 50
    });
    expect(parsed.types).toEqual(['labeled_issue', 'docs_gap']);
    expect(parsed.efforts).toEqual(['XS', 'S']);
  });

  it('rejects unknown effort values', () => {
    expect(() =>
      ListInput.parse({
        analysisId: '00000000-0000-0000-0000-000000000000',
        efforts: ['XXL']
      })
    ).toThrow();
  });

  it('rejects limit above the cap', () => {
    expect(() =>
      ListInput.parse({
        analysisId: '00000000-0000-0000-0000-000000000000',
        limit: 999
      })
    ).toThrow();
  });
});

describe('opportunities.feedback input', () => {
  it('accepts a thumbs up', () => {
    const parsed = FeedbackInput.parse({
      opportunityId: '00000000-0000-0000-0000-000000000000',
      rating: 1
    });
    expect(parsed.rating).toBe(1);
  });

  it('accepts a thumbs down', () => {
    const parsed = FeedbackInput.parse({
      opportunityId: '00000000-0000-0000-0000-000000000000',
      rating: -1
    });
    expect(parsed.rating).toBe(-1);
  });

  it('rejects 0 as a rating', () => {
    expect(() =>
      FeedbackInput.parse({
        opportunityId: '00000000-0000-0000-0000-000000000000',
        rating: 0
      })
    ).toThrow();
  });
});