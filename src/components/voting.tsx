import React, { useState, useEffect } from 'react';
import './voting.css';
import { formatNumber } from '../utils/formatters';
import { trackVote } from '../utils/analytics';

interface VotingProps {
  quoteId: number;
  initialUpvotes: number;
  initialDownvotes: number;
}

type VoteType = 'up' | 'down' | null;

function getStorageKey(quoteId: number): string {
  return `vote-${quoteId}`;
}

function getStoredVote(quoteId: number): VoteType {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(getStorageKey(quoteId));
  if (stored === 'up' || stored === 'down') return stored;
  return null;
}

function storeVote(quoteId: number, vote: VoteType): void {
  if (typeof window === 'undefined') return;
  const key = getStorageKey(quoteId);
  if (vote === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, vote);
  }
}

export default function Voting({ quoteId, initialUpvotes, initialDownvotes }: VotingProps) {
  const [userVote, setUserVote] = useState<VoteType>(null);
  const [mounted, setMounted] = useState(false);

  // Load stored vote on mount
  useEffect(() => {
    setMounted(true);
    const stored = getStoredVote(quoteId);
    setUserVote(stored);
  }, [quoteId]);

  // Calculate score with user's vote adjustment
  const getAdjustedScore = (): number => {
    let upvotes = initialUpvotes;
    let downvotes = initialDownvotes;

    if (userVote === 'up') {
      upvotes += 1;
    } else if (userVote === 'down') {
      downvotes += 1;
    }

    return upvotes - downvotes;
  };

  const handleVote = (voteType: 'up' | 'down') => {
    if (userVote === voteType) {
      // Clicking same vote again removes it
      setUserVote(null);
      storeVote(quoteId, null);
      trackVote(quoteId, 'remove_vote');
    } else {
      // Set new vote
      setUserVote(voteType);
      storeVote(quoteId, voteType);
      trackVote(quoteId, voteType === 'up' ? 'upvote' : 'downvote');
    }
  };

  const score = getAdjustedScore();

  // Show non-interactive version during SSR
  if (!mounted) {
    return (
      <>
        <span className="votes">
          <a href="#">+</a>
        </span>
        <span className="votes">
          <a href="#">-</a>
        </span>
        <span className="points">{formatNumber(initialUpvotes - initialDownvotes)}</span>
      </>
    );
  }

  return (
    <>
      <span className={`votes ${userVote === 'up' ? 'voted' : ''}`}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleVote('up');
          }}
          aria-label={userVote === 'up' ? 'Cofnij głos za' : 'Głosuj za cytat'}
          aria-pressed={userVote === 'up'}
          title={userVote === 'up' ? 'Cofnij głos' : 'Głosuj za'}
        >
          +
        </button>
      </span>
      <span className={`votes ${userVote === 'down' ? 'voted' : ''}`}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleVote('down');
          }}
          aria-label={userVote === 'down' ? 'Cofnij głos przeciw' : 'Głosuj przeciw cytatowi'}
          aria-pressed={userVote === 'down'}
          title={userVote === 'down' ? 'Cofnij głos' : 'Głosuj przeciw'}
        >
          -
        </button>
      </span>
      <span className="points" aria-live="polite" aria-atomic="true">
        {formatNumber(score)}
      </span>
    </>
  );
}
