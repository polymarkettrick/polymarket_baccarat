import React from 'react';

interface BigRoadProps {
    board: number[][]; // 6 rows, N columns
    labels?: string[];
    maxCols?: number;
}

export const BigRoad: React.FC<BigRoadProps> = ({ board, labels = ["Yes", "No"], maxCols }) => {
    if (!board || board.length === 0) return null;

    // Ensure minimum rendering columns for aesthetics (e.g. 15 columns min)
    let totalCols = board[0].length;
    let startCol = 0;

    if (maxCols && totalCols > maxCols) {
        startCol = totalCols - maxCols;
        totalCols = maxCols;
    }

    // Aesthetic minimums (but bounded by maxCols if compact)
    let displayCols = Math.max(15, totalCols);
    if (maxCols) displayCols = maxCols;

    return (
        <div>
            <div style={{ fontSize: 'calc(13px * var(--text-scale-factor, 1))', color: 'var(--text-primary)', opacity: 0.8, marginBottom: '8px' }}>Big Road</div>
            <div className="grid-container">
                <div className="grid">
                    {Array.from({ length: displayCols }).map((_, i) => {
                        const colIndex = startCol + i;
                        return board.map((row, rowIndex) => {
                            const outcome = colIndex < board[rowIndex].length ? board[rowIndex][colIndex] : -1;

                            // Only use existing CSS classes regardless of label
                            const isFirstLabel = outcome === 1;

                            let className = 'cell empty';
                            if (isFirstLabel) className = `cell hollow-yes`;
                            if (!isFirstLabel && outcome === 0) className = `cell hollow-no`;

                            return <div key={`bigroad-${rowIndex}-${colIndex}`} className={className}></div>;
                        });
                    })}
                </div>
            </div>
        </div>
    );
};
