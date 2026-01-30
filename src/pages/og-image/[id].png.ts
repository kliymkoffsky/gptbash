import type { APIRoute } from 'astro';
import { ImageResponse } from '@vercel/og';
import quotesData from '../../data/quotes.json';

export function getStaticPaths() {
  return quotesData.quotes.map((quote) => ({
    params: { id: quote.id.toString() },
  }));
}

export const GET: APIRoute = async ({ params }) => {
  const quoteId = parseInt(params.id || '0', 10);
  const quote = quotesData.quotes.find((q) => q.id === quoteId);

  if (!quote) {
    return new Response('Quote not found', { status: 404 });
  }

  // Truncate quote content if too long for the image
  const maxLength = 500;
  const content = quote.content.length > maxLength 
    ? quote.content.substring(0, maxLength) + '...' 
    : quote.content;

  try {
    // Generate image matching the actual quote card design
    const html = {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#fff',
          fontFamily: 'monospace',
        },
        children: [
          // Top bar with ID (matching .bar style)
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                margin: '0',
                padding: '12px 20px',
                borderBottom: '1px solid #cfd1d1',
                backgroundColor: '#f4f4f4',
                color: '#565d5f',
              },
              children: {
                type: 'div',
                props: {
                  style: {
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#565d5f',
                    fontFamily: 'sans-serif',
                  },
                  children: `#${quote.id}`,
                },
              },
            },
          },
          // Quote content (matching .quote style)
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                margin: '0',
                padding: '20px',
                color: '#444',
                whiteSpace: 'pre-wrap',
                fontSize: '40px',
                lineHeight: '1.4',
                fontFamily: '"Lucida Console", "Monaco", "Courier New", monospace',
              },
              children: content,
            },
          },
        ],
      },
    };

    const imageResponse = new ImageResponse(html as any, {
      width: 1200,
      height: 630,
    });

    // Convert to buffer and return as PNG
    const buffer = await imageResponse.arrayBuffer();
    
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error generating OG image:', error);
    
    // Return a simple fallback response
    return new Response('Error generating image', { status: 500 });
  }
};
