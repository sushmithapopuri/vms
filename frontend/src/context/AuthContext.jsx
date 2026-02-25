import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // In a real app, verify token with backend
            const savedUser = JSON.parse(localStorage.getItem('user'));
            setUser(savedUser);
        }
        setLoading(false);
    }, []);

    const login = (userData, token, resetRequired = false) => {
        const userWithReset = { ...userData, passwordResetRequired: resetRequired };
        setUser(userWithReset);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userWithReset));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
