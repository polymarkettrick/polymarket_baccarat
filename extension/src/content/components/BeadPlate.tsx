import React from 'react';

interface BeadPlateProps {
    board: number[][]; // 6 rows, N columns
    labels?: string[]; // Determines context colors (Crypto vs Casino)
    maxCols?: number;
}

export const BeadPlate: React.FC<BeadPlateProps> = ({ board, labels = ["Yes", "No"], maxCols }) => {
    if (!board || board.length === 0) return null;

    let columns = board[0].length;
    let startCol = 0;
    if (maxCols && columns > maxCols) {
        startCol = columns - maxCols;
        columns = maxCols;
    }

    return (
        <div>
            <div style={{ fontSize: '13px', color: '#9ba1a6', marginBottom: '8px' }}>Bead Plate</div>
            <div className="grid-container">
                <div className="grid">
                    {Array.from({ length: columns }).map((_, i) => {
                        const colIndex = startCol + i;
                        return board.map((row, rowIndex) => {
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
