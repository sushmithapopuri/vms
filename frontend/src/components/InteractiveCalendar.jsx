import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, User } from 'lucide-react';
import api from '../api/axios';

function InteractiveCalendar({ visitorId, onSlotDoubleClick, refreshTrigger }) {
    const [viewDate, setViewDate] = useState(new Date());
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(false);

    const startOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(d.setDate(diff));
    };

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/visitors/appointments?visitor_id=${visitorId}`);
            setAppointments(res.data);
        } catch (err) {
            console.error("Failed to fetch appointments for calendar");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [visitorId, refreshTrigger]);

    const weekStart = startOfWeek(viewDate);
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
    });

    const timeSlots = [];
    for (let h = 8; h <= 20; h++) { // 8 AM to 8 PM
        timeSlots.push(`${h}:00`);
        timeSlots.push(`${h}:30`);
    }

    const getApptsForSlot = (day, time) => {
        const [h, m] = time.split(':').map(Number);
        const slotStart = new Date(day);
        slotStart.setHours(h, m, 0, 0);

        return appointments.filter(appt => {
            const apptDate = new Date(appt.scheduled_time);
            return (
                apptDate.getFullYear() === slotStart.getFullYear() &&
                apptDate.getMonth() === slotStart.getMonth() &&
                apptDate.getDate() === slotStart.getDate() &&
                Math.abs(apptDate.getTime() - slotStart.getTime()) < 15 * 60 * 1000 // 15m windows
            );
        });
    };

    const handleDoubleClick = (day, time) => {
        const [h, m] = time.split(':').map(Number);
        const selected = new Date(day);
        selected.setHours(h, m, 0, 0);
        onSlotDoubleClick(selected);
    };

    return (
        <div className="outlook-calendar card">
            <div className="calendar-controls">
                <div className="view-info">
                    <h3>{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                    <p className="hint">Double-click any slot to block time</p>
                </div>
                <div className="nav-buttons">
                    <button className="icon-btn" onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 7)))}>
                        <ChevronLeft size={20} />
                    </button>
                    <button className="secondary-btn sm" onClick={() => setViewDate(new Date())}>Today</button>
                    <button className="icon-btn" onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 7)))}>
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="calendar-grid-container">
                <div className="calendar-grid">
                    <div className="time-column">
                        <div className="header-cell"></div>
                        {timeSlots.map(t => (
                            <div key={t} className="time-label">
                                {t.endsWith(':00') ? t : ''}
                            </div>
                        ))}
                    </div>

                    {days.map(day => (
                        <div key={day.toISOString()} className="day-column">
                            <div className={`header-cell ${day.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
                                <span className="day-name">{day.toLocaleString('default', { weekday: 'short' })}</span>
                                <span className="day-number">{day.getDate()}</span>
                            </div>
                            {timeSlots.map(time => {
                                const slotAppts = getApptsForSlot(day, time);
                                return (
                                    <div
                                        key={time}
                                        className="grid-cell"
                                        onDoubleClick={() => handleDoubleClick(day, time)}
                                    >
                                        {slotAppts.map(appt => (
                                            <div key={appt.id} className={`calendar-event ${appt.status}`}>
                                                <div className="event-info">
                                                    <strong>{appt.status === 'blocked' ? 'Blocked' : appt.visitor_name}</strong>
                                                    <span>{appt.purpose}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default InteractiveCalendar;
