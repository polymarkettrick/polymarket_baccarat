import React from 'react';

export const Tooltip = ({ onClose }: { onClose: () => void }) => (
    <div className="tooltip">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>How to read Baccarat</strong>
            <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div style={{ marginTop: '4px' }}>
            Solid blue = YES, Hollow blue = YES streak.<br />
            Solid red = NO, Hollow red = NO streak.
        </div>
    </div>
);

export const SkeletonLoader = () => (
    <div className="loader-container">
        <div className="spinner"></div>
        <span style={{ marginLeft: '12px', color: '#9ba1a6', fontSize: '13px' }}>Computing historical trends...</span>
    </div>
);

export const ErrorState = ({ message }: { message: string }) => (
    <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div style={{ fontSize: '14px', fontWeight: 500 }}>Warning: Offline Mode</div>
        <div style={{ fontSize: '12px', color: '#9ba1a6', marginTop: '4px' }}>{message}</div>
    </div>
);
