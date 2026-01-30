import type { APIRoute } from 'astro';
import quotesData from '../data/quotes.json';

const QUOTES_PER_PAGE = 20;

export const GET: APIRoute = () => {
  const allQuotes = [...quotesData.quotes].sort(
    (a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes)
  );

  const totalPages = Math.ceil(allQuotes.length / QUOTES_PER_PAGE);
  const page = 1;
  const startIndex = 0;

  const quotes = allQuotes.slice(startIndex, startIndex + QUOTES_PER_PAGE);
  const nextPage = page < totalPages ? page + 1 : null;

  return new Response(
    JSON.stringify(
      {
        baseUrl: '/top',
        page,
        totalPages,
        nextPage,
        nextJsonUrl: nextPage ? `/top/${nextPage}.json` : null,
        quotes,
      },
      null,
      2
    ),
    {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    }
  );
};

