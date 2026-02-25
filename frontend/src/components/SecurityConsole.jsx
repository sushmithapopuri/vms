import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, LogIn, LogOut, User, ShieldCheck, History, Info, Plus } from 'lucide-react';
import AppointmentModal from './AppointmentModal';
import VisitorsTable from './VisitorsTable';

function SecurityConsole() {
    const [appointments, setAppointments] = useState([]);
    const [searchPhone, setSearchPhone] = useState('');
    const [selectedVisitor, setSelectedVisitor] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('live'); // 'live' or 'history'
    const [recentActivity, setRecentActivity] = useState([]);
    const [visitors, setVisitors] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [preSelectedVisitor, setPreSelectedVisitor] = useState(null);

    const fetchDailyAppointments = async () => {
        try {
            const [dailyRes, recentRes] = await Promise.all([
                api.get('/security/daily-appointments'),
                api.get('/security/recent-activity')
            ]);
            setAppointments(dailyRes.data);
            setRecentActivity(recentRes.data);
            // fetch visitors list for quick lookup
            try {
                const vres = await api.get('/admin/users/visitors');
                setVisitors(vres.data);
            } catch (e) {
                // non-fatal
            }
        } catch (err) {
            console.error("Failed to fetch security data");
        }
    };

    useEffect(() => {
        fetchDailyAppointments();
        const interval = setInterval(fetchDailyAppointments, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const handleCheckIn = async (id) => {
        try {
            await api.post(`/security/check-in/${id}`);
            fetchDailyAppointments();
        } catch (err) {
            alert(err.response?.data?.detail || "Check-in failed");
        }
    };

    const handleCheckOut = async (id) => {
        try {
            await api.post(`/security/check-out/${id}`);
            fetchDailyAppointments();
        } catch (err) {
            alert(err.response?.data?.detail || "Check-out failed");
        }
    };

    const searchProfile = async (e) => {
        e.preventDefault();
        if (!searchPhone) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/security/visitor-profile/${searchPhone}`);
            setSelectedVisitor(res.data);
        } catch (err) {
            setError("Visitor not found");
            setSelectedVisitor(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="security-console-grid">
            {/* Active Appointments (Gate Control) */}
            <div className="card gate-control">
                <div className="card-header">
                    <h2><ShieldCheck size={20} /> Security Gate</h2>
                    <div className="flex gap-2 items-center">
                        <div className="visitor-mode-toggle sm" style={{ margin: 0, width: 'auto' }}>
                            <button
                                className={activeTab === 'live' ? 'active' : ''}
                                onClick={() => setActiveTab('live')}
                            >
                                Arrivals
                            </button>
                            <button
                                className={activeTab === 'history' ? 'active' : ''}
                                onClick={() => setActiveTab('history')}
                            >
                                Past Activity
                            </button>
                        </div>
                        <button className="primary-btn sm" onClick={() => setShowModal(true)}>
                            <Plus size={14} /> Walk-in
                        </button>
                    </div>
                </div>

                <div className="appointment-mini-list">
                    {appointments.filter(a => activeTab === 'history' ? (a.status === 'completed' || a.status === 'checked_in') : (a.status === 'accepted')).length === 0 ? (
                        <p className="empty-state">No {activeTab} activity recorded.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Visitor</th>
                                    <th>Host</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments
                                    .filter(appt => activeTab === 'history' ? (appt.status === 'completed' || appt.status === 'checked_in') : (appt.status === 'accepted'))
                                    .map(appt => (
                                        <tr key={appt.id}>
                                            <td>
                                                <strong>{appt.visitor_name || "N/A"}</strong>
                                                {appt.visitor_phone && <div className="phone-hint"><small>{appt.visitor_phone}</small></div>}
                                                <small className="text-muted">{appt.purpose}</small>
                                            </td>
                                            <td>{appt.host_name}</td>
                                            <td><span className={`status-pill ${appt.status}`}>{appt.status}</span></td>
                                            <td>
                                                {appt.status === 'accepted' && (
                                                    <button onClick={() => handleCheckIn(appt.id)} className="icon-btn success" title="Check In">
                                                        <LogIn size={18} />
                                                    </button>
                                                )}
                                                {appt.status === 'checked_in' && (
                                                    <button onClick={() => handleCheckOut(appt.id)} className="icon-btn danger" title="Check Out">
                                                        <LogOut size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Profile Lookup */}
            <div className="profile-lookup">
                <div className="card">
                    <h3><User size={18} /> Visitor ID Lookup</h3>
                    <form onSubmit={searchProfile} className="search-bar">
                        <input
                            type="text"
                            placeholder="Phone Number (+91...)"
                            value={searchPhone}
                            onChange={(e) => setSearchPhone(e.target.value)}
                        />
                        <button type="submit" disabled={loading}><Search size={18} /></button>
                    </form>

                    {error && <p className="error-text">{error}</p>}

                    {/* Recent Global Activity Feed */}
                    <div className="recent-activity-feed" style={{ marginTop: '1.5rem' }}>
                        <h5>Recent Activity (System Wide)</h5>
                        {recentActivity.length === 0 ? (
                            <p className="hint">No recent history</p>
                        ) : (
                            <ul className="activity-list">
                                {recentActivity.slice(0, 5).map(act => (
                                    <li key={act.id} className={`activity-item ${act.status}`}>
                                        <div className="act-dot"></div>
                                        <div className="act-content">
                                            <strong>{act.visitor_name}</strong> {act.status === 'checked_in' ? 'checked in' : (act.status === 'completed' ? 'checked out' : 'was rejected')}
                                            <br /><small>{new Date(act.scheduled_time).toLocaleDateString()} • {act.purpose}</small>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {selectedVisitor && (
                        <div className="visitor-detailed-profile">
                            <div className="profile-header">
                                <div className="avatar">
                                    <User size={32} />
                                </div>
                                <div className="info">
                                    <h4>{selectedVisitor.profile.full_name}</h4>
                                    <p>{selectedVisitor.profile.phone_number}</p>
                                    <span className={`verify-badge ${selectedVisitor.profile.is_verified ? 'verified' : ''}`}>
                                        {selectedVisitor.profile.is_verified ? 'Identity Verified' : 'Not Verified'}
                                    </span>
                                    <button
                                        className="primary-btn sm"
                                        style={{ marginTop: '0.75rem', width: '100%', display: 'flex', justifyContent: 'center' }}
                                        onClick={() => {
                                            setPreSelectedVisitor({
                                                id: selectedVisitor.profile.id,
                                                full_name: selectedVisitor.profile.full_name,
                                                phone_number: selectedVisitor.profile.phone_number
                                            });
                                            setShowModal(true);
                                        }}
                                    >
                                        <Plus size={14} /> Schedule Walk-in
                                    </button>
                                </div>
                            </div>

                            <div className="details-grid">
                                <div className="detail-item">
                                    <label>Email</label>
                                    <p>{selectedVisitor.profile.email || 'N/A'}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Address</label>
                                    <p>{selectedVisitor.profile.address?.city}, {selectedVisitor.profile.address?.state}</p>
                                </div>
                            </div>

                            <div className="history-section">
                                <h5><History size={14} /> Recent Visits</h5>
                                <ul className="visit-history">
                                    {selectedVisitor.appointment_history.slice(0, 3).map(h => (
                                        <li key={h.id}>
                                            <span>{new Date(h.scheduled_time).toLocaleDateString()}</span>
                                            <span>{h.host_name}</span>
                                            <span className={`status-tag sm ${h.status}`}>{h.status}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
                {/* Visitors list accessible to security */}
                <VisitorsTable visitors={visitors} />
            </div>

            {showModal && (
                <AppointmentModal
                    onClose={() => {
                        setShowModal(false);
                        setPreSelectedVisitor(null);
                    }}
                    onSuccess={fetchDailyAppointments}
                    preSelectedVisitor={preSelectedVisitor}
                />
            )}
        </div>
    );
}

export default SecurityConsole;
