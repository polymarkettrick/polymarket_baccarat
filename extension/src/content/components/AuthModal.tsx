import React, { useState } from 'react';

interface AuthModalProps {
    onClose: () => void;
    onSuccess: (email: string) => void;
    contrast: { primary: string; secondary: string; inversePrimary: string };
    blueColor: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess, contrast, blueColor }) => {
    const [mode, setMode] = useState<'login' | 'signup'>('signup');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (mode === 'signup' && password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        // TODO: Replace with actual Supabase Auth call
        setTimeout(() => {
            setLoading(false);
            onSuccess(email || 'trader@example.com');
        }, 1000);
    };

    const handleGoogleAuth = () => {
        // TODO: Replace with Chrome Identity / Supabase OAuth
        onSuccess('google_user@example.com');
    };

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '20px'
        }}>
            <div style={{
                background: contrast.inversePrimary,
                color: contrast.primary,
                width: '100%', maxWidth: '320px',
                borderRadius: '8px', padding: '24px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                        {mode === 'login' ? 'Log In' : 'Sign Up'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: contrast.secondary, cursor: 'pointer', fontSize: '18px', padding: 0 }}>&times;</button>
                </div>

                {error && (
                    <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '4px', fontSize: '12px', border: '1px solid #ef4444' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Email</label>
                        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${contrast.secondary}`, background: 'transparent', color: contrast.primary }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Password</label>
                        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${contrast.secondary}`, background: 'transparent', color: contrast.primary }} />
                    </div>

                    {mode === 'signup' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Confirm Password</label>
                            <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: `1px solid ${contrast.secondary}`, background: 'transparent', color: contrast.primary }} />
                        </div>
                    )}

                    <button type="submit" disabled={loading} style={{
                        marginTop: '8px', padding: '10px', borderRadius: '4px',
                        background: blueColor, color: '#fff', border: 'none',
                        fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}>
                        {loading ? 'Processing...' : (mode === 'login' ? 'Log In' : 'Create Account')}
                    </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: contrast.secondary, fontSize: '12px', margin: '8px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: contrast.secondary, opacity: 0.3 }} />
                    <span>OR</span>
                    <div style={{ flex: 1, height: '1px', background: contrast.secondary, opacity: 0.3 }} />
                </div>

                <button onClick={handleGoogleAuth} style={{
                    padding: '10px', borderRadius: '4px', border: `1px solid ${contrast.secondary}`,
                    background: 'transparent', color: contrast.primary, fontWeight: 'bold',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    Continue with Google
                </button>

                <div style={{ textAlign: 'center', fontSize: '12px', marginTop: '8px' }}>
                    {mode === 'login' ? (
                        <>Don't have an account? <button onClick={() => setMode('signup')} style={{ background: 'transparent', border: 'none', color: blueColor, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Sign Up</button></>
                    ) : (
                        <>Already have an account? <button onClick={() => setMode('login')} style={{ background: 'transparent', border: 'none', color: blueColor, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Log In</button></>
                    )}
                </div>
            </div>
        </div>
    );
};
