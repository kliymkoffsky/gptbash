import type { APIRoute } from 'astro';
import quotesData from '../../data/quotes.json';

const QUOTES_PER_PAGE = 20;

export function getStaticPaths() {
  const allQuotes = [...quotesData.quotes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const totalPages = Math.ceil(allQuotes.length / QUOTES_PER_PAGE);

  return Array.from({ length: totalPages }, (_, i) => ({
    params: { page: String(i + 1) },
  }));
}

export const GET: APIRoute = ({ params }) => {
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10));

  const allQuotes = [...quotesData.quotes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalPages = Math.ceil(allQuotes.length / QUOTES_PER_PAGE);
  const startIndex = (page - 1) * QUOTES_PER_PAGE;
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

