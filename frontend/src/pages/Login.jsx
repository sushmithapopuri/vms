import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Webcam from 'react-webcam';
import { Mail, Lock, Phone, ShieldCheck } from 'lucide-react';

function Login({ onToggle }) {
    const [step, setStep] = useState(1); // 1: main, 3: otp, 4: face, 5: admin
    const [phoneNumber, setPhoneNumber] = useState('');
    const [adminData, setAdminData] = useState({ email: '', password: '' });
    const [isStaffFlow, setIsStaffFlow] = useState(false);
    const [otp, setOtp] = useState('');
    const [timer, setTimer] = useState(0);
    const { login } = useAuth();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const webcamRef = useRef(null);

    const startTimer = () => {
        setTimer(30);
        const interval = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleSendOtp = async (e) => {
        if (e) e.preventDefault();
        if (!phoneNumber) return setError('Please enter your phone number first');
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/login/request', { phone_number: phoneNumber });
            setStep(3);
            startTimer();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/auth/login/verify', {
                phone_number: phoneNumber,
                otp: otp
            });
            login({
                id: response.data.user_id,
                full_name: response.data.full_name,
                phone_number: phoneNumber,
                role: response.data.role
            }, response.data.access_token);
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await api.post('/auth/login/staff', adminData);
            login(
                {
                    id: response.data.user_id,
                    full_name: response.data.full_name,
                    email: adminData.email,
                    role: response.data.role
                },
                response.data.access_token,
                response.data.password_reset_required
            );
        } catch (err) {
            setError(err.response?.data?.detail || 'Admin login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleFaceLogin = useCallback(async () => {
        if (!phoneNumber) return setError('Phone number is required for face verification');
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) return setError('Could not capture face');
        setLoading(true);
        try {
            const response = await api.post('/auth/login/face', {
                phone_number: phoneNumber,
                face_image: imageSrc
            });
            login({
                id: response.data.user_id,
                full_name: response.data.full_name,
                phone_number: phoneNumber,
                role: response.data.role
            }, response.data.access_token);
        } catch (err) {
            setError(err.response?.data?.detail || 'Face recognition failed');
        } finally {
            setLoading(false);
        }
    }, [webcamRef, phoneNumber, login]);

    return (
        <div className="auth-card card">
            <div className="auth-header">
                <h2>{isStaffFlow ? 'Staff Terminal' : 'VMS Login'}</h2>
                <p className="subtitle">{isStaffFlow ? 'Personnel Verification Portal' : 'Facilitating secure visitor access'}</p>
            </div>

            {error && <p className="error-text">{error}</p>}

            {step === 1 && (
                <div className="login-options">
                    <div className="form-group">
                        <label><Phone size={16} /> Registered Phone Number</label>
                        <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+91..." required />
                    </div>

                    <div className="login-choice-grid">
                        <button onClick={() => setStep(4)} className="primary-btn flex-col">
                            <ShieldCheck size={24} />
                            <span>Login with Face Identity</span>
                        </button>
                        <button onClick={handleSendOtp} className="secondary-btn flex-col">
                            <Phone size={24} />
                            <span>Login with Mobile OTP</span>
                        </button>
                    </div>

                    <div className="staff-footer-btns">
                        <button type="button" className="link-btn staff-toggle" onClick={() => setIsStaffFlow(!isStaffFlow)}>
                            Switch to {isStaffFlow ? 'Visitor' : 'Staff'} Login
                        </button>
                        {isStaffFlow && (
                            <button type="button" className="link-btn admin-link" onClick={() => setStep(5)}>
                                <Lock size={14} /> Admin Portal
                            </button>
                        )}
                    </div>
                </div>
            )}

            {step === 3 && (
                <form onSubmit={handleVerifyOtp}>
                    <div className="form-group">
                        <label>Enter 4-digit OTP</label>
                        <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength="4" className="otp-input" />
                    </div>
                    <button type="submit" className="primary-btn">Verify Identity</button>
                    <div className="resend-container">
                        {timer > 0 ? <p className="resend-text">Resend in <strong>{timer}s</strong></p> : <button type="button" className="link-btn" onClick={handleSendOtp}>Resend OTP</button>}
                        <button type="button" className="link-btn" onClick={() => setStep(1)}>Switch Method</button>
                    </div>
                </form>
            )}

            {step === 4 && (
                <div className="face-login-container">
                    {!phoneNumber && (
                        <div className="form-group w-full">
                            <label>Confirm Phone Number</label>
                            <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+91..." />
                        </div>
                    )}
                    <div className="webcam-container small-webcam">
                        <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="webcam-view" />
                        <div className="scanner-line"></div>
                    </div>
                    <p className="face-hint">Align your face within the frame</p>
                    <button onClick={handleFaceLogin} className="primary-btn" disabled={loading}>
                        {loading ? 'Comparing...' : 'Verify Face'}
                    </button>
                    <button onClick={() => setStep(1)} className="link-btn">Back to Selection</button>
                </div>
            )}

            {step === 5 && (
                <form onSubmit={handleAdminLogin} className="admin-login-form">
                    <h3 className="section-title">Administrative Access</h3>
                    <div className="form-group">
                        <label><Mail size={16} /> Admin Email</label>
                        <input type="email" value={adminData.email} onChange={(e) => setAdminData({ ...adminData, email: e.target.value })} required placeholder="admin@vms.com" />
                    </div>
                    <div className="form-group">
                        <label><Lock size={16} /> Password</label>
                        <input type="password" value={adminData.password} onChange={(e) => setAdminData({ ...adminData, password: e.target.value })} required />
                    </div>
                    <button type="submit" className="primary-btn" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Secure Login'}
                    </button>
                    <button type="button" className="link-btn" onClick={() => setStep(1)}>Back to Staff Methods</button>
                </form>
            )}

            {step === 1 && !isStaffFlow && <p className="auth-footer">Don't have an account? <span onClick={onToggle}>Create one</span></p>}
        </div>
    );
}

export default Login;
