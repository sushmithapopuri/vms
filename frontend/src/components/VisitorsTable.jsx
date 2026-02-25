import React from 'react';

function VisitorsTable({ visitors = [] }) {
    return (
        <div className="card visitors-table">
            <h4>Registered Visitors</h4>
            {visitors.length === 0 ? (
                <p className="hint">No visitors found.</p>
            ) : (
                <table className="full-width">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Verified</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visitors.map(v => (
                            <tr key={v.id}>
                                <td>{v.id}</td>
                                <td>{v.full_name}</td>
                                <td>{v.phone_number}</td>
                                <td>{v.email || '—'}</td>
                                <td>{v.is_verified ? 'Yes' : 'No'}</td>
                                <td>{v.created_at ? new Date(v.created_at).toLocaleDateString() : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default VisitorsTable;
