import React from 'react';

interface BeadPlateProps {
    board: number[][]; // 6 rows, N columns
    labels?: string[]; // Determines context colors (Crypto vs Casino)
    maxCols?: number;
    hasUnlocked?: boolean;
    onUnlockRequest?: () => void;
    isUnlocking?: boolean;
    unlockExpiresAt?: number | null;
}

export const BeadPlate: React.FC<BeadPlateProps> = ({ board, maxCols, hasUnlocked = true, onUnlockRequest, isUnlocking = false, unlockExpiresAt }) => {
    const [timeLeft, setTimeLeft] = React.useState<string>('');

    React.useEffect(() => {
        if (!hasUnlocked || !unlockExpiresAt) return;
        const updateTimer = () => {
            const now = Date.now();
            const diff = unlockExpiresAt - now;
            if (diff <= 0) {
                setTimeLeft('');
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [hasUnlocked, unlockExpiresAt]);

    if (!board || board.length === 0) return null;

    let columns = board[0].length;
    let startCol = 0;
    if (maxCols && columns > maxCols) {
        startCol = columns - maxCols;
        columns = maxCols;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: 'calc(13px * var(--text-scale-factor, 1))', color: 'var(--text-primary)', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Bead Plate
                    {hasUnlocked && timeLeft && (
                        <span style={{ fontSize: 'calc(10px * var(--text-scale-factor, 1))', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: '#fbbf24', fontWeight: 'bold' }}>
                            {timeLeft}
                        </span>
                    )}
                </div>
                {!hasUnlocked && onUnlockRequest && (
                    <button
                        onClick={onUnlockRequest}
                        disabled={isUnlocking}
                        style={{
                            background: 'var(--blue-color)',
                            opacity: isUnlocking ? 0.5 : 1,
                            border: 'none',
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: 'calc(11px * var(--text-scale-factor, 1))',
                            cursor: isUnlocking ? 'not-allowed' : 'pointer',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {isUnlocking ? 'Unlocking...' : 'More Periods (1 Credit)'}
                    </button>
                )}
            </div>
            <div className="grid-container">
                <div className="grid">
                    {Array.from({ length: columns }).map((_, i) => {
                        const colIndex = startCol + i;
                        return board.map((_, rowIndex) => {
                            const outcome = board[rowIndex][colIndex];

                            // Only use existing CSS classes regardless of label
                            const isFirstLabel = outcome === 1;

                            let className = 'cell empty';
                            if (isFirstLabel) className = `cell solid-yes`;
                            if (!isFirstLabel && outcome === 0) className = `cell solid-no`;

                            return <div key={`bead-${rowIndex}-${colIndex}`} className={className}></div>;
                        });
                    })}
                </div>
            </div>
        </div>
    );
};
