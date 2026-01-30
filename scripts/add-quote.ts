#!/usr/bin/env npx tsx

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

interface Quote {
  uuid: string;
  id: number;
  content: string;
  date: string;
  upvotes: number;
  downvotes: number;
}

interface QuotesData {
  quotes: Quote[];
  meta: {
    totalAccepted: number;
    totalRejected: number;
    lastId: number;
  };
}

const QUOTES_PATH = path.join(process.cwd(), 'src/data/quotes.json');

function loadQuotes(): QuotesData {
  const data = fs.readFileSync(QUOTES_PATH, 'utf-8');
  return JSON.parse(data) as QuotesData;
}

function saveQuotes(data: QuotesData): void {
  // Update totalAccepted to match actual quote count
  data.meta.totalAccepted = data.quotes.length;
  fs.writeFileSync(QUOTES_PATH, JSON.stringify(data, null, 2));
}

function addQuote(content: string): Quote {
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
  saveQuotes(data);
  return newQuote;
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: npm run add-quote "quote content"');
  console.error('');
  console.error('Examples:');
  console.error('  npm run add-quote "Hello World"');
  console.error('  npm run add-quote "<@nick> This is an IRC quote"');
  console.error('');
  console.error('Multi-line quotes:');
  console.error('  npm run add-quote "<user1> First line');
  console.error('  <user2> Second line"');
  process.exit(1);
}

const content = args.join(' ');
const newQuote = addQuote(content);

console.log('Quote added successfully!');
console.log('');
console.log(`UUID: ${newQuote.uuid}`);
console.log(`ID: ${newQuote.id}`);
console.log(`Content: ${newQuote.content}`);
console.log(`Date: ${newQuote.date}`);
console.log('');
console.log(`View at: /${newQuote.id}/`);
console.log('');
console.log('Run "npm run build" to regenerate static pages.');
