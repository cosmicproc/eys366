"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getUserInfo, login as apiLogin, logout as apiLogout } from "./apiClient";

interface User {
    id: number;
    username: string;
    role: "lecturer" | "head";
    name: string;
    courseIds: number[];
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (username: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem("giraph_token");
            if (token) {
                try {
                    const userData = await getUserInfo();
                    setUser(userData);
                } catch {
                    localStorage.removeItem("giraph_token");
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (username: string) => {
        const { token, user } = await apiLogin(username);
        localStorage.setItem("giraph_token", token);
        setUser(user);
    };

    const logout = async () => {
        try {
            await apiLogout();
        } finally {
            localStorage.removeItem("giraph_token");
            setUser(null);
            // Redirect to login or home
            window.location.href = "/login";
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
