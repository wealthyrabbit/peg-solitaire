import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN!,
});

interface LeaderboardEntry {
  fid: number;
  username: string;
  displayName: string;
  time: number;
  timestamp: number;
}

export async function GET() {
  try {
    const leaderboard = await redis.get<LeaderboardEntry[]>('peg-solitaire-leaderboard') || [];
    return NextResponse.json({ leaderboard });
  } catch {
    return NextResponse.json({ leaderboard: [] });
  }
}

export async function POST(request: Request) {
  try {
    const newEntry: LeaderboardEntry = await request.json();

    let leaderboard = await redis.get<LeaderboardEntry[]>('peg-solitaire-leaderboard') || [];

    const existingEntry = leaderboard.find(entry => entry.fid === newEntry.fid);
    
    if (existingEntry && existingEntry.time <= newEntry.time) {
      return NextResponse.json({ leaderboard, message: 'Score not better' });
    }

    leaderboard = leaderboard.filter(entry => entry.fid !== newEntry.fid);

    leaderboard.push(newEntry);

    leaderboard.sort((a, b) => a.time - b.time);
    leaderboard = leaderboard.slice(0, 10);

    await redis.set('peg-solitaire-leaderboard', leaderboard);

    return NextResponse.json({ leaderboard, message: 'Score saved' });
  } catch {
    return NextResponse.json(
      { error: 'Failed to save score' },
      { status: 500 }
    );
  }
}