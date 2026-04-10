import { createContext, useContext, useEffect, useState } from 'react';

export const unknownUser = {
    name: "???",
    username: "@unknown",
    bio: "No bio set yet.",
    email: "???@unknown.com",
    profilePicture: "/assets/croc-dark.png",
}

// Creating context
const AuthContext = createContext(null);

// Creating provider component
export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchUserData() {
            console.log('Fetching user data')
            try {
                const res = await fetch("http://localhost:5000/api/auth/me", { credentials: "include" });
                if (!res.ok) {
                    setUser(null);
                    return;
                }
                const json = await res.json();
                console.log("AuthContext initial fetch:", json);
                setUser(json.data);
            } catch (err) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        }
        fetchUserData();
    }, [])

    function login() {
        window.location.href = "http://localhost:5000/api/auth/google";
    }

    async function logout() {
        try {
            await fetch('http://localhost:5000/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (e) {
            console.log('Logout failed', e);
        } finally {
            setUser(null);
            window.location.href = '/login';
        }
    }

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// custom hook to use context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};