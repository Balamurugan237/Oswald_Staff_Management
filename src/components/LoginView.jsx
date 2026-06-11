import React, { useState } from 'react';
import { User, Lock, Mail } from 'lucide-react';
import { showToast } from '../utils';

export default function LoginView({ onLogin, staffList }) {
  const [role, setRole] = useState('staff'); // 'staff' or 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('********');

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    // Pre-fill email for easier testing/demo
    if (selectedRole === 'admin') {
      setEmail('admin@oswaldstack.com');
    } else if (staffList && staffList.length > 0) {
      // Find Sneha or use first staff member
      const sneha = staffList.find(s => s.email.includes('sneha'));
      setEmail(sneha ? sneha.email : staffList[0].email);
    }
  };

  // Set default pre-fill on mount
  React.useEffect(() => {
    handleRoleSelect('staff');
  }, [staffList]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!email) {
      showToast('Validation Error', 'Please enter your email address.', 'warning');
      return;
    }

    if (role === 'admin') {
      if (email.toLowerCase().trim() === 'admin@oswaldstack.com') {
        onLogin({ role: 'admin', email: email.toLowerCase().trim() });
      } else {
        showToast('Access Denied', 'Invalid admin email address.', 'danger');
      }
    } else {
      // Find staff member by email
      const member = staffList.find(s => s.email.toLowerCase().trim() === email.toLowerCase().trim());
      if (member) {
        onLogin({ role: 'staff', member });
      } else {
        showToast('Access Denied', 'Email not found in staff roster. Try sneha.rao@oswaldstack.com', 'danger');
      }
    }
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
              style={{
                ...styles.roleCard,
                ...(role === 'staff' ? styles.roleCardActive : {})
              }}
              onClick={() => handleRoleSelect('staff')}
            >
              <div style={{
                ...styles.iconWrapper,
                background: 'rgba(139, 92, 246, 0.1)',
                color: '#8b5cf6'
              }}>
                <User size={24} />
              </div>
              <span style={role === 'staff' ? styles.roleTextActive : styles.roleText}>Staff</span>
            </div>

            {/* Admin Option */}
            <div 
              style={{
                ...styles.roleCard,
                ...(role === 'admin' ? styles.roleCardActive : {})
              }}
              onClick={() => handleRoleSelect('admin')}
            >
              <div style={{
                ...styles.iconWrapper,
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b'
              }}>
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
                required
              />
            </div>
          </div>

          <button type="submit" style={styles.loginBtn}>
            Login
          </button>
        </form>

        <div style={styles.footer}>
          <span>Demonstration Mode Active</span>
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
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.05)',
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
  logo: {
    width: '48px',
    height: '48px',
    marginBottom: '8px'
  },
  title: {
    color: '#f3f4f6',
    fontSize: '28px',
    fontWeight: '700',
    margin: 0,
    letterSpacing: '-0.5px'
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: '14px',
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  label: {
    color: '#9ca3af',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '6px',
    display: 'block'
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '8px'
  },
  roleCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    padding: '20px 15px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  roleCardActive: {
    background: 'rgba(59, 130, 246, 0.05)',
    borderColor: '#3b82f6',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.15)'
  },
  iconWrapper: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  roleText: {
    color: '#9ca3af',
    fontSize: '14px',
    fontWeight: '600'
  },
  roleTextActive: {
    color: '#3b82f6',
    fontSize: '14px',
    fontWeight: '700'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    color: '#6b7280'
  },
  input: {
    width: '100%',
    padding: '12px 12px 12px 38px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: '#f3f4f6',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease'
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
    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)',
    transition: 'all 0.2s ease',
    marginTop: '8px'
  },
  footer: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#6b7280'
  }
};
