import QuoteCard from './QuoteCard';
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
}

export default function QuoteList({ 
  quotes, 
  currentPage = 1, 
  totalPages = 1,
  baseUrl = ''
}: QuoteListProps) {
  if (quotes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
        No quotes to display.
      </div>
    );
  }
  
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
      {quotes.map((quote) => (
        <QuoteCard key={quote.uuid} quote={quote} />
      ))}
      
      {/* Bottom pagination */}
      {totalPages > 1 && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          baseUrl={baseUrl} 
        />
      )}
    </div>
  );
}
