import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Check, X, Clock as ClockIcon, Edit2 } from 'lucide-react';

function AppointmentList({ visitorId }) {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingDuration, setEditingDuration] = useState(null);
    const [newDuration, setNewDuration] = useState(60);
    const [activeTab, setActiveTab] = useState('current'); // 'current' or 'past'

    const fetchAppointments = async () => {
        try {
            let url;
            if (user?.role === 'admin') {
                url = '/admin/appointments/all';
            } else if (user?.role === 'employee' || user?.role === 'security') {
                url = `/employees/my-schedule?employee_id=${user.id || 1}`;
            } else {
                url = `/visitors/appointments?visitor_id=${visitorId}`;
            }

            const response = await api.get(url);
            // Sort by time
            const sorted = response.data.sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));
            setAppointments(sorted);
        } catch (err) {
            console.error('Failed to fetch appointments');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await api.patch(`/employees/appointments/${id}/status?employee_id=${user.id}`, { status });
            fetchAppointments();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const updateDuration = async (id) => {
        try {
            await api.patch(`/employees/appointments/${id}/duration?employee_id=${user.id}`, { duration_minutes: parseInt(newDuration) });
            setEditingDuration(null);
            fetchAppointments();
        } catch (err) {
            alert('Failed to update duration');
        }
    };

    useEffect(() => {
        if (user) fetchAppointments();
    }, [visitorId, user]);

    const canManage = user?.role === 'employee' || user?.role === 'admin';

    const filteredAppointments = appointments.filter(appt => {
        const isPast = ['completed', 'rejected', 'cancelled', 'blocked'].includes(appt.status) ||
            new Date(appt.scheduled_time) < new Date();
        return activeTab === 'past' ? isPast : !isPast;
    });

    if (loading) return <p className="loading-text">Loading appointments...</p>;

    return (
        <div className="appointment-list">
            <div className="visitor-mode-toggle" style={{ marginBottom: '1rem' }}>
                <button
                    className={activeTab === 'current' ? 'active' : ''}
                    onClick={() => setActiveTab('current')}
                >
                    Current
                </button>
                <button
                    className={activeTab === 'past' ? 'active' : ''}
                    onClick={() => setActiveTab('past')}
                >
                    Past Records
                </button>
            </div>

            {filteredAppointments.length === 0 ? (
                <div className="empty-state">
                    <ClockIcon size={48} />
                    <p>No {activeTab} appointments found.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>{user?.role === 'visitor' ? 'Host' : 'Visitor'}</th>
                                <th>Purpose</th>
                                <th>Time</th>
                                <th>Duration</th>
                                <th>Status</th>
                                {canManage && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAppointments.map(appt => (
                                <tr key={appt.id} className={`status-${appt.status}`}>
                                    <td>
                                        <div className="entity-info">
                                            {user?.role === 'visitor' ? (
                                                <strong>{appt.host_name}</strong>
                                            ) : (
                                                <>
                                                    <strong>{appt.visitor_name || (appt.status === 'blocked' ? 'Blocked' : 'N/A')}</strong>
                                                    {appt.visitor_phone && <div className="phone-hint"><small>{appt.visitor_phone}</small></div>}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td>{appt.purpose}</td>
                                    <td>
                                        <div className="time-info">
                                            {new Date(appt.scheduled_time).toLocaleDateString()}<br />
                                            <small>{new Date(appt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                        </div>
                                    </td>
                                    <td>
                                        {editingDuration === appt.id ? (
                                            <div className="duration-edit">
                                                <input
                                                    type="number"
                                                    value={newDuration}
                                                    onChange={(e) => setNewDuration(e.target.value)}
                                                    className="small-input"
                                                />
                                                <button onClick={() => updateDuration(appt.id)} className="icon-btn success"><Check size={14} /></button>
                                                <button onClick={() => setEditingDuration(null)} className="icon-btn danger"><X size={14} /></button>
                                            </div>
                                        ) : (
                                            <div className="duration-display">
                                                {appt.duration_minutes} min
                                                {canManage && <button onClick={() => { setEditingDuration(appt.id); setNewDuration(appt.duration_minutes); }} className="text-btn"><Edit2 size={12} /></button>}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`status-pill ${appt.status}`}>
                                            {appt.status}
                                        </span>
                                    </td>
                                    {canManage && (
                                        <td>
                                            <div className="action-btns">
                                                {appt.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => updateStatus(appt.id, 'accepted')} className="icon-btn success" title="Accept"><Check size={16} /></button>
                                                        <button onClick={() => updateStatus(appt.id, 'rejected')} className="icon-btn danger" title="Reject"><X size={16} /></button>
                                                    </>
                                                )}
                                                {appt.status === 'accepted' && (
                                                    <button onClick={() => updateStatus(appt.id, 'cancelled')} className="text-btn danger">Cancel</button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AppointmentList;
