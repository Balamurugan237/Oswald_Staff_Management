import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useIdleTimeout } from './useIdleTimeout';

export function AuthAttendanceListener() {
  const [session, setSession] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // 1. Initialise current auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUserId(session?.user?.id || null);
    });

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUserId(currentSession?.user?.id || null);

        if (event === 'SIGNED_OUT') {
          // Explicit user checkout (when they click log out)
          if (userId) {
            try {
              await supabase.rpc('handle_check_out', { p_staff_id: userId });
            } catch (err) {
              console.error("Failed to checkout user on signout:", err);
            }
          }
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [userId]);

  // Hook up the 30-minute idle tracker with a 60-second logout warning countdown
  const { showPopup, countdown, handleKeepWorking } = useIdleTimeout(userId, 30, 60);

  if (!showPopup) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.title}>Are you still working?</h3>
        <p style={styles.text}>
          You have been inactive for 30 minutes. You will be automatically checked out and logged out in:
        </p>
        <div style={styles.countdownContainer}>
          <span style={styles.countdownNum}>{countdown}</span> seconds
        </div>
        <button style={styles.button} onClick={handleKeepWorking}>
          Yes, I am working
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  modal: {
    backgroundColor: '#0f1626',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    borderRadius: '12px',
    padding: '32px',
    width: '90%',
    maxWidth: '400px',
    textAlign: 'center',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 16px rgba(99, 102, 241, 0.15)',
    color: '#f3f4f6',
    fontFamily: 'Outfit, sans-serif',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#6366f1',
    margin: '0 0 12px 0',
  },
  text: {
    fontSize: '14px',
    color: '#9ca3af',
    margin: '0 0 24px 0',
    lineHeight: '1.5',
  },
  countdownContainer: {
    fontSize: '18px',
    color: '#f3f4f6',
    fontWeight: '600',
    marginBottom: '24px',
  },
  countdownNum: {
    fontSize: '32px',
    color: '#ef4444',
    fontWeight: '800',
    display: 'inline-block',
    marginRight: '6px',
    minWidth: '40px',
  },
  button: {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
    transition: 'all 0.2s ease',
  },
};
