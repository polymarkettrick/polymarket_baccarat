import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../core/supabase';

const Popup = () => {
  const [user, setUser] = useState<any>(null);
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [yesColor, setYesColor] = useState('#3b82f6');
  const [noColor, setNoColor] = useState('#ef4444');
  const [uiScale, setUiScale] = useState(100);
  const [bgColor, setBgColor] = useState('#121216');
  const [bgOpacity, setBgOpacity] = useState(85);

  useEffect(() => {
    // Attempt real supabase auth, ignore errors if dummy
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user)).catch(() => { });
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user);
    });

    chrome.storage.local.get(['polyIsVisible', 'polyYesColor', 'polyNoColor', 'polyUiScale', 'polyBgColor', 'polyBgOpacity'], (res) => {
      setIsBoardVisible(Boolean(res.polyIsVisible));
      if (res.polyYesColor) setYesColor(String(res.polyYesColor));
      if (res.polyNoColor) setNoColor(String(res.polyNoColor));
      if (res.polyUiScale) setUiScale(Number(res.polyUiScale));
      if (res.polyBgColor) setBgColor(String(res.polyBgColor));
      if (res.polyBgOpacity !== undefined) setBgOpacity(Number(res.polyBgOpacity));
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const toggleBoard = () => {
    const next = !isBoardVisible;
    setIsBoardVisible(next);
    chrome.storage.local.set({ polyIsVisible: next });
  };

  const updateSetting = (key: string, value: any) => {
    chrome.storage.local.set({ [key]: value });
  };

  const login = async () => {
    try {
      if (import.meta.env.VITE_SUPABASE_URL) {
        await supabase.auth.signInWithOAuth({ provider: 'google' });
      } else {
        // Mock login for local testing without .env
        setUser({ email: 'local-tester@polymarket.com', id: 'mock-id' });
      }
    } catch (e) {
      setUser({ email: 'local-tester@polymarket.com', id: 'mock-id' });
    }
  };
  const logout = async () => {
    if (import.meta.env.VITE_SUPABASE_URL) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };
  const upgrade = () => {
    chrome.tabs.create({ url: 'https://buy.stripe.com/test_YOUR_LINK?client_reference_id=' + user?.id });
  };

  return (
    <div style={{ padding: '20px', width: '300px', fontFamily: 'Inter, sans-serif' }}>
      <h2>Polymarket Baccarat Config</h2>
      <p style={{ fontSize: '12px', color: '#666' }}>Authenticate to unlock 50-period Baccarat history natively on Polymarket charts.</p>

      {!user ? (
        <button onClick={login} style={{ width: '100%', padding: '10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Login with Google
        </button>
      ) : (
        <div>
          <p style={{ fontSize: '12px' }}>Logged in as: <strong>{user.email}</strong></p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={upgrade} style={{ flex: 1, padding: '10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              Upgrade (50 Periods)
            </button>
            <button onClick={logout} style={{ padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </div>
      )}
      <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #ccc' }} />

      <button onClick={toggleBoard} style={{ width: '100%', padding: '12px', background: isBoardVisible ? '#10b981' : '#6b7280', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', marginBottom: '16px' }}>
        {isBoardVisible ? 'Show Compact Board' : 'Show Expanded Board'}
      </button>

      {/* Customization Options */}
      <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>Appearance</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <label style={{ flex: 1, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Yes/Up Color
          <input type="color" value={yesColor} onChange={(e) => { setYesColor(e.target.value); updateSetting('polyYesColor', e.target.value); }} style={{ width: '100%' }} />
        </label>
        <label style={{ flex: 1, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          No/Down Color
          <input type="color" value={noColor} onChange={(e) => { setNoColor(e.target.value); updateSetting('polyNoColor', e.target.value); }} style={{ width: '100%' }} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <label style={{ flex: 1, fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          Background Color
          <input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); updateSetting('polyBgColor', e.target.value); }} style={{ width: '100%' }} />
        </label>
      </div>

      <label style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
        Background Opacity: {bgOpacity}%
        <input
          type="range"
          min="10" max="100" step="5"
          value={bgOpacity}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            setBgOpacity(val);
            updateSetting('polyBgOpacity', val);
          }}
          style={{ width: '100%' }}
        />
      </label>

      <label style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
        UI Scale: {uiScale}%
        <input
          type="range"
          min="60" max="140" step="10"
          value={uiScale}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            setUiScale(val);
            updateSetting('polyUiScale', val);
          }}
          style={{ width: '100%' }}
        />
      </label>

      <div style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
        Board toggles instantly on Polymarket pages.
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
