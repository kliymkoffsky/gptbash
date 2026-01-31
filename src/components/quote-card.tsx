import './quote-card.css';
import Voting from './voting';
import { formatPolishDate, getISODateTime } from '../utils/formatters';
import { trackQuoteView } from '../utils/analytics';
import { normalizeQuoteContentForDisplay } from '../utils/quote-content';

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

// Format quote content with proper IRC nickname display
function formatContent(content: string): JSX.Element[] {
  const normalized = normalizeQuoteContentForDisplay(content);
  const lines = normalized.split('\n');
  
  return lines.map((line, lineIndex) => {
    // Pattern to match IRC nicknames: <nick>, <@nick>, <+nick>, < nick>, etc.
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    
    // Regex to match IRC nicknames with optional prefix characters
    const nickRegex = /(<[@+%&~]?[^\s<>]+>)/g;
    let match;
    
    while ((match = nickRegex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lineIndex}-${lastIndex}`}>
            {line.substring(lastIndex, match.index)}
          </span>
        );
      }
      
      // Add the nickname
      parts.push(
        <span key={`nick-${lineIndex}-${match.index}`}>
          {match[1]}
        </span>
      );
      
      lastIndex = match.index + match[1].length;
    }
    
    // Add remaining text after last match
    if (lastIndex < line.length) {
      parts.push(
        <span key={`text-${lineIndex}-${lastIndex}`}>
          {line.substring(lastIndex)}
        </span>
      );
    }
    
    // If no matches, just return the line as-is
    if (parts.length === 0) {
      parts.push(<span key={`line-${lineIndex}`}>{line}</span>);
    }
    
    return (
      <span key={`line-${lineIndex}`}>
        {parts}
        {lineIndex < lines.length - 1 && '\n'}
      </span>
    );
  });
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
