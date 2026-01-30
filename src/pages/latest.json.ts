import type { APIRoute } from 'astro';
import quotesData from '../data/quotes.json';

const QUOTES_PER_PAGE = 20;

export const GET: APIRoute = () => {
  const allQuotes = [...quotesData.quotes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalPages = Math.ceil(allQuotes.length / QUOTES_PER_PAGE);
  const page = 1;
  const startIndex = 0;

  const quotes = allQuotes.slice(startIndex, startIndex + QUOTES_PER_PAGE);
  const nextPage = page < totalPages ? page + 1 : null;

  return new Response(
    JSON.stringify(
      {
        baseUrl: '/latest',
        page,
        totalPages,
        nextPage,
        nextJsonUrl: nextPage ? `/latest/${nextPage}.json` : null,
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

