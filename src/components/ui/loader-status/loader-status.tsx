import type { JSX } from 'preact';

export const LOADER_TEXT = {
  loading: 'Loading…',
  endOfList: "That's all.",
  retry: 'try again',
} as const;

interface LoaderStatusProps {
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  onRetry?: () => void;
}

export function LoaderStatus({ loading, hasMore, error, onRetry }: LoaderStatusProps): JSX.Element | null {
  if (loading) {
    return <span>{LOADER_TEXT.loading}</span>;
  }
  
  if (error) {
    return (
      <span>
        Loading error: {error}{' '}
        <button
          type="button"
          onClick={() => onRetry?.()}
          style={{ background: 'none', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer', padding: 0, font: 'inherit' }}
        >
          {LOADER_TEXT.retry}
        </button>
      </span>
    );
  }
  
  if (!hasMore) {
    return <span>{LOADER_TEXT.endOfList}</span>;
  }
  
  return null;
}

// Helper to generate HTML strings for vanilla JS usage (Astro inline scripts)
export const LOADER_HTML = {
  loading: `<span>${LOADER_TEXT.loading}</span>`,
  loadingWithSentinel: `<span>${LOADER_TEXT.loading}</span><div data-sentinel style="height: 1px;"></div>`,
  endOfList: `<span>${LOADER_TEXT.endOfList}</span>`,
  error: (message: string) => 
    `<span>Loading error: ${message} <a href="#" data-retry>${LOADER_TEXT.retry}</a></span>`,
} as const;
