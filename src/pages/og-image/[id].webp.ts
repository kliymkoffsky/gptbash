import type { APIRoute } from 'astro';
import { ImageResponse } from '@vercel/og';
import sharp from 'sharp';
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
    // Generate image with 2.5x scale - content will naturally crop at edges
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
          transform: 'scale(2.5)',
          transformOrigin: 'top left',
        },
        children: [
          // Top bar with ID (matching .bar style)
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                margin: '0',
                padding: '8px 12px',
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
                padding: '12px',
                color: '#444',
                whiteSpace: 'pre-wrap',
                fontSize: '40px',
                lineHeight: '1.2',
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

    // Convert to PNG buffer first
    const pngBuffer = await imageResponse.arrayBuffer();
    
    // Convert PNG to WebP with extreme compression
    const webpBuffer = await sharp(Buffer.from(pngBuffer))
      .webp({ quality: 30, effort: 6 })
      .toBuffer();
    
    return new Response(webpBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error generating OG image:', error);
    
    // Return a simple fallback response
    return new Response('Error generating image', { status: 500 });
  }
};
