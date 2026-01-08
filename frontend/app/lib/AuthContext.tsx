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
  courses?: number[]; // Add this for the raw courses array
  department?: string;
  university?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper to normalize role naming
const normalizeRole = (role: string): string => {
  if (role === "department_head") return "head";
  return role;
};

// Helper to normalize user data from backend
const normalizeUserData = (userData: any): User => {
  return {
    ...userData,
    role: normalizeRole(userData.role),
    courseIds:
      userData.courseIds ||
      userData.courses?.map((id: number) => id.toString()) ||
      [],
    courses: userData.courses || [],
  };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      const cachedUser = localStorage.getItem("user");

      if (token) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/auth/me/`,
            {
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Token ${token}` } : {}),
              },
            }
          );
          if (response.ok) {
            const userData = await response.json();
            setUser(normalizeUserData(userData));
          } else {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        } catch {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      } else if (cachedUser) {
        try {
          setUser(normalizeUserData(JSON.parse(cachedUser)));
        } catch {
          localStorage.removeItem("user");
        }
      }

      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Login error:", response.status, errorData);
      throw new Error(errorData.error || errorData.detail || "Login failed");
    }

    const data = await response.json();
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(normalizeUserData(data.user));
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await fetch(`${API_URL}/api/auth/logout/`, {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
          },
        });
      }
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
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
