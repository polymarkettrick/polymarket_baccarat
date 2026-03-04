import React, { useState, useEffect, useRef } from 'react';
import { BeadPlate } from './BeadPlate';
import { BigRoad } from './BigRoad';
import { StatsGroup } from './StatsGroup';
import { SkeletonLoader, ErrorState, Tooltip } from './UIHelpers';
import { BaccaratStats } from '../../../../packages/shared/src/utils/baccarat';

interface BoardProps {
    loading: boolean;
    error: string | null;
    stats: BaccaratStats | null;
    timeframe: string;
    labels: string[];
}

export const BaccaratBoard: React.FC<BoardProps> = ({ loading, error, stats, timeframe, labels }) => {
    const [minimized, setMinimized] = useState(false);
    const [showTooltip, setShowTooltip] = useState(true);
    const [layoutMode, setLayoutMode] = useState<'floating' | 'sidebar'>('floating');
    // Concise Bar state controlled by Popup
    const [isExpanded, setIsExpanded] = useState(false);

    // Phase 8 Appearance
    const [yesColor, setYesColor] = useState('#3b82f6');
    const [noColor, setNoColor] = useState('#ef4444');
    const [uiScale, setUiScale] = useState(100);

    // Drag State
    const [position, setPosition] = useState({ x: window.innerWidth - 424, y: window.innerHeight - 340 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Body shift effect for sidebar
    useEffect(() => {
        // Only apply shift if the sidebar is open and NOT minimized
        if (layoutMode === 'sidebar' && !minimized) {
            document.body.style.paddingRight = isExpanded ? '440px' : '140px';
            document.body.style.transition = 'padding-right 0.3s ease';
        } else {
            document.body.style.paddingRight = '0px';
        }

        return () => {
            document.body.style.paddingRight = '0px';
        };
    }, [layoutMode, minimized, isExpanded]);

    // Persist and load layout mode & settings
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['polyLayoutMode', 'polyIsVisible', 'polyYesColor', 'polyNoColor', 'polyUiScale'], (res) => {
                if (res.polyLayoutMode) setLayoutMode(res.polyLayoutMode as 'floating' | 'sidebar');
                if (res.polyIsVisible !== undefined) setIsExpanded(Boolean(res.polyIsVisible));
                if (res.polyYesColor) setYesColor(String(res.polyYesColor));
                if (res.polyNoColor) setNoColor(String(res.polyNoColor));
                if (res.polyUiScale) setUiScale(Number(res.polyUiScale));
            });
        }
    }, []);

    // Phase 8 Background Message Listeners (Now utilizing Storage for foolproof state broadcasts)
    useEffect(() => {
        const handleStorageChange = (changes: any, areaName: string) => {
            if (areaName === 'local') {
                if (changes.polyLayoutMode !== undefined) {
                    setLayoutMode(changes.polyLayoutMode.newValue);
                    setMinimized(false);
                }
                if (changes.polyIsVisible !== undefined) {
                    setIsExpanded(Boolean(changes.polyIsVisible.newValue));
                    setMinimized(false);
                }
                if (changes.polyYesColor !== undefined) setYesColor(String(changes.polyYesColor.newValue));
                if (changes.polyNoColor !== undefined) setNoColor(String(changes.polyNoColor.newValue));
                if (changes.polyUiScale !== undefined) setUiScale(Number(changes.polyUiScale.newValue));
            }
        };

        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.onChanged.addListener(handleStorageChange);
        }
        return () => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.onChanged.removeListener(handleStorageChange);
            }
        };
    }, []);

    const toggleLayout = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newMode = layoutMode === 'floating' ? 'sidebar' : 'floating';
        setLayoutMode(newMode);
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ polyLayoutMode: newMode });
        }
    };

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Disabling expand toggle for baseline rollback
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (layoutMode === 'sidebar') return; // Cannot drag in sidebar mode
        setIsDragging(true);
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || layoutMode === 'sidebar') return;
            // Bound inside window
            let newX = e.clientX - dragOffset.x;
            let newY = e.clientY - dragOffset.y;
            const containerWidth = 400; // Fixed width for floating

            if (newX < 0) newX = 0;
            if (newX + containerWidth > window.innerWidth) newX = window.innerWidth - containerWidth;
            if (newY < 0) newY = 0;
            // Give some buffer for bottom
            if (newY + 60 > window.innerHeight) newY = window.innerHeight - 60;

            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset, layoutMode]);



    // Apply inline positioning and CSS variable overrides
    const inlineStyles: React.CSSProperties = {
        ...(layoutMode === 'floating'
            ? { left: `${position.x}px`, top: `${position.y}px`, bottom: 'auto', right: 'auto' }
            : {}),
        '--blue-color': yesColor,
        '--red-color': noColor,
        '--grid-scale-factor': (uiScale / 100).toString(),
    } as any;

    return (
        <div
            ref={containerRef}
            className={`poly-baccarat-container ${minimized ? 'minimized' : ''} ${layoutMode === 'sidebar' ? 'sidebar-mode' : 'floating-mode'} ${isExpanded ? 'expanded-mode' : 'compact-mode'}`}
            style={inlineStyles}
            onClick={() => minimized && setMinimized(false)}
        >
            <div
                className="header"
                onMouseDown={handleMouseDown}
                style={{ cursor: layoutMode === 'floating' ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
                <div className="header-title" onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }} style={{ cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                    Trend Analysis
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="btn-icon" onClick={toggleExpand} title={`Currently Disabled for Baseline`} style={{ opacity: 0.5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <button className="btn-icon" onClick={toggleLayout} title={`Switch to ${layoutMode === 'floating' ? 'Sidebar' : 'Floating'} Mode`}>
                        {layoutMode === 'floating' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>
                        )}
                    </button>
                    <button className="btn-close" onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}>{minimized ? '+' : '-'}</button>
                </div>
            </div>

            {!minimized && (
                <>
                    {showTooltip && <div style={{ padding: '16px 16px 0 16px' }}><Tooltip onClose={() => setShowTooltip(false)} /></div>}

                    {loading && <SkeletonLoader />}

                    {error && <ErrorState message={error} />}

                    {!loading && !error && stats && (
                        <>
                            <div className="board-section">
                                <BeadPlate board={stats.beadPlate} labels={labels} maxCols={isExpanded ? 30 : 6} />
                                <BigRoad board={stats.bigRoad} labels={labels} maxCols={isExpanded ? 30 : 6} />
                            </div>
                            <StatsGroup
                                currentStreak={stats.currentStreak}
                                longestStreak={stats.longestStreak}
                                yesPercentage={stats.yesPercentage}
                                timeframe={timeframe}
                                labels={labels}
                            />
                        </>
                    )}
                </>
            )}
        </div>
    );
};
