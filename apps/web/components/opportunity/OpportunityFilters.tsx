'use client';

import { Cross1Icon } from '@radix-ui/react-icons';

export interface FilterState {
  types: string[];
  efforts: Array<'XS' | 'S' | 'M' | 'L'>;
  beginnerOnly: boolean;
  sort: 'score' | 'freshness' | 'confidence';
}

interface Props {
  availableTypes: string[];
  value: FilterState;
  onChange: (next: FilterState) => void;
}

const EFFORTS: Array<'XS' | 'S' | 'M' | 'L'> = ['XS', 'S', 'M', 'L'];

const EFFORT_LABEL: Record<'XS' | 'S' | 'M' | 'L', string> = {
  XS: 'XS, minutes',
  S: 'S, under an hour',
  M: 'M, half a day',
  L: 'L, a day or more'
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function OpportunityFilters({ availableTypes, value, onChange }: Props) {
  const hasFilters =
    value.types.length > 0 ||
    value.efforts.length > 0 ||
    value.beginnerOnly ||
    value.sort !== 'score';

  return (
    <section aria-label="Filters" className="mt-8 space-y-6 border-y border-border py-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-subtle-foreground">Type</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {availableTypes.map((type) => {
              const active = value.types.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChange({ ...value, types: toggle(value.types, type) })}
                  aria-pressed={active}
                  className={`rounded-sm border px-2 py-1 font-mono text-xs transition-colors ${
                    active
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-subtle-foreground">Effort</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EFFORTS.map((effort) => {
              const active = value.efforts.includes(effort);
              return (
                <button
                  key={effort}
                  type="button"
                  onClick={() => onChange({ ...value, efforts: toggle(value.efforts, effort) })}
                  aria-pressed={active}
                  aria-label={EFFORT_LABEL[effort]}
                  className={`rounded-sm border px-2 py-1 font-mono text-xs transition-colors ${
                    active
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {effort}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-subtle-foreground">Options</p>
          <label className="mt-2 inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.beginnerOnly}
              onChange={(event) =>
                onChange({ ...value, beginnerOnly: event.target.checked })
              }
            />
            Beginner friendly only
          </label>
        </div>

        <div>
          <label
            htmlFor="sort"
            className="text-xs uppercase tracking-wider text-subtle-foreground"
          >
            Sort
          </label>
          <select
            id="sort"
            value={value.sort}
            onChange={(event) =>
              onChange({
                ...value,
                sort: event.target.value as FilterState['sort']
              })
            }
            className="mt-2 block h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="score">Score</option>
            <option value="freshness">Freshness</option>
            <option value="confidence">Confidence</option>
          </select>
        </div>
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={() =>
            onChange({ types: [], efforts: [], beginnerOnly: false, sort: 'score' })
          }
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Cross1Icon aria-hidden="true" />
          Clear filters
        </button>
      ) : null}
    </section>
  );
}