import React, { useState } from 'react';
import api from '../api/axios';
import { Calendar as CalendarIcon, Link as LinkIcon, CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function CalendarSync() {
    const { user, setUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [calendarUrl, setCalendarUrl] = useState(user?.calendar_url || '');
    const [message, setMessage] = useState('');

    const handleSync = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post(`/employees/sync-calendar?employee_id=${user.id}`, {
                calendar_url: calendarUrl
            });

            // Update local user state
            setUser({
                ...user,
                calendar_synced: true,
                calendar_url: calendarUrl
            });

            setMessage("Calendar connected successfully!");
        } catch (err) {
            setMessage("Failed to connect calendar.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card calendar-sync-card">
            <div className="card-header">
                <h3><CalendarIcon size={20} /> Calendar Integration</h3>
                {user?.calendar_synced && (
                    <span className="status-pill accepted">
                        <CheckCircle size={14} /> Linked
                    </span>
                )}
            </div>

            <p className="hint" style={{ marginBottom: '1.5rem' }}>
                Connect your Google or Outlook calendar to automatically block time for site visits.
            </p>

            {user?.calendar_synced ? (
                <div className="sync-active-state">
                    <div className="sync-node">
                        <div className="node-icon success"><CheckCircle size={24} /></div>
                        <div className="node-info">
                            <strong>Calendar is Synchronized</strong>
                            <p>{user.calendar_url || 'Connected via OAuth'}</p>
                        </div>
                    </div>
                    <div className="action-row" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                        <button className="secondary-btn sm" onClick={() => setCalendarUrl('')}>
                            <RefreshCw size={14} /> Re-sync
                        </button>
                        <button className="danger-btn sm" onClick={() => setUser({ ...user, calendar_synced: false })}>
                            Disconnect
                        </button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSync} className="sync-form">
                    <div className="form-group">
                        <label><LinkIcon size={14} /> Calendar iCal URL (Optional)</label>
                        <input
                            type="text"
                            placeholder="https://calendar.google.com/calendar/ical/..."
                            value={calendarUrl}
                            onChange={(e) => setCalendarUrl(e.target.value)}
                        />
                    </div>

                    <div className="connect-options">
                        <button type="submit" className="primary-btn" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
                            {loading ? 'Connecting...' : 'Connect Calendar'}
                        </button>

                        <div className="divider" style={{ margin: '1.5rem 0', textAlign: 'center', position: 'relative' }}>
                            <span style={{ background: 'var(--surface)', padding: '0 0.5rem', position: 'relative', zIndex: 1, fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR</span>
                            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--border)' }}></div>
                        </div>

                        <div className="grid-2">
                            <button type="button" className="secondary-btn" onClick={handleSync}>
                                <img src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" alt="Google" style={{ width: '16px', marginRight: '8px' }} />
                                Google
                            </button>
                            <button type="button" className="secondary-btn" onClick={handleSync}>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg" alt="Outlook" style={{ width: '16px', marginRight: '8px' }} />
                                Outlook
                            </button>
                        </div>
                    </div>
                    {message && <p className={`message ${message.includes('Failed') ? 'error-text' : 'success-text'}`} style={{ marginTop: '1rem', fontSize: '0.875rem' }}>{message}</p>}
                </form>
            )}
        </div>
    );
}

export default CalendarSync;
