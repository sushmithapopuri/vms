import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Download, BarChart2, Users, Calendar, CheckCircle, Clock, ChevronRight } from 'lucide-react';

function Reports({ adminId }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState('visitors'); // 'visitors', 'all_appts', 'pending', 'completed'
    const [records, setRecords] = useState([]);
    const [recordsLoading, setRecordsLoading] = useState(false);

    const fetchStats = async () => {
        try {
            const response = await api.get(`/admin/reports/stats?admin_id=${adminId}`);
            setStats(response.data);
        } catch (err) {
            console.error("Failed to fetch stats");
        }
    };

    const fetchRecords = async (tab) => {
        setRecordsLoading(true);
        try {
            if (tab === 'visitors') {
                const res = await api.get('/employees/visitor-list');
                setRecords(res.data);
            } else {
                const res = await api.get('/admin/appointments/all');
                let filtered = res.data;
                if (tab === 'pending') {
                    filtered = res.data.filter(a => a.status === 'pending');
                } else if (tab === 'completed') {
                    filtered = res.data.filter(a => a.status === 'completed');
                }
                setRecords(filtered);
            }
        } catch (err) {
            console.error("Failed to fetch records");
        } finally {
            setRecordsLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await fetchStats();
            await fetchRecords(selectedTab);
            setLoading(false);
        };
        init();
    }, [adminId]);

    const handleTabChange = (tab) => {
        setSelectedTab(tab);
        fetchRecords(tab);
    };

    const downloadReport = async () => {
        try {
            const response = await api.get(`/admin/reports/appointments/csv?admin_id=${adminId}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'appointments_report.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert("Failed to download report");
        }
    };

    if (loading) return <div className="loading-tiny">Loading reports dashboard...</div>;

    return (
        <div className="reports-dashboard">
            <div className="card-header" style={{ marginBottom: '2rem' }}>
                <div className="header-title">
                    <h2 style={{ margin: 0 }}><BarChart2 size={24} /> System Analytics</h2>
                    <p className="subtitle" style={{ textAlign: 'left', marginTop: '0.25rem' }}>Overview of system activity and visitor data</p>
                </div>
                <button className="primary-btn sm" onClick={downloadReport}>
                    <Download size={16} /> Export Records
                </button>
            </div>

            {/* 4 Independent Summary Tabs */}
            <div className="stats-grid">
                <div
                    className={`stat-card clickable ${selectedTab === 'visitors' ? 'active' : ''}`}
                    onClick={() => handleTabChange('visitors')}
                >
                    <div className="stat-icon users"><Users size={20} /></div>
                    <div className="stat-info">
                        <h3>{stats?.total_visitors}</h3>
                        <p>Total Visitors</p>
                    </div>
                    <ChevronRight className="tab-arrow" size={16} />
                </div>

                <div
                    className={`stat-card clickable ${selectedTab === 'all_appts' ? 'active' : ''}`}
                    onClick={() => handleTabChange('all_appts')}
                >
                    <div className="stat-icon appointments"><Calendar size={20} /></div>
                    <div className="stat-info">
                        <h3>{stats?.total_appointments}</h3>
                        <p>Total Bookings</p>
                    </div>
                    <ChevronRight className="tab-arrow" size={16} />
                </div>

                <div
                    className={`stat-card clickable ${selectedTab === 'pending' ? 'active' : ''}`}
                    onClick={() => handleTabChange('pending')}
                >
                    <div className="stat-icon pending"><Clock size={20} /></div>
                    <div className="stat-info">
                        <h3>{stats?.pending_appointments}</h3>
                        <p>Pending Requests</p>
                    </div>
                    <ChevronRight className="tab-arrow" size={16} />
                </div>

                <div
                    className={`stat-card clickable ${selectedTab === 'completed' ? 'active' : ''}`}
                    onClick={() => handleTabChange('completed')}
                >
                    <div className="stat-icon completed"><CheckCircle size={20} /></div>
                    <div className="stat-info">
                        <h3>{stats?.completed_appointments}</h3>
                        <p>Completed Visits</p>
                    </div>
                    <ChevronRight className="tab-arrow" size={16} />
                </div>
            </div>

            {/* Highlighted Pane for Category Details */}
            <div className="records-pane card">
                <div className="pane-header">
                    <h4>
                        {selectedTab === 'visitors' && "Registered Visitors"}
                        {selectedTab === 'all_appts' && "All System Appointments"}
                        {selectedTab === 'pending' && "Pending Approval"}
                        {selectedTab === 'completed' && "Visit History"}
                    </h4>
                    <span className="badge">{records.length} records</span>
                </div>

                <div className="pane-content">
                    {recordsLoading ? (
                        <div className="loading-tiny">Fetching records...</div>
                    ) : records.length === 0 ? (
                        <div className="empty-state">No records found for this category.</div>
                    ) : (
                        <div className="table-container" style={{ margin: 0, border: 'none' }}>
                            <table>
                                <thead>
                                    {selectedTab === 'visitors' ? (
                                        <tr>
                                            <th>Name</th>
                                            <th>Phone Number</th>
                                            <th>Status</th>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <th>Visitor</th>
                                            <th>Host</th>
                                            <th>Scheduled Time</th>
                                            <th>Status</th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {records.slice(0, 50).map((record, idx) => (
                                        <tr key={record.id || idx}>
                                            {selectedTab === 'visitors' ? (
                                                <>
                                                    <td><strong>{record.full_name}</strong></td>
                                                    <td>{record.phone_number}</td>
                                                    <td><span className="status-pill accepted">Verified</span></td>
                                                </>
                                            ) : (
                                                <>
                                                    <td>
                                                        <strong>{record.visitor_name || "N/A"}</strong>
                                                        <br /><small>{record.visitor_phone}</small>
                                                    </td>
                                                    <td>{record.host_name}</td>
                                                    <td>
                                                        {new Date(record.scheduled_time).toLocaleDateString()}
                                                        <br /><small>{new Date(record.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                                                    </td>
                                                    <td>
                                                        <span className={`status-pill ${record.status}`}>
                                                            {record.status}
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {records.length > 50 && (
                                <p className="hint" style={{ textAlign: 'center', marginTop: '1rem' }}>Showing latest 50 records. Export for full data.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Reports;
