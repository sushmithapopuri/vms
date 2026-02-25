import React, { useState, useRef, useCallback } from 'react';
import api from '../api/axios';
import Webcam from 'react-webcam';
import { UserPlus, Shield, User as UserIcon, Camera, Check } from 'lucide-react';
import { useEffect } from 'react';
import VisitorsTable from './VisitorsTable';

function ManageUsers({ adminId }) {
    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        email: '',
        role: 'employee',
        address: {
            street: 'VMS Office',
            city: 'HQ',
            state: 'TX',
            pincode: '123456'
        },
        face_image: null
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const webcamRef = useRef(null);

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setFormData(prev => ({ ...prev, face_image: imageSrc }));
        setShowCamera(false);
    }, [webcamRef]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);
        try {
            await api.post(`/admin/create-user?admin_id=${adminId}`, formData);
            setMessage('User created successfully!');
            setFormData({
                full_name: '',
                phone_number: '',
                email: '',
                role: 'employee',
                address: { street: 'VMS Office', city: 'HQ', state: 'TX', pincode: '123456' },
                face_image: null
            });
        } catch (err) {
            setMessage(err.response?.data?.detail || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        const fetchVisitors = async () => {
            try {
                const res = await api.get('/admin/users/visitors');
                if (mounted) setVisitors(res.data);
            } catch (e) {
                // ignore
            }
        };
        fetchVisitors();
        return () => { mounted = false };
    }, []);

    const [visitors, setVisitors] = useState([]);

    return (
        <div className="card manage-users">
            <h3>Add New System User</h3>
            {message && <p className={message.includes('success') ? 'success-text' : 'error-text'}>{message}</p>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Role</label>
                    <div className="role-selector">
                        <button
                            type="button"
                            className={formData.role === 'employee' ? 'active' : ''}
                            onClick={() => setFormData({ ...formData, role: 'employee' })}
                        >
                            <UserIcon size={16} /> Employee
                        </button>
                        <button
                            type="button"
                            className={formData.role === 'security' ? 'active' : ''}
                            onClick={() => setFormData({ ...formData, role: 'security' })}
                        >
                            <Shield size={16} /> Security
                        </button>
                        <button
                            type="button"
                            className={formData.role === 'admin' ? 'active' : ''}
                            onClick={() => setFormData({ ...formData, role: 'admin' })}
                        >
                            <Shield size={16} /> Admin
                        </button>
                    </div>
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Phone Number</label>
                        <input
                            type="text"
                            value={formData.phone_number}
                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                            required
                            placeholder="+91..."
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Email</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>

                <div className="form-group photo-section">
                    <label>Staff Identity Photo</label>
                    {showCamera ? (
                        <div className="camera-box">
                            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" />
                            <button type="button" onClick={capture} className="capture-btn">Capture Photo</button>
                        </div>
                    ) : (
                        <div className="photo-preview-container">
                            {formData.face_image ? (
                                <div className="photo-preview">
                                    <img src={formData.face_image} alt="Captured" />
                                    <span className="success-badge"><Check size={12} /> Captured</span>
                                </div>
                            ) : (
                                <div className="photo-placeholder">No photo captured</div>
                            )}
                            <button type="button" onClick={() => setShowCamera(true)} className="secondary-btn">
                                <Camera size={16} /> {formData.face_image ? 'Retake Photo' : 'Capture Photo'}
                            </button>
                        </div>
                    )}
                </div>

                <button type="submit" className="primary-btn" disabled={loading}>
                    <UserPlus size={18} /> {loading ? 'Creating...' : 'Register User'}
                </button>
            </form>

            <div style={{ marginTop: '1rem' }}>
                <VisitorsTable visitors={visitors} />
            </div>
        </div>
    );
}

export default ManageUsers;
