import type { APIRoute } from 'astro';
import quotesData from '../data/quotes.json';

const QUOTES_PER_PAGE = 20;

export const GET: APIRoute = () => {
  const baseUrl = 'https://gptbash.com';
  
  // Static pages
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/latest/', priority: '0.9', changefreq: 'daily' },
    { url: '/top/', priority: '0.9', changefreq: 'daily' },
    { url: '/add/', priority: '0.8', changefreq: 'monthly' },
    { url: '/privacy/', priority: '0.5', changefreq: 'monthly' },
  ];
  
  // Individual quote pages
  const quotePages = quotesData.quotes.map((quote) => ({
    url: `/${quote.id}/`,
    lastmod: quote.date,
    priority: '0.8',
    changefreq: 'monthly'
  }));
  
  // Latest pagination pages
  const latestQuotes = [...quotesData.quotes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latestTotalPages = Math.ceil(latestQuotes.length / QUOTES_PER_PAGE);
  const latestPages = Array.from({ length: latestTotalPages - 1 }, (_, i) => ({
    url: `/latest/${i + 2}/`,
    priority: '0.7',
    changefreq: 'daily'
  }));
  
  // Top pagination pages
  const topQuotes = [...quotesData.quotes]
    .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
  const topTotalPages = Math.ceil(topQuotes.length / QUOTES_PER_PAGE);
  const topPages = Array.from({ length: topTotalPages - 1 }, (_, i) => ({
    url: `/top/${i + 2}/`,
    priority: '0.7',
    changefreq: 'daily'
  }));
  
  // Combine all pages
  const allPages = [...staticPages, ...quotePages, ...latestPages, ...topPages];
  
  // Generate sitemap XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    ${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ''}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap.trim(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
