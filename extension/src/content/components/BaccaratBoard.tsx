import React, { useState, useEffect, useRef } from 'react';
import { BeadPlate } from './BeadPlate';
import { BigRoad } from './BigRoad';
import { StatsGroup } from './StatsGroup';
import { SkeletonLoader, ErrorState } from './UIHelpers';
import { AuthModal } from './AuthModal';
import { BaccaratStats, generateBaccaratBoard } from '../../../../packages/shared/src/utils/baccarat';

interface BoardProps {
    loading: boolean;
    error: string | null;
    history: number[] | null;
    timeframe: string;
    labels: string[];
    eventSlug: string | null;
}

export const BaccaratBoard: React.FC<BoardProps> = ({ loading, error, history, timeframe, labels, eventSlug }) => {
    const [minimized, setMinimized] = useState(false);
    const [layoutMode, setLayoutMode] = useState<'floating' | 'sidebar'>('floating');
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isBoardEnabled, setIsBoardEnabled] = useState(false);

    // Auth & Credit States
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState<'login' | 'signup' | null>(null);
    const [credits, setCredits] = useState(10);
    const [userEmail, setUserEmail] = useState('');
    const [lastActive, setLastActive] = useState(Date.now());
    const [hasUnlocked, setHasUnlocked] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);

    // Compute stats from raw history
    const limit = hasUnlocked ? 50 : 15;
    const stats: BaccaratStats | null = React.useMemo(() => {
        if (!history) return null;
        return generateBaccaratBoard(history, limit);
    }, [history, limit]);

    // Phase 8 Appearance
    const [yesColor, setYesColor] = useState('#3b82f6');
    const [noColor, setNoColor] = useState('#ef4444');
    const [uiScale, setUiScale] = useState(100);
    const [bgColor, setBgColor] = useState('#121216');
    const [bgOpacity, setBgOpacity] = useState(85);

    // Drag State
    const [position, setPosition] = useState({ x: window.innerWidth - 424, y: window.innerHeight - 340 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Body shift effect for sidebar
    useEffect(() => {
        // Only apply shift if the sidebar is open and NOT minimized
        if (layoutMode === 'sidebar' && !minimized) {
            const shiftWidth = isExpanded ? `calc(600px * ${uiScale / 100})` : `calc(100px * ${uiScale / 100})`;
            document.documentElement.style.marginRight = shiftWidth;
            document.documentElement.style.transition = 'margin-right 0.3s ease';
        } else {
            document.documentElement.style.marginRight = '0px';
        }

        return () => {
            document.documentElement.style.marginRight = '0px';
        };
    }, [layoutMode, minimized, isExpanded]);

    // Persist and load layout mode & settings
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['polyLayoutMode', 'polyIsVisible', 'polyYesColor', 'polyNoColor', 'polyUiScale', 'polyBgColor', 'polyBgOpacity', 'polyPosition'], (res) => {
                if (res.polyLayoutMode) setLayoutMode(res.polyLayoutMode as 'floating' | 'sidebar');
                if (res.polyIsVisible !== undefined) setIsExpanded(Boolean(res.polyIsVisible));
                if (res.polyYesColor) setYesColor(String(res.polyYesColor));
                if (res.polyNoColor) setNoColor(String(res.polyNoColor));
                if (res.polyUiScale) setUiScale(Number(res.polyUiScale));
                if (res.polyBgColor) setBgColor(String(res.polyBgColor));
                if (res.polyBgOpacity !== undefined) setBgOpacity(Number(res.polyBgOpacity));
                if (res.polyPosition) setPosition(res.polyPosition as { x: number, y: number });
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
                if (changes.polyBgColor !== undefined) setBgColor(String(changes.polyBgColor.newValue));
                if (changes.polyBgOpacity !== undefined) setBgOpacity(Number(changes.polyBgOpacity.newValue));
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

    // Transient Board Toggle specific to this tab session
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            const messageListener = (request: any) => {
                if (request.type === 'TOGGLE_BOARD') {
                    setIsBoardEnabled(prev => !prev);
                }
            };
            chrome.runtime.onMessage.addListener(messageListener);
            return () => chrome.runtime.onMessage.removeListener(messageListener);
        }
    }, []);

    const toggleLayout = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newMode = layoutMode === 'floating' ? 'sidebar' : 'floating';
        setLayoutMode(newMode);
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ polyLayoutMode: newMode });
        }
    };

    // Subscribing to Supabase Auth State
    useEffect(() => {
        let mounted = true;
        import('../../core/supabase').then(({ supabase }) => {
            const fetchCredits = async () => {
                try {
                    const { data, error } = await supabase.rpc('claim_daily_credits');
                    if (data && mounted) setCredits(data.credits);
                    else if (error) {
                        const { data: profile } = await supabase.from('user_profiles').select('credits').single();
                        if (profile && mounted) setCredits(profile.credits);
                    }
                } catch (e) { console.error("Credit fetch error", e); }
            };

            supabase.auth.getSession().then(({ data: { session } }) => {
                if (!mounted) return;
                if (session) {
                    setIsAuthenticated(true);
                    setUserEmail(session.user.email || '');
                    fetchCredits();
                } else {
                    setIsAuthenticated(false);
                }
            });

            const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
                if (!mounted) return;
                if (event === 'SIGNED_IN' && session) {
                    setIsAuthenticated(true);
                    setUserEmail(session.user.email || '');
                    setLastActive(Date.now());
                    fetchCredits();
                } else if (event === 'SIGNED_OUT') {
                    setIsAuthenticated(false);
                    setUserEmail('');
                }
            });

            return () => {
                mounted = false;
                subscription.unsubscribe();
            };
        });
    }, []);

    // 24 Hour Auto-Logout Check
    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(() => {
            if (Date.now() - lastActive > 24 * 60 * 60 * 1000) {
                import('../../core/supabase').then(({ supabase }) => {
                    supabase.auth.signOut();
                });
            }
        }, 60000); // check every minute
        return () => clearInterval(interval);
    }, [isAuthenticated, lastActive]);

    // Update lastActive on interactions
    const handleInteraction = () => {
        if (isAuthenticated) setLastActive(Date.now());
    };

    const handleUnlock = async () => {
        if (!isAuthenticated) {
            setShowAuthModal('login');
            return;
        }
        if (credits < 1 || isUnlocking) return;

        const isConfirmed = window.confirm("Unlock 50 historical periods for this event?\n\nThis will deduct 1 Credit from your account.");
        if (!isConfirmed) return;

        setIsUnlocking(true);
        try {
            const { supabase } = await import('../../core/supabase');
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('user_profiles')
                    .update({ credits: credits - 1 })
                    .eq('id', user.id);

                if (!error) {
                    setCredits(prev => prev - 1);
                    setHasUnlocked(true);
                } else {
                    console.error("Failed to consume credit", error);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsUnlocking(false);
        }
    };

    const toggleExpand = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ polyIsVisible: !isExpanded });
        }
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
            const containerWidth = isExpanded ? 600 * (uiScale / 100) : 100 * (uiScale / 100);

            if (newX < 0) newX = 0;
            if (newX + containerWidth > window.innerWidth) newX = window.innerWidth - containerWidth;

            // Y is locked to 0 since floating is now 100vh
            setPosition({ x: newX, y: 0 });
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                // Save boundary position
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    chrome.storage.local.set({ polyPosition: position });
                }
            }
        }

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
    }, [isDragging, dragOffset, layoutMode, position]);

    // Translate HEX to RGB for opacity combination
    const hexToRgb = (hex: string) => {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '18, 18, 22';
    };

    // Calculate dynamic text color based on background luminance
    const getContrastYIQ = (hexcolor: string) => {
        hexcolor = hexcolor.replace("#", "");
        if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(c => c + c).join('');
        var r = parseInt(hexcolor.substring(0, 2), 16);
        var g = parseInt(hexcolor.substring(2, 4), 16);
        var b = parseInt(hexcolor.substring(4, 6), 16);
        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return {
            primary: (yiq >= 128) ? '#111827' : '#ffffff',
            secondary: (yiq >= 128) ? '#4b5563' : '#9ba1a6',
            inversePrimary: (yiq >= 128) ? '#ffffff' : '#111827'
        };
    };

    const contrast = getContrastYIQ(bgColor);

    // Scale logic is now capped at 100%
    const baseScale = uiScale / 100;

    const inlineStyles: React.CSSProperties = {
        ...(layoutMode === 'floating'
            ? { left: `${position.x}px`, top: '0px', bottom: '0px', right: 'auto', height: minimized ? '40px' : '100vh', overflow: 'hidden' }
            : { overflow: 'hidden' }),
        '--blue-color': yesColor,
        '--red-color': noColor,
        '--bg-color': `rgba(${hexToRgb(bgColor)}, ${bgOpacity / 100})`,
        '--bg-blur': `${Math.round((bgOpacity / 100) * 16)}px`,
        '--text-primary': contrast.primary,
        '--text-secondary': contrast.secondary,
        '--text-inverse': contrast.inversePrimary,
        '--grid-scale-factor': baseScale.toString(),
        '--text-scale-factor': Math.max(0.7, baseScale).toString(),
    } as any;

    const updateSetting = (key: string, value: any) => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ [key]: value });
        }
    };

    if (!isBoardEnabled) return null;

    return (
        <div
            ref={containerRef}
            className={`poly-baccarat-container ${minimized ? 'minimized' : ''} ${layoutMode === 'sidebar' ? 'sidebar-mode' : 'floating-mode'} ${isExpanded ? 'expanded-mode' : 'compact-mode'} ${showSettings ? 'settings-open' : ''}`}
            style={inlineStyles}
            onClick={(e) => {
                if (minimized) setMinimized(false);
                handleInteraction();
            }}
            onMouseMove={handleInteraction}
            onKeyDown={handleInteraction}
        >
            <div
                className="header"
                onMouseDown={handleMouseDown}
                style={{ cursor: layoutMode === 'floating' ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
                <div className="header-title" onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginRight: '4px' }}>
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Trend Analysis</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <button className="btn-icon" onClick={() => setShowSettings(!showSettings)} title="Open Appearance Settings">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    </button>
                    <button className="btn-icon" onClick={toggleExpand} title={`Switch to ${isExpanded ? 'Compact' : 'Expanded'} View`}>
                        {isExpanded ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        )}
                    </button>
                    <button className="btn-icon" onClick={toggleLayout} title={`Switch to ${layoutMode === 'floating' ? 'Sidebar' : 'Floating'} Mode`}>
                        {layoutMode === 'floating' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /></svg>
                        )}
                    </button>
                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }} title="Minimize">
                        {minimized ? '+' : '-'}
                    </button>
                    <button className="btn-close" onClick={(e) => { e.stopPropagation(); setIsBoardEnabled(false); }} title="Close Board">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            </div>

            {!minimized && !eventSlug && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: contrast.secondary, fontSize: '14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px', opacity: 0.5 }}>
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', color: contrast.primary }}>No Event Selected</div>
                    <div>Navigate to a specific Polymarket event page to view its historical trend.</div>
                </div>
            )}

            {!minimized && eventSlug && (
                <div style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {isAuthenticated ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: contrast.primary, fontSize: '12px', flex: 1, minWidth: 0 }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--blue-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', flexShrink: 0 }}>
                                    {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <span style={{ opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</span>
                                <button
                                    onClick={() => {
                                        import('../../core/supabase').then(({ supabase }) => supabase.auth.signOut());
                                        setIsAuthenticated(false);
                                        setHasUnlocked(false);
                                        setUserEmail('');
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: contrast.secondary, cursor: 'pointer', marginLeft: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Log Out"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                    🪙 {credits} Credits
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: contrast.secondary, fontSize: '12px' }}>
                                <span style={{ opacity: 0.8 }}>Log in to access 50-period history and AI predictions.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button onClick={() => setShowAuthModal('login')} style={{ background: 'transparent', border: `1px solid ${contrast.secondary}`, color: contrast.primary, fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', padding: '4px 10px', borderRadius: '4px' }}>Log In</button>
                                <button onClick={() => setShowAuthModal('signup')} style={{ background: 'var(--blue-color)', border: 'none', color: '#fff', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', padding: '4px 10px', borderRadius: '4px' }}>Sign Up</button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {showAuthModal && (
                <AuthModal
                    initialMode={showAuthModal}
                    onClose={() => setShowAuthModal(null)}
                    onSuccess={(email) => { setUserEmail(email); setIsAuthenticated(true); setShowAuthModal(null); }}
                    contrast={contrast}
                    blueColor={yesColor}
                />
            )}

            {!minimized && showSettings && eventSlug && (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.1)', flex: 1, color: contrast.primary }}>
                    <h3 style={{ margin: 0, fontSize: '16px', borderBottom: `1px solid ${contrast.secondary}`, paddingBottom: '8px' }}>Appearance</h3>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <label style={{ flex: 1, fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            Background
                            <input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); updateSetting('polyBgColor', e.target.value); }} style={{ width: '100%', height: '32px', padding: 0, border: `1px solid ${contrast.secondary}`, borderRadius: '4px', cursor: 'pointer' }} />
                        </label>
                        <label style={{ flex: 1, fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            Opacity: {bgOpacity}%
                            <input type="range" min="10" max="100" step="5" value={bgOpacity} onChange={(e) => { setBgOpacity(parseInt(e.target.value)); updateSetting('polyBgOpacity', parseInt(e.target.value)); }} style={{ width: '100%', marginTop: '8px' }} />
                        </label>
                    </div>

                    <label style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        Grid Scale: {uiScale}%
                        <input type="range" min="40" max="100" step="10" value={uiScale} onChange={(e) => { setUiScale(parseInt(e.target.value)); updateSetting('polyUiScale', parseInt(e.target.value)); }} style={{ width: '100%', marginTop: '8px' }} />
                    </label>

                    {layoutMode === 'floating' && (
                        <button
                            onClick={() => {
                                const resetPos = { x: window.innerWidth - (isExpanded ? 624 : 124), y: window.innerHeight - 340 };
                                setPosition(resetPos);
                                updateSetting('polyPosition', resetPos);
                            }}
                            style={{ background: contrast.primary, color: contrast.inversePrimary, border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' }}
                        >
                            Reset Draggable Position
                        </button>
                    )}

                    <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.8, lineHeight: '1.5' }}>
                        <strong>How to read Baccarat:</strong><br />
                        Solid {labels[0] || 'Up'} = {labels[0] || 'Up'} streak.<br />
                        Solid {labels[1] || 'Down'} = {labels[1] || 'Down'} streak.<br />
                        Hollow circles map to continuous streaks on the Big Road.
                    </div>

                    <button
                        onClick={() => setShowSettings(false)}
                        style={{ background: contrast.primary, color: contrast.inversePrimary, border: 'none', padding: '12px', borderRadius: '6px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold', fontSize: '14px' }}
                    >
                        Confirm & Close Settings
                    </button>
                </div>
            )}

            {!minimized && !showSettings && eventSlug && (
                <>
                    {loading && <SkeletonLoader />}

                    {error && <ErrorState message={error} />}

                    {!loading && !error && stats && (
                        <div className="top-half-content">
                            <div className="board-section">
                                <BeadPlate
                                    board={stats.beadPlate}
                                    labels={labels}
                                    maxCols={isExpanded ? 30 : 6}
                                    hasUnlocked={hasUnlocked}
                                    onUnlockRequest={handleUnlock}
                                    isUnlocking={isUnlocking}
                                />
                                <BigRoad board={stats.bigRoad} labels={labels} maxCols={isExpanded ? 30 : 6} />
                            </div>
                            {stats && (
                                <StatsGroup
                                    stats={stats}
                                    timeframe={timeframe}
                                    labels={labels}
                                />
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
