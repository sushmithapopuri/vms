import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import Webcam from 'react-webcam';
import { Save, UserCog, AlertCircle, RefreshCw, Camera, Check } from 'lucide-react';

function StaffManager({ adminId }) {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(null); // ID of user being edited
    const [editingData, setEditingData] = useState({});
    const [showCamera, setShowCamera] = useState(false);
    const webcamRef = useRef(null);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users/all-staff');
            setStaff(res.data);
        } catch (err) {
            setError("Failed to load staff list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const startEditing = (user) => {
        setEditMode(user.id);
        setEditingData(user);
    };

    const handleSave = async (id) => {
        try {
            await api.patch(`/admin/users/${id}?admin_id=${adminId}`, editingData);
            setEditMode(null);
            setShowCamera(false);
            fetchStaff();
        } catch (err) {
            alert("Failed to update user");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditingData(prev => ({ ...prev, [name]: value }));
    };

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setEditingData(prev => ({ ...prev, face_image: imageSrc }));
        setShowCamera(false);
    }, [webcamRef]);

    if (loading) return <div className="loading-tiny">Loading staff management...</div>;

    return (
        <div className="card staff-manager">
            <div className="card-header">
                <h2><UserCog size={20} /> Staff Management</h2>
                <button className="text-btn flex items-center gap-2" onClick={fetchStaff}><RefreshCw size={14} /> Refresh</button>
            </div>

            <div className="table-container excel-mode">
                <table>
                    <thead>
                        <tr>
                            <th>Photo</th>
                            <th>Full Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Role</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staff.map(user => (
                            <tr key={user.id} className={editMode === user.id ? 'editing-row' : ''}>
                                <td className="photo-cell">
                                    {editMode === user.id ? (
                                        <div className="inline-camera-container">
                                            {showCamera ? (
                                                <div className="mini-webcam">
                                                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" />
                                                    <button type="button" onClick={capture} className="mini-capture-btn">Capture</button>
                                                </div>
                                            ) : (
                                                <button type="button" onClick={() => setShowCamera(true)} className="icon-btn-text">
                                                    {editingData.face_image ? <Check size={14} color="green" /> : <Camera size={14} />}
                                                    <span>Update</span>
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="staff-avatar-sm">
                                            {user.face_image_path ? <img src={`${api.defaults.baseURL}/admin/proxy-image?path=${user.face_image_path}`} alt="staff" /> : user.full_name.charAt(0)}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    {editMode === user.id ? (
                                        <input name="full_name" value={editingData.full_name} onChange={handleChange} className="excel-input" />
                                    ) : user.full_name}
                                </td>
                                <td>
                                    {editMode === user.id ? (
                                        <input name="email" value={editingData.email} onChange={handleChange} className="excel-input" />
                                    ) : user.email}
                                </td>
                                <td>
                                    {editMode === user.id ? (
                                        <input name="phone_number" value={editingData.phone_number} onChange={handleChange} className="excel-input" />
                                    ) : user.phone_number || 'N/A'}
                                </td>
                                <td>
                                    {editMode === user.id ? (
                                        <select name="role" value={editingData.role} onChange={handleChange} className="excel-select">
                                            <option value="admin">Admin</option>
                                            <option value="employee">Employee</option>
                                            <option value="security">Security</option>
                                        </select>
                                    ) : (
                                        <span className={`role-tag ${user.role}`}>{user.role}</span>
                                    )}
                                </td>
                                <td>
                                    <div className="action-btns">
                                        {editMode === user.id ? (
                                            <>
                                                <button onClick={() => handleSave(user.id)} className="icon-btn success" title="Save"><Save size={16} /></button>
                                                <button onClick={() => setEditMode(null)} className="icon-btn danger" title="Cancel">×</button>
                                            </>
                                        ) : (
                                            <button onClick={() => startEditing(user)} className="text-btn">Edit</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="hint"><AlertCircle size={12} /> Click Edit to modify user details in place. You can now update identity photos directly from the dashboard.</p>
        </div>
    );
}

export default StaffManager;
