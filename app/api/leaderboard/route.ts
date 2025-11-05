import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

interface LeaderboardEntry {
  fid: number;
  username: string;
  displayName: string;
  time: number;
  timestamp: number;
}

// GET - Récupérer le leaderboard
export async function GET() {
  try {
    const leaderboard = await kv.get<LeaderboardEntry[]>('peg-solitaire-leaderboard') || [];
    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    return NextResponse.json({ leaderboard: [] });
  }
}

// POST - Sauvegarder un score
export async function POST(request: Request) {
  try {
    const newEntry: LeaderboardEntry = await request.json();

    // Charger le leaderboard actuel
    let leaderboard = await kv.get<LeaderboardEntry[]>('peg-solitaire-leaderboard') || [];

    // Vérifier si l'utilisateur a déjà un meilleur score
    const existingEntry = leaderboard.find(entry => entry.fid === newEntry.fid);
    
    if (existingEntry && existingEntry.time <= newEntry.time) {
      // L'utilisateur a déjà un meilleur ou égal score
      return NextResponse.json({ leaderboard, message: 'Score not better' });
    }

    // Retirer l'ancien score de l'utilisateur s'il existe
    leaderboard = leaderboard.filter(entry => entry.fid !== newEntry.fid);

    // Ajouter le nouveau score
    leaderboard.push(newEntry);

    // Trier par temps (croissant) et garder top 10
    leaderboard.sort((a, b) => a.time - b.time);
    leaderboard = leaderboard.slice(0, 10);

    // Sauvegarder
    await kv.set('peg-solitaire-leaderboard', leaderboard);

    return NextResponse.json({ leaderboard, message: 'Score saved' });
  } catch (error) {
    console.error('Error saving score:', error);
    return NextResponse.json(
      { error: 'Failed to save score' },
      { status: 500 }
    );
  }
}