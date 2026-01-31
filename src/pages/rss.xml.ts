import type { APIRoute } from 'astro';
import quotesData from '../data/quotes.json';
import { formatRFC822Date } from '../utils/formatters';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = () => {
  // Sort quotes by date (newest first) and take top 20
  const latestQuotes = [...quotesData.quotes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  const items = latestQuotes.map(quote => `
    <item>
      <title>#${quote.id}</title>
      <link>https://gptbash.com/${quote.id}/</link>
      <guid>https://gptbash.com/${quote.id}/</guid>
      <pubDate>${formatRFC822Date(quote.date)}</pubDate>
      <description><![CDATA[${quote.content}]]></description>
    </item>`).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>gptbash.com</title>
    <link>https://gptbash.com/</link>
    <description>Funny IRC quotes</description>
    <language>en</language>
    <lastBuildDate>${formatRFC822Date(new Date().toISOString())}</lastBuildDate>
    <atom:link href="https://gptbash.com/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(rss.trim(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
};
