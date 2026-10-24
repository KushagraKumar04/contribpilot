'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/lib/trpc/client';
import { OpportunityCard } from './OpportunityCard';
import { OpportunityFilters, type FilterState } from './OpportunityFilters';

const DEFAULT_FILTERS: FilterState = {
  types: [],
  efforts: [],
  beginnerOnly: false,
  sort: 'score'
};

export function OpportunitiesList({ analysisId }: { analysisId: string }) {
  const trpc = useTRPC();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const typesQuery = useQuery(
    trpc.opportunities.types.queryOptions({ analysisId })
  );

  const listQuery = useQuery(
    trpc.opportunities.list.queryOptions({
      analysisId,
      types: filters.types.length > 0 ? filters.types : undefined,
      efforts: filters.efforts.length > 0 ? filters.efforts : undefined,
      beginnerOnly: filters.beginnerOnly,
      sort: filters.sort,
      limit: 100
    })
  );

  if (listQuery.isLoading) {
    return (
      <div className="mt-10 space-y-4">
        <div className="h-6 w-40 animate-pulse rounded-sm bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-sm bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded-sm bg-muted" />
      </div>
    );
  }

  if (listQuery.error) {
    return (
      <p role="alert" className="mt-10 text-sm text-danger">
        {listQuery.error.message}
      </p>
    );
  }

  const rows = listQuery.data ?? [];
  const availableTypes = typesQuery.data ?? [];

  return (
    <div>
      <OpportunityFilters
        availableTypes={availableTypes}
        value={filters}
        onChange={setFilters}
      />

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        {rows.length === 0
          ? 'No opportunities match those filters.'
          : `${rows.length} ${rows.length === 1 ? 'opportunity' : 'opportunities'}`}
      </p>

      {rows.length > 0 ? (
        <ul className="mt-2 divide-y divide-border border-b border-border">
          {rows.map((row) => (
            <OpportunityCard
              key={row.id}
              id={row.id}
              type={row.type}
              title={row.title}
              summary={row.summary}
              effort={row.effort}
              beginner={row.beginner}
              score={row.score}
              duplicateRisk={row.duplicateRisk}
              inProgress={row.inProgress}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}