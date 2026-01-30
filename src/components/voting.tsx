import React, { useState, useEffect } from 'react';
import './voting.css';

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
    } else {
      // Set new vote
      setUserVote(voteType);
      storeVote(quoteId, voteType);
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
        <span className="points">{(initialUpvotes - initialDownvotes).toLocaleString('pl-PL')}</span>
      </>
    );
  }

  return (
    <>
      <span className={`votes ${userVote === 'up' ? 'voted' : ''}`}>
        <a 
          href="#" 
          onClick={(e) => {
            e.preventDefault();
            handleVote('up');
          }}
          title={userVote === 'up' ? 'Cofnij głos' : 'Głosuj za'}
        >
          +
        </a>
      </span>
      <span className={`votes ${userVote === 'down' ? 'voted' : ''}`}>
        <a 
          href="#" 
          onClick={(e) => {
            e.preventDefault();
            handleVote('down');
          }}
          title={userVote === 'down' ? 'Cofnij głos' : 'Głosuj przeciw'}
        >
          -
        </a>
      </span>
      <span className="points">{score.toLocaleString('pl-PL')}</span>
    </>
  );
}
