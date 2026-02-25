import React, { useState, useRef, useCallback } from 'react';
import api from '../api/axios';
import Webcam from 'react-webcam';

function Signup({ onToggle }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        email: '',
        address: {
            street: '',
            city: '',
            state: '',
            pincode: ''
        },
        face_image: null
    });
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const webcamRef = useRef(null);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setFormData({ ...formData, face_image: imageSrc });
        setStep(4);
    }, [webcamRef, formData]);

    const [timer, setTimer] = useState(0);

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

    const handleResendOtp = async () => {
        if (timer > 0) return;
        setError('');
        try {
            await axios.post('http://localhost:8000/api/v1/auth/send-otp', null, {
                params: { phone_number: formData.phone_number }
            });
            setSuccess('A new OTP has been sent!');
            startTimer();
        } catch (err) {
            setError('Failed to resend OTP');
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/signup', formData);
            await api.post('/auth/send-otp', null, {
                params: { phone_number: formData.phone_number }
            });
            setStep(5);
            startTimer();
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/verify-otp', {
                phone_number: formData.phone_number,
                otp: otp
            });
            setSuccess('Verification successful! You can now login.');
            setTimeout(onToggle, 2000);
        } catch (err) {
            setError('Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-card card signup-wide">
            <h2>{step === 5 ? 'Verify Phone' : 'Join VMS'}</h2>

            <div className="step-indicator">
                <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
                <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
                <div sanded className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
                <div className={`step ${step >= 5 ? 'active' : ''}`}>4</div>
            </div>

            {error && <p className="error-text">{error}</p>}
            {success && <p className="success-text">{success}</p>}

            {step === 1 && (
                <div className="form-step">
                    <h3>Profile Information</h3>
                    <div className="form-group">
                        <label>Full Name *</label>
                        <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required />
                    </div>
                    <div className="form-group">
                        <label>Phone Number (+91...) *</label>
                        <input type="text" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} required placeholder="+91..." />
                    </div>
                    <div className="form-group">
                        <label>Email (Optional)</label>
                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <button className="primary-btn" onClick={() => setStep(2)}>Next: Address</button>
                </div>
            )}

            {step === 2 && (
                <div className="form-step">
                    <h3>Address Details</h3>
                    <div className="form-group">
                        <label>Street Address *</label>
                        <input type="text" value={formData.address.street} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })} required />
                    </div>
                    <div className="form-group">
                        <label>City *</label>
                        <input type="text" value={formData.address.city} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })} required />
                    </div>
                    <div className="form-group">
                        <label>State *</label>
                        <input type="text" value={formData.address.state} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })} required />
                    </div>
                    <div className="form-group">
                        <label>Pincode *</label>
                        <input type="text" value={formData.address.pincode} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, pincode: e.target.value } })} required maxLength="6" />
                    </div>
                    <div className="btn-group">
                        <button className="secondary-btn" onClick={() => setStep(1)}>Back</button>
                        <button className="primary-btn" onClick={() => setStep(3)}>Next: Face Capture</button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="form-step">
                    <h3>Face Identification</h3>
                    <div className="webcam-container">
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            className="webcam-view"
                        />
                    </div>
                    <div className="btn-group">
                        <button className="secondary-btn" onClick={() => setStep(2)}>Back</button>
                        <button className="primary-btn" onClick={capture}>Capture Face</button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="form-step">
                    <h3>Review & Register</h3>
                    <div className="review-scroll">
                        <div className="preview-image">
                            <img src={formData.face_image} alt="Face view" />
                        </div>
                        <p><strong>Name:</strong> {formData.full_name}</p>
                        <p><strong>Phone:</strong> {formData.phone_number}</p>
                        <p><strong>Address:</strong> {formData.address.street}, {formData.address.city}, {formData.address.pincode}</p>
                    </div>
                    <div className="btn-group">
                        <button className="secondary-btn" onClick={() => setStep(3)}>Retake</button>
                        <button className="primary-btn" onClick={handleSignup} disabled={loading}>
                            {loading ? 'Processing...' : 'Register & Send OTP'}
                        </button>
                    </div>
                </div>
            )}

            {step === 5 && (
                <div className="form-step">
                    <p>We've sent a 4-digit code to <strong>{formData.phone_number}</strong></p>
                    <div className="form-group">
                        <label>Enter OTP</label>
                        <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength="4" className="otp-input" />
                    </div>
                    <button className="primary-btn" onClick={handleVerifyOtp} disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify & Complete'}
                    </button>

                    <div className="resend-container">
                        {timer > 0 ? (
                            <p className="resend-text">Resend OTP in <strong>{timer}s</strong></p>
                        ) : (
                            <button className="link-btn" onClick={handleResendOtp}>Resend OTP</button>
                        )}
                    </div>
                </div>
            )}

            <p className="auth-footer">
                Already have an account? <span onClick={onToggle}>Login</span>
            </p>
        </div>
    );
}

export default Signup;
