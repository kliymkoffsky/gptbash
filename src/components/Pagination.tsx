import './pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export default function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  if (totalPages <= 1) return null;
  
  // Generate URL for a page number
  const getPageUrl = (page: number): string => {
    if (page === 1) {
      return `${baseUrl}/`;
    }
    return `${baseUrl}/${page}/`;
  };
  
  // Generate page numbers to display
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    
    // Always show first page
    pages.push(1);
    
    // Show ellipsis if current page is far from start
    if (currentPage > 4) {
      pages.push('...');
    }
    
    // Show pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }
    
    // Show ellipsis if current page is far from end
    if (currentPage < totalPages - 3) {
      pages.push('...');
    }
    
    // Always show last page
    if (totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  const pageNumbers = getPageNumbers();
  
  return (
    <div className="pagination">
      {/* Previous */}
      {currentPage > 1 ? (
        <a href={getPageUrl(currentPage - 1)} className="prev">«</a>
      ) : (
        <span className="prev disabled">«</span>
      )}
      
      {/* Page numbers */}
      {pageNumbers.map((page, index) => {
        if (page === '...') {
          return <span key={`ellipsis-${index}`} style={{ margin: '0 4px' }}>...</span>;
        }
        
        const pageNum = page as number;
        
        if (pageNum === currentPage) {
          return (
            <span key={pageNum} className="page current">
              {pageNum}
            </span>
          );
        }
        
        return (
          <a key={pageNum} href={getPageUrl(pageNum)} className="page">
            {pageNum}
          </a>
        );
      })}
      
      {/* Next */}
      {currentPage < totalPages ? (
        <a href={getPageUrl(currentPage + 1)} className="next">»</a>
      ) : (
        <span className="next disabled">»</span>
      )}
    </div>
  );
}
