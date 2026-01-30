import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export interface Quote {
  uuid: string;
  id: number;
  content: string;
  date: string;
  upvotes: number;
  downvotes: number;
}

export interface QuotesData {
  quotes: Quote[];
  meta: {
    totalAccepted: number;
    totalRejected: number;
    lastId: number;
  };
}

const QUOTES_PATH = path.join(process.cwd(), 'src/data/quotes.json');

export function loadQuotes(): QuotesData {
  const data = fs.readFileSync(QUOTES_PATH, 'utf-8');
  return JSON.parse(data) as QuotesData;
}

export function saveQuotes(data: QuotesData): void {
  fs.writeFileSync(QUOTES_PATH, JSON.stringify(data, null, 2));
}

export function addQuote(content: string): Quote {
  const data = loadQuotes();
  const newQuote: Quote = {
    uuid: uuidv4(),
    id: data.meta.lastId + 1,
    content,
    date: new Date().toISOString(),
    upvotes: 0,
    downvotes: 0
  };
  data.quotes.push(newQuote);
  data.meta.lastId = newQuote.id;
  data.meta.totalAccepted += 1;
  saveQuotes(data);
  return newQuote;
}

export function getQuoteById(id: number): Quote | undefined {
  const data = loadQuotes();
  return data.quotes.find(q => q.id === id);
}

export function getQuoteByUuid(uuid: string): Quote | undefined {
  const data = loadQuotes();
  return data.quotes.find(q => q.uuid === uuid);
}

export function getLatestQuotes(limit = 20): Quote[] {
  const data = loadQuotes();
  return [...data.quotes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export function getTopQuotes(limit = 20): Quote[] {
  const data = loadQuotes();
  return [...data.quotes]
    .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
    .slice(0, limit);
}

export function getRandomQuote(): Quote {
  const data = loadQuotes();
  const randomIndex = Math.floor(Math.random() * data.quotes.length);
  return data.quotes[randomIndex];
}

export function getAllQuotes(): Quote[] {
  const data = loadQuotes();
  return data.quotes;
}

export function getQuoteScore(quote: Quote): number {
  return quote.upvotes - quote.downvotes;
}

export function formatPolishDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day} ${month} ${year} ${hours}:${minutes}`;
}
