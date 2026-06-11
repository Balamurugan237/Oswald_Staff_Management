import React, { useState } from 'react';
import { User, Lock, Mail } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { showToast } from '../utils';

export default function LoginView({ onLogin, staffList }) {
  const [role, setRole] = useState('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useMockMode, setUseMockMode] = useState(!isSupabaseConfigured ? true : localStorage.getItem('ossp_use_mock_mode') === 'true');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'admin') {
      setEmail('balamurugan16205@gmail.com');
    } else {
      setEmail('sneha.rao@oswaldstack.com');
    }
    setPassword('');
  };

  React.useEffect(() => {
    handleRoleSelect('staff');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      showToast('Validation Error', 'Please enter your email address.', 'warning');
      return;
    }

    setLoading(true);

    try {
      // ✅ Fallback to Mock Demo Mode if selected OR if Supabase is not configured
      if (useMockMode || !supabase) {
        localStorage.setItem('ossp_use_mock_mode', 'true');
        if (role === 'admin') {
          if (email.toLowerCase().trim() === 'balamurugan16205@gmail.com') {
            onLogin({ role: 'admin', email: email.toLowerCase().trim(), id: 'mock-admin' });
            showToast('Welcome Back (Demo)', 'Logged in as Administrator (Mock Mode).', 'success');
          } else {
            showToast('Access Denied', 'Invalid admin email address.', 'danger');
          }
        } else {
          // Find staff member from staffList
          const member = staffList?.find(
            s => s.email?.toLowerCase() === email.toLowerCase().trim()
          );

          if (member) {
            onLogin({ role: 'staff', member });
            showToast('Welcome (Demo)', `Hello ${member.name}. Staff Portal active (Mock Mode).`, 'success');
          } else {
            showToast('Access Denied', 'Email not found in staff roster. Try sneha.rao@oswaldstack.com', 'danger');
          }
        }
        setLoading(false);
        return;
      }

      // ✅ Real Supabase Auth (Password Check)
      if (!password) {
        showToast('Validation Error', 'Please enter your password.', 'warning');
        setLoading(false);
        return;
      }

      localStorage.setItem('ossp_use_mock_mode', 'false');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });

      if (error) {
        showToast('Access Denied', error.message || 'Invalid email or password.', 'danger');
        setLoading(false);
        return;
      }

      const user = data.user;
      const userRole = user?.user_metadata?.role ?? 'staff';

      if (userRole === 'admin') {
        onLogin({ role: 'admin', email: user.email, userId: user.id });
        showToast('Welcome Back', 'Logged in as Administrator.', 'success');
      } else {
        // Find staff member from staffList
        const member = staffList?.find(
          s => s.email?.toLowerCase() === user.email?.toLowerCase()
        );

        if (member) {
          onLogin({ role: 'staff', member, userId: user.id });
        } else {
          // Staff record not found — still login with basic info
          onLogin({
            role: 'staff',
            member: {
              id: user.id,
              name: user.user_metadata?.name ?? user.email,
              email: user.email,
              department: user.user_metadata?.department ?? '',
            },
            userId: user.id,
          });
        }
        showToast('Welcome', `Hello ${user.email}. Staff Portal active.`, 'success');
      }
    } catch (err) {
      console.error('Login error:', err);
      showToast('Error', err.message || 'Something went wrong. Please try again.', 'danger');
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <img src="/logo-icon.png" alt="Oswald Stack Logo" style={styles.logo} />
          <h1 style={styles.title}>Oswald Stack</h1>
          <p style={styles.subtitle}>Staff Attendance & Management Portal</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Select your role</label>
          <div style={styles.roleGrid}>

            {/* Staff Option */}
            <div
              style={{ ...styles.roleCard, ...(role === 'staff' ? styles.roleCardActive : {}) }}
              onClick={() => handleRoleSelect('staff')}
            >
              <div style={{ ...styles.iconWrapper, background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                <User size={24} />
              </div>
              <span style={role === 'staff' ? styles.roleTextActive : styles.roleText}>Staff</span>
            </div>

            {/* Admin Option */}
            <div
              style={{ ...styles.roleCard, ...(role === 'admin' ? styles.roleCardActive : {}) }}
              onClick={() => handleRoleSelect('admin')}
            >
              <div style={{ ...styles.iconWrapper, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <Lock size={24} />
              </div>
              <span style={role === 'admin' ? styles.roleTextActive : styles.roleText}>Admin</span>
            </div>

          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <Mail size={16} style={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@company.com"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.input}
                disabled={useMockMode}
                required={!useMockMode}
              />
            </div>
          </div>

          {/* Toggle Mock Mode Checkbox */}
          <div style={styles.checkboxContainer}>
            <label style={styles.checkboxLabel}>
              <input 
                type="checkbox" 
                checked={useMockMode} 
                onChange={(e) => setUseMockMode(e.target.checked)}
                disabled={!isSupabaseConfigured}
                style={styles.checkbox}
              />
              <span style={{ marginLeft: '8px' }}>
                Use Mock Demo Mode {!isSupabaseConfigured && <span style={{ color: '#6b7280', fontSize: '11px' }}>(Supabase keys offline)</span>}
              </span>
            </label>
          </div>

          <button type="submit" style={styles.loginBtn} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={styles.footer}>
          <span>{useMockMode ? 'Running in Offline Mock Mode' : 'Secured by Supabase Authentication'}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'radial-gradient(circle at top, #1e293b 0%, #0f172a 100%)',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    padding: '20px'
  },
  card: {
    background: '#0f1626',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '460px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  logo: { width: '48px', height: '48px', marginBottom: '8px' },
  title: { color: '#f3f4f6', fontSize: '28px', fontWeight: '700', margin: 0 },
  subtitle: { color: '#9ca3af', fontSize: '14px', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  label: { color: '#9ca3af', fontSize: '13px', fontWeight: '600', marginBottom: '6px', display: 'block' },
  roleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px' },
  roleCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '20px 15px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer'
  },
  roleCardActive: {
    background: 'rgba(59,130,246,0.05)',
    borderColor: '#3b82f6',
    boxShadow: '0 0 15px rgba(59,130,246,0.15)'
  },
  iconWrapper: { width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  roleText: { color: '#9ca3af', fontSize: '14px', fontWeight: '600' },
  roleTextActive: { color: '#3b82f6', fontSize: '14px', fontWeight: '700' },
  inputGroup: { display: 'flex', flexDirection: 'column' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '12px', color: '#6b7280' },
  input: {
    width: '100%',
    padding: '12px 12px 12px 38px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    color: '#f3f4f6',
    fontSize: '14px',
    outline: 'none'
  },
  loginBtn: {
    background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px',
    opacity: 1
  },
  checkboxContainer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '4px',
    marginBottom: '8px'
  },
  checkboxLabel: {
    color: '#9ca3af',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none'
  },
  checkbox: {
    cursor: 'pointer'
  },
  footer: { textAlign: 'center', fontSize: '11px', color: '#6b7280' }
};