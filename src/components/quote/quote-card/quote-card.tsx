import './quote-card.css';
import Voting from '../voting/voting';
import { formatPolishDate, getISODateTime } from '../../../utils/formatters';
import { trackQuoteView } from '../../../utils/analytics';
import { normalizeQuoteContentForDisplay } from '../../../utils/quote-content';

interface Quote {
  uuid: string;
  id: number;
  content: string;
  date: string;
  upvotes: number;
  downvotes: number;
}

interface QuoteCardProps {
  quote: Quote;
  showLink?: boolean;
}

// Escape HTML to prevent <nick> from being interpreted as tags
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Format quote content - matches Astro version output exactly
function formatContent(content: string): JSX.Element {
  const normalized = normalizeQuoteContentForDisplay(content);
  const escaped = escapeHtml(normalized);
  // Convert newlines to <br> tags to match Astro version
  const htmlContent = escaped.replace(/\n/g, '<br>');
  
  return <span dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}

export default function QuoteCard({ quote, showLink = true }: QuoteCardProps) {
  return (
    <article>
      {/* Quote bar (header row) - matching original structure */}
      <div className="bar clearfix">
        {/* Quote ID */}
        <span className="qid">
          {showLink ? (
            <a 
              href={`/${quote.id}/`}
              onClick={(_e) => {
                trackQuoteView(quote.id);
              }}
            >
              #{quote.id}
            </a>
          ) : (
            <span style={{ fontWeight: 'bold' }}>#{quote.id}</span>
          )}
        </span>
        
        {/* Voting component - client-side interactive */}
        <Voting 
          quoteId={quote.id}
          initialUpvotes={quote.upvotes}
          initialDownvotes={quote.downvotes}
        />
        
        {/* Date - floated right with semantic time element */}
        <time className="date" dateTime={getISODateTime(quote.date)}>
          {formatPolishDate(quote.date)}
        </time>
      </div>
      
      {/* Quote content */}
      <div className="quote">{formatContent(quote.content)}</div>
    </article>
  );
}
