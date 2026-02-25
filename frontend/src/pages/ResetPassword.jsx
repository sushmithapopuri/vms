import React, { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Lock, RefreshCw } from 'lucide-react';

function ResetPassword() {
    const { user, login } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword === 'admin123') {
            setError('Please choose a different password than the default one.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            // console.log(user.email, newPassword);
            await api.post('/auth/reset-password', {
                email: user.email,
                new_password: newPassword
            });

            // Update local user state
            login(user, localStorage.getItem('token'), false);
        } catch (err) {
            // console.log(err);
            setError('Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card card reset-password-card">
                <h2><RefreshCw size={24} /> Reset Default Password</h2>
                <p className="subtitle">For security reasons, you must change your default password before proceeding.</p>

                {error && <p className="error-text">{error}</p>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label><Lock size={16} /> New Password</label>
                        <input name="newpass"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            placeholder="Min 6 characters"
                        />
                    </div>
                    <div className="form-group">
                        <label><Lock size={16} /> Confirm New Password</label>
                        <input name="confirmpass"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="primary-btn" disabled={loading}>
                        {loading ? 'Updating...' : 'Set New Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ResetPassword;
