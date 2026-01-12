"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthContext";

// Pages that don't require authentication
const PUBLIC_PATHS = ["/login", "/reset-password"];

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isPublicPath = PUBLIC_PATHS.some(
        (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

    useEffect(() => {
        if (!loading && !user && !isPublicPath) {
            router.replace("/login");
        }
    }, [user, loading, isPublicPath, router]);

    // Redirect logged-in users away from login page
    useEffect(() => {
        if (!loading && user && pathname === "/login") {
            router.replace("/");
        }
    }, [user, loading, pathname, router]);

    // Show nothing while checking auth (prevents flash of content)
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
        );
    }

    // If not logged in and trying to access protected route, show nothing (redirect will happen)
    if (!user && !isPublicPath) {
        return null;
    }

    // If logged in and on login page, show nothing (redirect will happen)
    if (user && pathname === "/login") {
        return null;
    }

    return <>{children}</>;
}
