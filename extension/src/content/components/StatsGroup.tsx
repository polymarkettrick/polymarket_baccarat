import React from 'react';

interface StatsProps {
    stats: {
        recentPeriod: number;
        recentUpCount: number;
        recentDownCount: number;
        recentUpPercent: number;
        recentDownPercent: number;
        streakOf3Count: number;
        streakOf4Count: number;
    };
    timeframe: string;
    labels: string[];
}

export const StatsGroup: React.FC<StatsProps> = ({ stats, labels }) => {
    const upLabel = labels.length > 0 ? labels[0].toUpperCase() : 'UP';
    const downLabel = labels.length > 1 ? labels[1].toUpperCase() : 'DOWN';

    return (
        <div className="hud-container-wrapper">
            <div className="stats-container">
                <div className="stat-block">
                    <span className="stat-label">Last {stats.recentPeriod} Periods</span>
                    <span className="stat-value" style={{ fontSize: 'calc(14px * var(--text-scale-factor, 1))' }}>
                        <span style={{ color: 'var(--blue-color)' }}>{upLabel}: {stats.recentUpCount} ({(stats.recentUpPercent * 100).toFixed(0)}%)</span>
                        <br />
                        <span style={{ color: 'var(--red-color)' }}>{downLabel}: {stats.recentDownCount} ({(stats.recentDownPercent * 100).toFixed(0)}%)</span>
                    </span>
                </div>
                <div className="stat-block">
                    <span className="stat-label">Streak Frequencies</span>
                    <span className="stat-value" style={{ fontSize: 'calc(14px * var(--text-scale-factor, 1))' }}>
                        3-Streak: {stats.streakOf3Count}
                        <br />
                        4-Streak+: {stats.streakOf4Count}
                    </span>
                </div>
                <div className="stat-block">
                    <span className="stat-label">AI Prediction</span>
                    <span className="stat-value" style={{ fontSize: 'calc(14px * var(--text-scale-factor, 1))', color: 'var(--accent-gold)' }}>[ MODEL UNAVAILABLE ]</span>
                </div>
            </div>
        </div>
    );
};
