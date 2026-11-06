import React from 'react';
import { useStore } from '../../context/StoreContext';
import PageHead from '../../components/PageHead';
import SubNav from '../../components/SubNav';

export default function AppearanceSettings() {
  const { theme, setTheme, notify, user } = useStore();

  const handleSelectTheme = (newTheme) => {
    if (theme === newTheme) {
      notify(`Already using ${newTheme === 'light' ? 'Light' : 'Dark'} Theme`);
      return;
    }
    setTheme(newTheme);
    notify(`Switched and saved to ${newTheme === 'light' ? 'Light' : 'Dark'} Theme`);
  };

  const isLight = theme === 'light';
  const isDark = theme === 'dark';

  return (
    <>
      <PageHead
        title="Theme & Appearance"
        subtitle="Customize interface theme and visual display preferences"
      />
      <SubNav parentPath="/settings" />

      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Information Callout */}
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 10,
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 15, marginBottom: 2 }}>
              Display Preferences & Synchronization
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              Selected theme is saved to your account and persists across page refreshes, tab reloads, and re-logins.
            </div>
          </div>
          {user?.email && (
            <span
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 20,
                background: 'var(--panel-alt)',
                border: '1px solid var(--line)',
                color: 'var(--muted)',
              }}
            >
              Account: <strong>{user.email}</strong>
            </span>
          )}
        </div>

        {/* Theme Selection Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
          }}
        >
          {/* Light Theme Card */}
          <div
            onClick={() => handleSelectTheme('light')}
            style={{
              background: 'var(--panel)',
              borderRadius: 12,
              border: isLight ? '2px solid var(--teal)' : '1px solid var(--line)',
              boxShadow: isLight ? '0 0 0 3px rgba(14, 124, 123, 0.2)' : 'none',
              padding: 24,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            {isLight && (
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'var(--teal)',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: 6,
                  letterSpacing: '0.04em',
                }}
              >
                Active
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: '#EDF0F2',
                    border: '1px solid #DCE2E7',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 20,
                  }}
                >
                  ☀️
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>Light Theme</h3>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>High-contrast daylight interface</div>
                </div>
              </div>

              {/* Theme Mockup Box */}
              <div
                style={{
                  background: '#EDF0F2',
                  border: '1px solid #DCE2E7',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 6,
                    padding: '8px 12px',
                    border: '1px solid #DCE2E7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#16222F' }}>Dashboard Overview</span>
                  <span style={{ fontSize: 10, background: '#D7EEED', color: '#0E7C7B', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>Active</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, height: 16, background: '#FFFFFF', borderRadius: 4, border: '1px solid #DCE2E7' }} />
                  <div style={{ flex: 1, height: 16, background: '#FFFFFF', borderRadius: 4, border: '1px solid #DCE2E7' }} />
                  <div style={{ width: 24, height: 16, background: '#0E7C7B', borderRadius: 4 }} />
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 20px' }}>
                Bright, crisp styling with clean white cards and high-contrast dark text. Optimized for daytime hotel lobby operations and brightly lit offices.
              </p>
            </div>

            <button
              type="button"
              className={`btn ${isLight ? 'primary' : ''}`}
              style={{
                width: '100%',
                fontWeight: 600,
                padding: '10px 16px',
                borderRadius: 8,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectTheme('light');
              }}
            >
              {isLight ? '✓ Light Theme Selected' : 'Select Light Theme'}
            </button>
          </div>

          {/* Dark Theme Card */}
          <div
            onClick={() => handleSelectTheme('dark')}
            style={{
              background: 'var(--panel)',
              borderRadius: 12,
              border: isDark ? '2px solid var(--teal)' : '1px solid var(--line)',
              boxShadow: isDark ? '0 0 0 3px rgba(60, 183, 181, 0.2)' : 'none',
              padding: 24,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            {isDark && (
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'var(--teal)',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: 6,
                  letterSpacing: '0.04em',
                }}
              >
                Active
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: '#0D1620',
                    border: '1px solid #26364A',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 20,
                  }}
                >
                  🌙
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: 'var(--ink)' }}>Dark Theme</h3>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Deep dark night interface</div>
                </div>
              </div>

              {/* Theme Mockup Box */}
              <div
                style={{
                  background: '#0D1620',
                  border: '1px solid #26364A',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: '#15222F',
                    borderRadius: 6,
                    padding: '8px 12px',
                    border: '1px solid #26364A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#E6EDF3' }}>Dashboard Overview</span>
                  <span style={{ fontSize: 10, background: '#123837', color: '#3CB7B5', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>Active</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ flex: 1, height: 16, background: '#15222F', borderRadius: 4, border: '1px solid #26364A' }} />
                  <div style={{ flex: 1, height: 16, background: '#15222F', borderRadius: 4, border: '1px solid #26364A' }} />
                  <div style={{ width: 24, height: 16, background: '#3CB7B5', borderRadius: 4 }} />
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 20px' }}>
                Deep midnight slate surfaces with glowing teal accents. Gentle on the eyes, ideal for front desk night auditors and dim-lighting work.
              </p>
            </div>

            <button
              type="button"
              className={`btn ${isDark ? 'primary' : ''}`}
              style={{
                width: '100%',
                fontWeight: 600,
                padding: '10px 16px',
                borderRadius: 8,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectTheme('dark');
              }}
            >
              {isDark ? '✓ Dark Theme Selected' : 'Select Dark Theme'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

