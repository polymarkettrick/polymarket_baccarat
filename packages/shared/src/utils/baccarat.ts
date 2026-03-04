export interface BaccaratStats {
    beadPlate: number[][]; // 6 rows, dynamic columns
    bigRoad: number[][];   // 6 rows, dynamic columns (-1 means empty)
    currentStreak: number;
    longestStreak: number;
    yesPercentage: number;
}

/**
 * Pure Function Engine for generating Baccarat tracking boards.
 * @param history Array of numerical outcomes (1 for YES, 0 for NO) ordered from oldest to newest.
 */
export function generateBaccaratBoard(history: number[]): BaccaratStats {
    if (!history || history.length === 0) {
        return { beadPlate: [], bigRoad: [], currentStreak: 0, longestStreak: 0, yesPercentage: 0 };
    }

    // 1. Bead Plate: Fixed 6 rows, fill top->bottom, left->right.
    const rows = 6;
    const cols = Math.ceil(history.length / rows);
    const beadPlate: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));

    for (let i = 0; i < history.length; i++) {
        const col = Math.floor(i / rows);
        const row = i % rows;
        beadPlate[row][col] = history[i];
    }

    // 2. Streak Stats
    let yesCount = 0;
    let currentStreak = 1;
    let longestStreak = 1;

    for (let i = 0; i < history.length; i++) {
        if (history[i] === 1) yesCount++;
        if (i > 0) {
            if (history[i] === history[i - 1]) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }
    }

    const yesPercentage = history.length > 0 ? yesCount / history.length : 0;

    // 3. Big Road
    // Logic: 
    // - Starts at 0, 0
    // - Matches previous: go down. If occupied or hit bottom (row 5), go right (Dragon Tail)
    // - Different from previous: start new column at row 0
    const bigRoadCoords: { outcome: number, x: number, y: number }[] = [];

    let currentX = 0;
    let currentY = 0;

    bigRoadCoords.push({ outcome: history[0], x: 0, y: 0 });

    const isOccupied = (x: number, y: number) =>
        bigRoadCoords.some(c => c.x === x && c.y === y);

    for (let i = 1; i < history.length; i++) {
        const currentOutcome = history[i];
        const prevOutcome = history[i - 1];

        if (currentOutcome === prevOutcome) {
            // Trying to go down
            if (currentY + 1 < 6 && !isOccupied(currentX, currentY + 1)) {
                currentY++;
            } else {
                // Dragon Tail logic: hit a block or bottom, sweep to the right
                currentX++;
            }
        } else {
            // Different outcome: find the next logical starting column for row 0
            let rightmostStartingCol = 0;
            for (const c of bigRoadCoords) {
                if (c.y === 0) {
                    rightmostStartingCol = Math.max(rightmostStartingCol, c.x);
                }
            }
            currentX = rightmostStartingCol + 1;
            currentY = 0;
        }
        bigRoadCoords.push({ outcome: currentOutcome, x: currentX, y: currentY });
    }

    // Convert abstract Big Road coordinates into a fixed readable matrix
    const maxCol = [...bigRoadCoords].reduce((max, c) => Math.max(max, c.x), 0);
    const bigRoad: number[][] = Array.from({ length: 6 }, () => Array(maxCol + 1).fill(-1));

    bigRoadCoords.forEach(c => {
        if (c.y < 6) {
            bigRoad[c.y][c.x] = c.outcome;
        }
    });

    return {
        beadPlate,
        bigRoad,
        currentStreak,
        longestStreak,
        yesPercentage
    };
}
