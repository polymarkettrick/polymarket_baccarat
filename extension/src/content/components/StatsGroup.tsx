import React from 'react';

interface StatsProps {
    currentStreak: number;
    longestStreak: number;
    yesPercentage: number;
    timeframe: string;
    labels: string[];
}

export const StatsGroup: React.FC<StatsProps> = ({ currentStreak, longestStreak, yesPercentage, timeframe, labels }) => {
    const formattedTimeframe = timeframe.toUpperCase();
    const index0Label = labels.length > 0 ? labels[0].toUpperCase() : 'YES';

    return (
        <div className="stats-row">
            <div className="stat-item">
                <span>{formattedTimeframe} Trend</span>
                <span className="stat-value">{currentStreak} Streak</span>
            </div>
            <div className="stat-item">
                <span>Max Streak</span>
                <span className="stat-value">{longestStreak}</span>
            </div>
            <div className="stat-item">
                <span>{index0Label} %</span>
                <span className="stat-value">{(yesPercentage * 100).toFixed(1)}%</span>
            </div>
        </div>
    );
};
