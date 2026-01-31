import './pagination.css';
import { trackPagination } from '../../../utils/analytics';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export default function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  if (totalPages <= 1) return null;
  
  // Determine section from baseUrl
  const section = baseUrl.includes('/top') ? 'top' : 'latest';
  
  // Handle pagination click tracking
  const handlePageClick = (page: number) => {
    trackPagination(page, section);
  };
  
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
    <nav className="pagination" aria-label="Pagination">
      {/* Previous */}
      {currentPage > 1 ? (
        <a 
          href={getPageUrl(currentPage - 1)} 
          className="prev" 
          aria-label="Previous page"
          onClick={(e) => {
            handlePageClick(currentPage - 1);
          }}
        >
          «
        </a>
      ) : (
        <span className="prev disabled" aria-hidden="true">«</span>
      )}
      
      {/* Page numbers */}
      {pageNumbers.map((page, index) => {
        if (page === '...') {
          return <span key={`ellipsis-${index}`} style={{ margin: '0 4px' }} aria-hidden="true">...</span>;
        }
        
        const pageNum = page as number;
        
        if (pageNum === currentPage) {
          return (
            <span key={pageNum} className="page current" aria-current="page">
              {pageNum}
            </span>
          );
        }
        
        return (
          <a 
            key={pageNum} 
            href={getPageUrl(pageNum)} 
            className="page" 
            aria-label={`Page ${pageNum}`}
            onClick={(e) => {
              handlePageClick(pageNum);
            }}
          >
            {pageNum}
          </a>
        );
      })}
      
      {/* Next */}
      {currentPage < totalPages ? (
        <a 
          href={getPageUrl(currentPage + 1)} 
          className="next" 
          aria-label="Next page"
          onClick={(e) => {
            handlePageClick(currentPage + 1);
          }}
        >
          »
        </a>
      ) : (
        <span className="next disabled" aria-hidden="true">»</span>
      )}
    </nav>
  );
}
