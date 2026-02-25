import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { User, Calendar, Clock, X, Search, UserPlus, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Webcam from 'react-webcam';

function AppointmentModal({ onClose, onSuccess, preSelectedVisitor = null, initialTime = null, initialBlocked = false }) {
    const { user } = useAuth();
    const isStaff = user?.role === 'employee' || user?.role === 'admin' || user?.role === 'security';
    const isHostSelectionAllowed = user?.role === 'admin' || user?.role === 'security';
    const webcamRef = useRef(null);

    // Form States
    const [hostName, setHostName] = useState((user?.role === 'employee' && user?.full_name) ? user.full_name : '');
    const [purpose, setPurpose] = useState('');
    const [scheduledTime, setScheduledTime] = useState(initialTime || new Date(Date.now() + 5 * 60 * 1000));
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [isBlockedSlot, setIsBlockedSlot] = useState(initialBlocked);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Host Schedule
    const [hostAppointments, setHostAppointments] = useState([]);
    const [fetchingSchedule, setFetchingSchedule] = useState(false);

    // Employee-specific: Visitor selection
    const [visitorMode, setVisitorMode] = useState('existing'); // 'existing' or 'new'
    const [visitorSearch, setVisitorSearch] = useState(preSelectedVisitor ? preSelectedVisitor.full_name : '');
    const [selectedVisitor, setSelectedVisitor] = useState(preSelectedVisitor);
    const [visitors, setVisitors] = useState([]);
    const [filteredVisitors, setFilteredVisitors] = useState([]);
    const [showVisitorSuggestions, setShowVisitorSuggestions] = useState(false);

    // New Visitor fields
    const [newVisitor, setNewVisitor] = useState({
        full_name: '',
        phone_number: '',
        email: '',
        address: { street: '', city: '', state: '', pincode: '' },
        face_image: null
    });

    const captureVisitorFace = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setNewVisitor(prev => ({ ...prev, face_image: imageSrc }));
    }, [webcamRef]);

    // Host Suggestions (for Visitors)
    const [employees, setEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [showHostSuggestions, setShowHostSuggestions] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [empRes, visRes] = await Promise.all([
                    api.get('/admin/users/employees'),
                    isStaff ? api.get('/employees/visitor-list') : Promise.resolve({ data: [] })
                ]);
                setEmployees(empRes.data);
                setVisitors(visRes.data);
            } catch (err) {
                console.error("Failed to fetch data", err);
            }
        };
        fetchData();
    }, [isStaff]);

    useEffect(() => {
        if (hostName) {
            const fetchHostSchedule = async () => {
                setFetchingSchedule(true);
                try {
                    const res = await api.get(`/visitors/host-schedule?host_name=${encodeURIComponent(hostName)}`);
                    setHostAppointments(res.data);
                } catch (err) {
                    console.error("Schedule fetch failed");
                } finally {
                    setFetchingSchedule(false);
                }
            };
            const timer = setTimeout(fetchHostSchedule, 500);
            return () => clearTimeout(timer);
        }
    }, [hostName]);

    const handleHostChange = (e) => {
        const value = e.target.value;
        setHostName(value);
        if (value.length > 0) {
            setFilteredEmployees(employees.filter(emp => emp.full_name.toLowerCase().includes(value.toLowerCase())));
            setShowHostSuggestions(true);
        } else setShowHostSuggestions(false);
    };

    const handleVisitorSearch = (e) => {
        const value = e.target.value;
        setVisitorSearch(value);
        if (value.length > 0) {
            setFilteredVisitors(visitors.filter(v =>
                v.full_name.toLowerCase().includes(value.toLowerCase()) ||
                v.phone_number.includes(value)
            ));
            setShowVisitorSuggestions(true);
        } else setShowVisitorSuggestions(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const now = new Date();
        if (scheduledTime < now) {
            setError('Appointments can only be booked for future dates and times');
            return;
        }

        setLoading(true);
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const isSoon = scheduledTime <= twoHoursFromNow;
        const appointmentType = isSoon ? 'walk_in' : 'pre_planned';

        const payload = {
            host_name: hostName,
            purpose: purpose,
            appointment_type: appointmentType,
            scheduled_time: scheduledTime.toISOString(),
            duration_minutes: parseInt(durationMinutes)
        };

        try {
            let url;
            if (isBlockedSlot) {
                url = `/employees/schedule/block?employee_id=${user.id || 1}`;
            } else if (isStaff) {
                if (visitorMode === 'existing') {
                    if (!selectedVisitor) {
                        setError('Please select an existing visitor');
                        setLoading(false);
                        return;
                    }
                    payload.visitor_id = selectedVisitor.id;
                } else {
                    if (!newVisitor.full_name || !newVisitor.phone_number || !newVisitor.address.pincode) {
                        setError('Please provide visitor name, phone, and address details');
                        setLoading(false);
                        return;
                    }
                    payload.visitor_info = newVisitor;
                }
                url = `/employees/book-for-visitor?employee_id=${user.id || 1}`;
            } else {
                payload.visitor_id = user.id || 1;
                url = `/visitors/appointments?visitor_id=${user.id || 1}`;
            }

            await api.post(url, payload);
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to schedule appointment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card card appointment-modal wide-modal">
                <div className="modal-header">
                    <h3><Calendar size={20} /> {isBlockedSlot ? 'Block My Schedule' : 'Schedule Appointment'}</h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-content-grid">
                    <div className="form-container-scroll">
                        <form onSubmit={handleSubmit} className="appointment-form">
                            {isStaff && (
                                <div className="form-group checkbox-group">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={isBlockedSlot} onChange={(e) => setIsBlockedSlot(e.target.checked)} />
                                        <span>Personal Blocked Slot (Out of Office/Meeting)</span>
                                    </label>
                                </div>
                            )}

                            {!isBlockedSlot && (
                                <>
                                    {isHostSelectionAllowed && (
                                        <div className="form-group relative">
                                            <label><User size={16} /> Host Name (Employee)</label>
                                            <input
                                                type="text" value={hostName} onChange={handleHostChange}
                                                onFocus={() => hostName && setShowHostSuggestions(true)}
                                                placeholder="Type to search employees..." required autoComplete="off"
                                            />
                                            {showHostSuggestions && filteredEmployees.length > 0 && (
                                                <ul className="suggestions-list">
                                                    {filteredEmployees.map(emp => (
                                                        <li key={emp.id} onClick={() => { setHostName(emp.full_name); setShowHostSuggestions(false); }}>
                                                            {emp.full_name}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}

                                    {isStaff && (
                                        <div className="visitor-mode-toggle">
                                            <button type="button" className={visitorMode === 'existing' ? 'active' : ''} onClick={() => setVisitorMode('existing')}>
                                                <Search size={14} /> Existing Visitor
                                            </button>
                                            <button type="button" className={visitorMode === 'new' ? 'active' : ''} onClick={() => setVisitorMode('new')}>
                                                <UserPlus size={14} /> New Visitor
                                            </button>
                                        </div>
                                    )}

                                    {isStaff && visitorMode === 'existing' && (
                                        <div className="form-group relative">
                                            <label>Select Visitor</label>
                                            <input
                                                type="text" value={visitorSearch} onChange={handleVisitorSearch}
                                                placeholder="Search by name or phone..." autoComplete="off"
                                            />
                                            {showVisitorSuggestions && filteredVisitors.length > 0 && (
                                                <ul className="suggestions-list">
                                                    {filteredVisitors.map(v => (
                                                        <li key={v.id} onClick={() => { setSelectedVisitor(v); setVisitorSearch(v.full_name); setShowVisitorSuggestions(false); }}>
                                                            {v.full_name} ({v.phone_number})
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}

                                    {isStaff && visitorMode === 'new' && (
                                        <div className="new-visitor-full-form">
                                            <div className="grid-2">
                                                <div className="form-group">
                                                    <label>Full Name *</label>
                                                    <input type="text" value={newVisitor.full_name} onChange={(e) => setNewVisitor({ ...newVisitor, full_name: e.target.value })} required />
                                                </div>
                                                <div className="form-group">
                                                    <label>Phone *</label>
                                                    <input type="text" value={newVisitor.phone_number} onChange={(e) => setNewVisitor({ ...newVisitor, phone_number: e.target.value })} required />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Email Address</label>
                                                <input type="email" value={newVisitor.email} onChange={(e) => setNewVisitor({ ...newVisitor, email: e.target.value })} />
                                            </div>

                                            <div className="address-section">
                                                <h4>Address Details</h4>
                                                <div className="form-group">
                                                    <label>Street</label>
                                                    <input type="text" value={newVisitor.address.street} onChange={(e) => setNewVisitor({ ...newVisitor, address: { ...newVisitor.address, street: e.target.value } })} />
                                                </div>
                                                <div className="grid-3">
                                                    <div className="form-group">
                                                        <label>City</label>
                                                        <input type="text" value={newVisitor.address.city} onChange={(e) => setNewVisitor({ ...newVisitor, address: { ...newVisitor.address, city: e.target.value } })} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>State</label>
                                                        <input type="text" value={newVisitor.address.state} onChange={(e) => setNewVisitor({ ...newVisitor, address: { ...newVisitor.address, state: e.target.value } })} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label>Pincode *</label>
                                                        <input type="text" value={newVisitor.address.pincode} onChange={(e) => setNewVisitor({ ...newVisitor, address: { ...newVisitor.address, pincode: e.target.value } })} maxLength="6" required />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="face-capture-appointment">
                                                <label>Identity Photo</label>
                                                <div className="webcam-mini-container">
                                                    {newVisitor.face_image ? (
                                                        <div className="preview-captured-mini">
                                                            <img src={newVisitor.face_image} alt="Identity" />
                                                            <button type="button" onClick={() => setNewVisitor({ ...newVisitor, face_image: null })} className="retake-btn sm">Retake</button>
                                                        </div>
                                                    ) : (
                                                        <div className="webcam-box-mini">
                                                            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="webcam-view-mini" />
                                                            <button type="button" onClick={captureVisitorFace} className="capture-btn-mini"><Camera size={14} /> Capture Identity</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Purpose</label>
                                        <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Project Discussion" required={!isBlockedSlot} />
                                    </div>
                                </>
                            )}

                            {isBlockedSlot && (
                                <div className="form-group">
                                    <label>Block Reason</label>
                                    <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Lunch, Personal, etc." required />
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group date-picker-group">
                                    <label><Clock size={16} /> Start Time</label>
                                    <DatePicker
                                        selected={scheduledTime}
                                        onChange={(date) => setScheduledTime(date)}
                                        showTimeSelect
                                        dateFormat="MMM d, h:mm aa"
                                        minDate={new Date()}
                                        className="full-width-datepicker"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Duration (mins)</label>
                                    <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} min="15" step="15" />
                                </div>
                            </div>

                            {error && <p className="error-text">{error}</p>}

                            <div className="btn-group">
                                <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
                                <button type="submit" className="primary-btn" disabled={loading}>
                                    {loading ? 'Processing...' : (isBlockedSlot ? 'Block Slot' : 'Confirm Appointment')}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="schedule-preview">
                        <h4>Host Availability</h4>
                        {fetchingSchedule ? (
                            <p className="loading-tiny">Checking schedule...</p>
                        ) : hostAppointments.length === 0 ? (
                            <p className="success-text">Host is fully free!</p>
                        ) : (
                            <ul className="host-schedule-list">
                                {hostAppointments.map(appt => (
                                    <li key={appt.id} className={appt.status}>
                                        <span className="time">{new Date(appt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="duration">({appt.duration_minutes}m)</span>
                                        <span className="status-label">{appt.status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="hint">Red slots are already booked or blocked.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AppointmentModal;
