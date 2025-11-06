'use client';

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/frame-sdk';

type Cell = 'empty' | 'peg' | 'invalid';
type Board = Cell[][];

const INITIAL_BOARD: Board = [
  ['invalid', 'invalid', 'peg', 'peg', 'peg', 'invalid', 'invalid'],
  ['invalid', 'invalid', 'peg', 'peg', 'peg', 'invalid', 'invalid'],
  ['peg', 'peg', 'peg', 'peg', 'peg', 'peg', 'peg'],
  ['peg', 'peg', 'peg', 'empty', 'peg', 'peg', 'peg'],
  ['peg', 'peg', 'peg', 'peg', 'peg', 'peg', 'peg'],
  ['invalid', 'invalid', 'peg', 'peg', 'peg', 'invalid', 'invalid'],
  ['invalid', 'invalid', 'peg', 'peg', 'peg', 'invalid', 'invalid'],
];

interface Position {
  row: number;
  col: number;
}

interface LeaderboardEntry {
  fid: number;
  username: string;
  displayName: string;
  time: number;
  pegsRemaining: number;
  timestamp: number;
}

export default function PegSolitaire() {
  const [board, setBoard] = useState<Board>(INITIAL_BOARD);
  const [selectedPeg, setSelectedPeg] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [pegsRemaining, setPegsRemaining] = useState(32);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userFid, setUserFid] = useState<number | null>(null);
  const [username, setUsername] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');

  // Initialize Farcaster Frame SDK and get user info
  useEffect(() => {
    const initFrame = async () => {
      try {
        const context = await sdk.context;
        console.log('Frame context:', context);
        sdk.actions.ready();
        
        // Get user FID from context
        if (context.user?.fid) {
          setUserFid(context.user.fid);
          // Fetch user details from Neynar API
          fetchUserDetails(context.user.fid);
        }
      } catch (error) {
        console.error('Frame SDK initialization error:', error);
      }
    };
    initFrame();
    loadLeaderboard();
  }, []);

  const fetchUserDetails = async (fid: number) => {
    try {
      const response = await fetch(`/api/user-info?fid=${fid}`);
      if (response.ok) {
        const data = await response.json();
        setUsername(data.username);
        setDisplayName(data.displayName);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLeaderboard([]);
    }
  };

  const saveScore = async (pegsLeft: number) => {
    console.log('🎯 Attempting to save score...');
    console.log('User FID:', userFid);
    console.log('Username:', username);
    console.log('Timer:', timer);
    console.log('Pegs remaining:', pegsLeft);
    
    if (!userFid || !username) {
      console.log('❌ No user info available - not saving score');
      return;
    }

    try {
      const newEntry = {
        fid: userFid,
        username,
        displayName,
        time: timer,
        pegsRemaining: pegsLeft,
        timestamp: Date.now()
      };

      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard);
        console.log('✅ Score saved successfully!');
        console.log('New leaderboard:', data.leaderboard);
      }
    } catch (error) {
      console.error('❌ Error saving score:', error);
    }
  };

  // Timer
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Count pegs and check game status
  useEffect(() => {
    const count = board.flat().filter(cell => cell === 'peg').length;
    setPegsRemaining(count);
    
    if (count === 1) {
      // Victoire (1 pion peu importe où)
      setGameWon(true);
      setIsTimerRunning(false);
      saveScore(count);
    } else if (count > 1) {
      // Check if there are any valid moves left
      let movesExist = false;
      for (let row = 0; row < 7 && !movesExist; row++) {
        for (let col = 0; col < 7 && !movesExist; col++) {
          if (board[row][col] === 'peg') {
            const moves = getValidMovesForPeg(row, col);
            if (moves.length > 0) {
              movesExist = true;
            }
          }
        }
      }
      
      if (!movesExist) {
        // Game over - sauvegarde aussi le score
        setGameOver(true);
        setIsTimerRunning(false);
        saveScore(count);
      }
    }
  }, [board]);

  const getValidMovesForPeg = (row: number, col: number): Position[] => {
    const moves: Position[] = [];
    const directions = [
      { dr: -2, dc: 0, jr: -1, jc: 0 }, // up
      { dr: 2, dc: 0, jr: 1, jc: 0 },   // down
      { dr: 0, dc: -2, jr: 0, jc: -1 }, // left
      { dr: 0, dc: 2, jr: 0, jc: 1 },   // right
    ];

    directions.forEach(({ dr, dc, jr, jc }) => {
      const newRow = row + dr;
      const newCol = col + dc;
      const jumpRow = row + jr;
      const jumpCol = col + jc;

      if (
        newRow >= 0 && newRow < 7 &&
        newCol >= 0 && newCol < 7 &&
        board[newRow][newCol] === 'empty' &&
        board[jumpRow][jumpCol] === 'peg'
      ) {
        moves.push({ row: newRow, col: newCol });
      }
    });

    return moves;
  };

  const handleCellClick = (row: number, col: number) => {
    if (gameWon || gameOver) return;

    const cell = board[row][col];

    // Si on clique sur un peg
    if (cell === 'peg') {
      const moves = getValidMovesForPeg(row, col);
      setSelectedPeg({ row, col });
      setValidMoves(moves);
    }
    // Si on clique sur une destination valide
    else if (selectedPeg && validMoves.some(m => m.row === row && m.col === col)) {
      // Start timer on first move
      if (!hasStarted) {
        setHasStarted(true);
        setIsTimerRunning(true);
      }
      
      movePeg(selectedPeg, { row, col });
      setSelectedPeg(null);
      setValidMoves([]);
    }
    // Déselectionner
    else {
      setSelectedPeg(null);
      setValidMoves([]);
    }
  };

  const movePeg = (from: Position, to: Position) => {
    const newBoard = board.map(row => [...row]);
    const jumpRow = (from.row + to.row) / 2;
    const jumpCol = (from.col + to.col) / 2;

    newBoard[from.row][from.col] = 'empty';
    newBoard[jumpRow][jumpCol] = 'empty';
    newBoard[to.row][to.col] = 'peg';

    setBoard(newBoard);
  };

  const resetGame = () => {
    setBoard(INITIAL_BOARD);
    setSelectedPeg(null);
    setValidMoves([]);
    setGameWon(false);
    setGameOver(false);
    setTimer(0);
    setIsTimerRunning(false);
    setHasStarted(false);
  };

  const isValidMove = (row: number, col: number): boolean => {
    return validMoves.some(m => m.row === row && m.col === col);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes popIn {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .slide-down {
          animation: slideDown 0.4s ease-out;
        }

        .pop-in {
          animation: popIn 0.3s ease-out;
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #8B4513 0%, #654321 50%, #3E2723 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ maxWidth: '400px', width: '100%' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }} className="slide-down">
            <h1 style={{
              fontSize: '32px',
              fontWeight: '900',
              color: '#D4A574',
              margin: 0,
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              letterSpacing: '1px'
            }}>
              PEG SOLITAIRE
            </h1>
          </div>

          {/* Game Stats */}
          <div style={{
            background: 'rgba(139, 69, 19, 0.6)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px',
            border: '2px solid rgba(212, 165, 116, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '11px',
                color: '#D4A574',
                opacity: 0.8,
                margin: '0 0 4px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Pegs Left
              </p>
              <p style={{
                fontSize: '24px',
                fontWeight: '900',
                color: '#D4A574',
                margin: 0
              }}>
                {pegsRemaining}
              </p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '11px',
                color: '#D4A574',
                opacity: 0.8,
                margin: '0 0 4px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Time
              </p>
              <p style={{
                fontSize: '24px',
                fontWeight: '900',
                color: '#D4A574',
                margin: 0,
                fontVariantNumeric: 'tabular-nums'
              }}>
                {formatTime(timer)}
              </p>
            </div>
            <button
              onClick={resetGame}
              style={{
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #CD853F 0%, #8B4513 100%)',
                color: 'white',
                border: '2px solid rgba(212, 165, 116, 0.4)',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              NEW GAME
            </button>
          </div>

          {/* Game Board */}
          <div style={{
            background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)',
            padding: '16px',
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1)',
            border: '3px solid #654321'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px'
            }}>
              {board.map((row, rowIndex) => (
                row.map((cell, colIndex) => {
                  const isSelected = selectedPeg?.row === rowIndex && selectedPeg?.col === colIndex;
                  const isValid = isValidMove(rowIndex, colIndex);

                  if (cell === 'invalid') {
                    return <div key={`${rowIndex}-${colIndex}`} style={{ aspectRatio: '1' }} />;
                  }

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      style={{
                        aspectRatio: '1',
                        background: cell === 'empty' 
                          ? 'radial-gradient(circle, #654321 0%, #3E2723 100%)'
                          : isSelected
                          ? 'radial-gradient(circle, #FFD700 0%, #FFA500 100%)'
                          : 'radial-gradient(circle, #D2691E 0%, #8B4513 100%)',
                        borderRadius: '50%',
                        cursor: (cell === 'peg' || isValid) ? 'pointer' : 'default',
                        border: isValid 
                          ? '3px solid #90EE90'
                          : isSelected
                          ? '3px solid #FFD700'
                          : cell === 'peg'
                          ? '2px solid rgba(139, 69, 19, 0.5)'
                          : '2px solid rgba(101, 67, 33, 0.8)',
                        boxShadow: cell === 'peg'
                          ? 'inset 0 2px 4px rgba(255,255,255,0.2), 0 2px 6px rgba(0,0,0,0.3)'
                          : 'inset 0 2px 4px rgba(0,0,0,0.5)',
                        transition: 'transform 0.2s',
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                      }}
                    />
                  );
                })
              ))}
            </div>
          </div>

          {/* Win/Lose Messages */}
          {gameWon && (
            <div className="pop-in" style={{
              marginTop: '16px',
              background: 'linear-gradient(135deg, #228B22 0%, #006400 100%)',
              padding: '20px',
              borderRadius: '16px',
              textAlign: 'center',
              border: '2px solid rgba(144, 238, 144, 0.5)',
              boxShadow: '0 8px 24px rgba(34, 139, 34, 0.4)'
            }}>
              <p style={{
                fontSize: '24px',
                fontWeight: '900',
                color: 'white',
                margin: '0 0 8px 0'
              }}>
                🏆 YOU WIN! 🏆
              </p>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.9)',
                margin: 0
              }}>
                Perfect game in {formatTime(timer)}!
              </p>
            </div>
          )}

          {gameOver && !gameWon && (
            <div className="pop-in" style={{
              marginTop: '16px',
              background: 'linear-gradient(135deg, #B22222 0%, #8B0000 100%)',
              padding: '20px',
              borderRadius: '16px',
              textAlign: 'center',
              border: '2px solid rgba(255, 99, 71, 0.5)',
              boxShadow: '0 8px 24px rgba(178, 34, 34, 0.4)'
            }}>
              <p style={{
                fontSize: '24px',
                fontWeight: '900',
                color: 'white',
                margin: '0 0 8px 0'
              }}>
                GAME OVER
              </p>
              <p style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.9)',
                margin: 0
              }}>
                Time: {formatTime(timer)} - Try again!
              </p>
            </div>
          )}

          {/* Leaderboard Button */}
          <div style={{
            textAlign: 'center',
            marginTop: '16px'
          }}>
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              style={{
                padding: '12px 24px',
                background: 'rgba(139, 69, 19, 0.6)',
                color: '#D4A574',
                border: '2px solid rgba(212, 165, 116, 0.3)',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {showLeaderboard ? '🎮 HIDE LEADERBOARD' : '🏆 VIEW LEADERBOARD'}
            </button>
          </div>

          {/* Leaderboard */}
          {showLeaderboard && (
            <div className="pop-in" style={{
              marginTop: '16px',
              background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.9) 0%, rgba(101, 67, 33, 0.9) 100%)',
              borderRadius: '16px',
              padding: '20px',
              border: '2px solid rgba(212, 165, 116, 0.4)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '900',
                color: '#D4A574',
                marginBottom: '16px',
                margin: '0 0 16px 0',
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                🏆 Top 10 Leaderboard
              </h3>

              {leaderboard.length === 0 ? (
                <p style={{
                  textAlign: 'center',
                  color: '#D4A574',
                  opacity: 0.7,
                  fontSize: '14px',
                  margin: 0
                }}>
                  No scores yet. Be the first to win!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.fid}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: entry.fid === userFid 
                          ? 'rgba(255, 215, 0, 0.2)'
                          : 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '10px',
                        border: entry.fid === userFid
                          ? '2px solid #FFD700'
                          : '2px solid rgba(212, 165, 116, 0.2)'
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: index < 3
                          ? index === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)'
                          : index === 1 ? 'linear-gradient(135deg, #C0C0C0, #808080)'
                          : 'linear-gradient(135deg, #CD7F32, #8B4513)'
                          : 'rgba(212, 165, 116, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '900',
                        color: 'white',
                        flexShrink: 0
                      }}>
                        {index + 1}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: '14px',
                          fontWeight: '700',
                          color: '#D4A574',
                          margin: '0 0 2px 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {entry.displayName}
                        </p>
                        <p style={{
                          fontSize: '11px',
                          color: '#D4A574',
                          opacity: 0.7,
                          margin: 0
                        }}>
                          {entry.pegsRemaining} peg{entry.pegsRemaining > 1 ? 's' : ''}
                        </p>
                      </div>

                      <div style={{
                        fontSize: '16px',
                        fontWeight: '900',
                        color: entry.pegsRemaining === 1 ? '#FFD700' : '#CD853F',
                        fontVariantNumeric: 'tabular-nums',
                        flexShrink: 0
                      }}>
                        {formatTime(entry.time)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}