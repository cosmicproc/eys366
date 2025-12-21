"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    first_name?: string;
    last_name?: string;
    courseIds?: string[];
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem("auth_token");
            if (token) {
                try {
                    const response = await fetch(`${API_URL}/api/users/me/`, {
                        headers: {
                            Authorization: `Token ${token}`,
                        },
                    });
                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                    } else {
                        localStorage.removeItem("auth_token");
                    }
                } catch {
                    localStorage.removeItem("auth_token");
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (username: string, password: string) => {
        const response = await fetch(`${API_URL}/api/login/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            throw new Error("Login failed");
        }

        const data = await response.json();
        localStorage.setItem("auth_token", data.token);
        setUser(data.user);
    };

    const logout = async () => {
        try {
            const token = localStorage.getItem("auth_token");
            if (token) {
                await fetch(`${API_URL}/api/logout/`, {
                    method: "POST",
                    headers: {
                        Authorization: `Token ${token}`,
                    },
                });
            }
        } finally {
            localStorage.removeItem("auth_token");
            setUser(null);
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
