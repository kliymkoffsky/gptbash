import React, { useEffect, useMemo, useRef, useState } from 'react';
import QuoteCard from './quote-card';
import Pagination from './Pagination';

interface Quote {
  uuid: string;
  id: number;
  content: string;
  date: string;
  upvotes: number;
  downvotes: number;
}

interface QuoteListProps {
  quotes: Quote[];
  currentPage?: number;
  totalPages?: number;
  baseUrl?: string;
  enableInfiniteScroll?: boolean;
}

export default function QuoteList({ 
  quotes, 
  currentPage = 1, 
  totalPages = 1,
  baseUrl = '',
  enableInfiniteScroll = false,
}: QuoteListProps) {
  if (quotes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
        Brak cytatów do wyświetlenia.
      </div>
    );
  }

  const [items, setItems] = useState<Quote[]>(quotes);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(
    currentPage < totalPages ? currentPage + 1 : null
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const getJsonUrl = useMemo(() => {
    return (page: number) => {
      if (!baseUrl) return null;
      if (page <= 1) return `${baseUrl}.json`;
      return `${baseUrl}/${page}.json`;
    };
  }, [baseUrl]);

  useEffect(() => {
    // If the server-rendered page changes (navigation), reset client state.
    setItems(quotes);
    setNextPage(currentPage < totalPages ? currentPage + 1 : null);
    setLoading(false);
    setLoadError(null);
  }, [quotes, currentPage, totalPages]);

  useEffect(() => {
    if (!enableInfiniteScroll) return;
    if (!sentinelRef.current) return;

    const el = sentinelRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (loading) return;
        if (nextPage === null) return;

        const url = getJsonUrl(nextPage);
        if (!url) return;

        setLoading(true);
        setLoadError(null);

        fetch(url)
          .then(async (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return (await res.json()) as {
              quotes: Quote[];
              nextPage: number | null;
            };
          })
          .then((data) => {
            setItems((prev) => [...prev, ...(data.quotes ?? [])]);
            setNextPage(data.nextPage ?? null);
          })
          .catch((err) => {
            setLoadError(err instanceof Error ? err.message : 'Failed to load next page');
          })
          .finally(() => {
            setLoading(false);
          });
      },
      { rootMargin: '600px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enableInfiniteScroll, getJsonUrl, loading, nextPage]);

  return (
    <div>
      {/* Top pagination */}
      {totalPages > 1 && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          baseUrl={baseUrl} 
        />
      )}
      
      {/* Quotes */}
      {items.map((quote) => (
        <QuoteCard key={quote.uuid} quote={quote} />
      ))}

      {enableInfiniteScroll && (
        <div style={{ margin: '10px 16px', color: '#666', fontSize: '12px' }}>
          {loading && <span>Ładowanie…</span>}
          {!loading && nextPage === null && <span>To już wszystko.</span>}
          {!loading && loadError && (
            <span>
              Błąd ładowania: {loadError}{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // Nudge observer by forcing a state update
                  setLoadError(null);
                }}
              >
                spróbuj ponownie
              </a>
            </span>
          )}
          {/* Sentinel for IntersectionObserver */}
          <div ref={sentinelRef} style={{ height: 1 }} />
        </div>
      )}
      
      {/* Bottom pagination */}
      {!enableInfiniteScroll && totalPages > 1 && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          baseUrl={baseUrl} 
        />
      )}
    </div>
  );
}
