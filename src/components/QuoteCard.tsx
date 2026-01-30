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

function formatPolishDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

function getScore(quote: Quote): number {
  return quote.upvotes - quote.downvotes;
}

// Format quote content with proper IRC nickname display
function formatContent(content: string): JSX.Element[] {
  const lines = content.split('\n');
  
  return lines.map((line, lineIndex) => {
    // Pattern to match IRC nicknames: <nick>, <@nick>, <+nick>, < nick>, etc.
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    
    // Regex to match IRC nicknames with optional prefix characters
    const nickRegex = /(<[@+%&~]?[\w\d_\-\[\]\\^{}|`]+>)/g;
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
  const score = getScore(quote);
  
  return (
    <article>
      {/* Quote bar (header row) - matching original structure */}
      <div className="bar clearfix">
        {/* Quote ID */}
        <span className="qid">
          {showLink ? (
            <a href={`/${quote.id}/`}>#{quote.id}</a>
          ) : (
            <span style={{ fontWeight: 'bold' }}>#{quote.id}</span>
          )}
        </span>
        
        {/* Vote buttons */}
        <span className="votes">
          <a href="#" onClick={(e) => e.preventDefault()}>+</a>
        </span>
        <span className="votes">
          <a href="#" onClick={(e) => e.preventDefault()}>-</a>
        </span>
        
        {/* Score */}
        <span className="points">{score.toLocaleString('pl-PL')}</span>
        
        {/* Date - floated right */}
        <span className="date">{formatPolishDate(quote.date)}</span>
      </div>
      
      {/* Quote content */}
      <div className="quote">{formatContent(quote.content)}</div>
    </article>
  );
}
