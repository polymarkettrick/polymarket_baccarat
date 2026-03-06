export interface BaccaratStats {
    beadPlate: number[][]; // 6 rows, dynamic columns
    bigRoad: number[][];   // 6 rows, dynamic columns (-1 means empty)
    recentPeriod: number;
    recentUpCount: number;
    recentDownCount: number;
    recentUpPercent: number;
    recentDownPercent: number;
    streakOf3Count: number;
    streakOf4Count: number;
}

/**
 * Pure Function Engine for generating Baccarat tracking boards.
 * @param history Array of numerical outcomes (1 for YES, 0 for NO) ordered from oldest to newest.
 */
export function generateBaccaratBoard(history: number[], limit: number = 15): BaccaratStats {
    if (!history || history.length === 0) {
        return {
            beadPlate: [],
            bigRoad: [],
            recentPeriod: limit,
            recentUpCount: 0,
            recentDownCount: 0,
            recentUpPercent: 0,
            recentDownPercent: 0,
            streakOf3Count: 0,
            streakOf4Count: 0
        };
    }

    const slicedHistory = history.slice(-limit);

    // 1. Bead Plate: Fixed 6 rows, fill top->bottom, left->right.
    const rows = 6;
    const cols = Math.ceil(slicedHistory.length / rows);
    const beadPlate: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));

    for (let i = 0; i < slicedHistory.length; i++) {
        const col = Math.floor(i / rows);
        const row = i % rows;
        beadPlate[row][col] = slicedHistory[i] ?? -1;
    }

    // 2. Recent Period Stats
    let recentUpCount = 0;
    let recentDownCount = 0;
    let streakOf3Count = 0;
    let streakOf4Count = 0;

    let currentTempStreak = 0;
    let lastOutcome = -1;

    for (let i = 0; i < slicedHistory.length; i++) {
        const val = slicedHistory[i] ?? -1;
        if (val === 1) recentUpCount++;
        if (val === 0) recentDownCount++;

        if (val === lastOutcome) {
            currentTempStreak++;
        } else {
            // Evaluated the completed streak before resetting
            if (currentTempStreak === 3) streakOf3Count++;
            if (currentTempStreak >= 4) streakOf4Count++; // Often 4+ is counted together, but if exactly 4 is needed we can change this. Assuming 4+ is more useful for baccarat logic. Let's do exactly 3 and exactly 4 for now as planned.
            currentTempStreak = 1;
            lastOutcome = val;
        }
    }
    // Check final trailing streak
    if (currentTempStreak === 3) streakOf3Count++;
    if (currentTempStreak >= 4) streakOf4Count++; // Adjusting to >= 4 as standard "long streak" metric based on prior interactions.

    const recentUpPercent = slicedHistory.length > 0 ? recentUpCount / slicedHistory.length : 0;
    const recentDownPercent = slicedHistory.length > 0 ? recentDownCount / slicedHistory.length : 0;

    // 3. Big Road
    // Logic: 
    // - Starts at 0, 0
    // - Matches previous: go down. If occupied or hit bottom (row 5), go right (Dragon Tail)
    // - Different from previous: start new column at row 0
    const bigRoadCoords: { outcome: number, x: number, y: number }[] = [];

    let currentX = 0;
    let currentY = 0;

    bigRoadCoords.push({ outcome: slicedHistory[0], x: 0, y: 0 });

    const isOccupied = (x: number, y: number) =>
        bigRoadCoords.some(c => c.x === x && c.y === y);

    for (let i = 1; i < slicedHistory.length; i++) {
        const currentOutcome = slicedHistory[i];
        const prevOutcome = slicedHistory[i - 1];

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
        recentPeriod: limit,
        recentUpCount,
        recentDownCount,
        recentUpPercent,
        recentDownPercent,
        streakOf3Count,
        streakOf4Count
    };
}
