import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAccountants } from '../../shared/lib/userService';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async (force = false) => {
    if (!force && users.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAccountants();
      setUsers(result || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [users.length]);

  useEffect(() => { fetchUsers(); }, []);

  const value = {
    users,
    loading,
    error,
    fetchUsers,
    refetch: () => fetchUsers(true)
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUsers must be used within a UserProvider');
  return context;
}
