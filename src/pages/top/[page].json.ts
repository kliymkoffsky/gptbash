import type { APIRoute } from 'astro';
import quotesData from '../../data/quotes.json';

const QUOTES_PER_PAGE = 20;

export function getStaticPaths() {
  const allQuotes = [...quotesData.quotes].sort(
    (a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes)
  );
  const totalPages = Math.ceil(allQuotes.length / QUOTES_PER_PAGE);

  return Array.from({ length: totalPages }, (_, i) => ({
    params: { page: String(i + 1) },
  }));
}

export const GET: APIRoute = ({ params }) => {
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10));

  const allQuotes = [...quotesData.quotes].sort(
    (a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes)
  );

  const totalPages = Math.ceil(allQuotes.length / QUOTES_PER_PAGE);
  const startIndex = (page - 1) * QUOTES_PER_PAGE;
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

