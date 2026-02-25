import React, { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AppointmentList from './components/AppointmentList'
import AppointmentModal from './components/AppointmentModal'
import ManageUsers from './components/ManageUsers'
import ResetPassword from './pages/ResetPassword'
import Reports from './components/Reports'
import SecurityConsole from './components/SecurityConsole'
import StaffManager from './components/StaffManager'
import CalendarSync from './components/CalendarSync'
import InteractiveCalendar from './components/InteractiveCalendar'

function MainApp() {
    const { user, logout, loading } = useAuth();
    const [showSignup, setShowSignup] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [activeAdminTab, setActiveAdminTab] = useState('reports'); // 'reports', 'appointments', 'users'
    const [activeEmployeeTab, setActiveEmployeeTab] = useState('appointments'); // 'appointments', 'calendar'
    const [viewMode, setViewMode] = useState('calendar'); // 'list' or 'calendar'
    const [modalInitData, setModalInitData] = useState({ time: null, blocked: false });

    if (loading) return <div className="loading">Loading...</div>;

    if (!user) {
        return (
            <div className="auth-container">
                {showSignup ? (
                    <Signup onToggle={() => setShowSignup(false)} />
                ) : (
                    <Login onToggle={() => setShowSignup(true)} />
                )}
            </div>
        );
    }

    if (user.passwordResetRequired) {
        return <ResetPassword />;
    }

    return (
        <div className="container">
            <nav className="top-nav">
                <div className="user-info">
                    <span className="badge">{user.role}</span>
                    <span>{user.full_name}</span>
                </div>
                <button onClick={logout} className="logout-btn">Logout</button>
            </nav>

            <header>
                <h1>Visitor Management System</h1>
                <p>Welcome back, {user.full_name}!</p>
            </header>

            <main>
                <section className="dashboard">
                    {user.role === 'admin' && (
                        <div className="admin-dashboard">
                            <div className="visitor-mode-toggle admin-tabs" style={{ marginBottom: '2rem' }}>
                                <button
                                    className={activeAdminTab === 'reports' ? 'active' : ''}
                                    onClick={() => setActiveAdminTab('reports')}
                                >
                                    Reports
                                </button>
                                <button
                                    className={activeAdminTab === 'appointments' ? 'active' : ''}
                                    onClick={() => setActiveAdminTab('appointments')}
                                >
                                    Appointments
                                </button>
                                <button
                                    className={activeAdminTab === 'users' ? 'active' : ''}
                                    onClick={() => setActiveAdminTab('users')}
                                >
                                    User Management
                                </button>
                            </div>

                            {activeAdminTab === 'reports' && <Reports adminId={user.id || 1} />}

                            {activeAdminTab === 'appointments' && (
                                <div className="card">
                                    <div className="card-header">
                                        <h2>System Appointments</h2>
                                        <button className="primary-btn sm" onClick={() => setShowModal(true)}>
                                            Create Appointment
                                        </button>
                                    </div>
                                    <AppointmentList visitorId={user.id || 1} key={refreshTrigger} />
                                </div>
                            )}

                            {activeAdminTab === 'users' && (
                                <div className="admin-users-flow">
                                    <ManageUsers adminId={user.id || 1} />
                                    <div style={{ marginTop: '2rem' }}>
                                        <StaffManager adminId={user.id || 1} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {user.role === 'security' && (
                        <div className="security-section">
                            <SecurityConsole />
                        </div>
                    )}

                    {(user.role === 'employee' || user.role === 'visitor') && (
                        <div className="employee-dashboard">
                            {user.role === 'employee' && (
                                <div className="visitor-mode-toggle admin-tabs" style={{ marginBottom: '2rem' }}>
                                    <button
                                        className={activeEmployeeTab === 'appointments' ? 'active' : ''}
                                        onClick={() => setActiveEmployeeTab('appointments')}
                                    >
                                        My Schedule
                                    </button>
                                    <button
                                        className={activeEmployeeTab === 'calendar' ? 'active' : ''}
                                        onClick={() => setActiveEmployeeTab('calendar')}
                                    >
                                        Calendar Sync
                                    </button>
                                </div>
                            )}

                            {activeEmployeeTab === 'appointments' && (
                                <div className="card">
                                    <div className="card-header">
                                        <h2>{user.role === 'employee' ? 'Active Appointments' : 'My Bookings'}</h2>
                                        <div className="flex gap-2">
                                            <div className="visitor-mode-toggle sm" style={{ margin: 0, width: 'auto' }}>
                                                <button className={viewMode === 'calendar' ? 'active' : ''} onClick={() => setViewMode('calendar')}>Calendar</button>
                                                <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>List</button>
                                            </div>
                                            <button className="primary-btn sm" onClick={() => {
                                                setModalInitData({ time: null, blocked: false });
                                                setShowModal(true);
                                            }}>
                                                {user.role === 'employee' ? 'Book for Visitor' : 'Schedule New'}
                                            </button>
                                        </div>
                                    </div>

                                    {viewMode === 'list' ? (
                                        <AppointmentList visitorId={user.id || 1} key={refreshTrigger} />
                                    ) : (
                                        <InteractiveCalendar
                                            visitorId={user.id || 1}
                                            refreshTrigger={refreshTrigger}
                                            onSlotDoubleClick={(time) => {
                                                setModalInitData({ time, blocked: true });
                                                setShowModal(true);
                                            }}
                                        />
                                    )}
                                </div>
                            )}

                            {activeEmployeeTab === 'calendar' && user.role === 'employee' && (
                                <CalendarSync />
                            )}
                        </div>
                    )}
                </section>
            </main>

            {showModal && (
                <AppointmentModal
                    onClose={() => {
                        setShowModal(false);
                        setModalInitData({ time: null, blocked: false });
                    }}
                    onSuccess={() => setRefreshTrigger(t => t + 1)}
                    initialTime={modalInitData.time}
                    initialBlocked={modalInitData.blocked}
                />
            )}
        </div>
    )
}

function App() {
    return (
        <AuthProvider>
            <MainApp />
        </AuthProvider>
    )
}

export default App
