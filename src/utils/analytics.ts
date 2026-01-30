/**
 * Google Analytics tracking utilities
 * Provides type-safe event tracking for user interactions
 */

declare global {
  interface Window {
    gtag?: (
      command: 'event',
      eventName: string,
      params?: Record<string, any>
    ) => void;
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, any>
): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

// Specific tracking functions for common events

export function trackVote(quoteId: number, voteType: 'upvote' | 'downvote' | 'remove_vote'): void {
  trackEvent('vote', {
    quote_id: quoteId,
    vote_type: voteType,
  });
}

export function trackQuoteView(quoteId: number): void {
  trackEvent('view_quote', {
    quote_id: quoteId,
  });
}

export function trackQuoteSubmit(hasAdultContent: boolean): void {
  trackEvent('quote_submit', {
    adult_content: hasAdultContent,
  });
}

export function trackCommandCopy(): void {
  trackEvent('copy_command', {
    action: 'clipboard',
  });
}

export function trackNavigation(destination: string): void {
  trackEvent('navigation', {
    destination,
  });
}

export function trackPagination(page: number, section: 'latest' | 'top'): void {
  trackEvent('pagination', {
    page_number: page,
    section,
  });
}

export function trackRandomQuote(): void {
  trackEvent('random_quote', {
    action: 'click',
  });
}

export function trackShare(quoteId: number, method: string): void {
  trackEvent('share', {
    quote_id: quoteId,
    method,
  });
}
