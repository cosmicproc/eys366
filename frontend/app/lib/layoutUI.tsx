"use client";

import { Avatar, Button, Group, Menu, Text } from "@mantine/core";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import NewItemButton from "./NewItemButton";
import UploadCSVButton from "./UploadCSVButton";
import { applyScores, resetScores } from "./apiClient";

interface Course {
    id: string;
    name: string;
}

function HeaderContent() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(false);

    // Load courses for both heads and lecturers
    useEffect(() => {
        if (user && pathname === "/graph") {
            setLoadingCourses(true);
            const endpoint = "/api/programs/list_courses/";
            const url = `${
                process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
            }${endpoint}`;

            // Get auth token
            const token = localStorage.getItem("token");

            fetch(url, {
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Token ${token}` } : {}),
                },
            })
                .then(async (res) => {
                    if (!res.ok) {
                        throw new Error(`HTTP error! status: ${res.status}`);
                    }
                    return res.json();
                })
                .then((data) => {
                    // Filter courses for lecturer if needed
                    if (user.role === "lecturer" && user.courses) {
                        const filteredCourses = data.filter((course: Course) =>
                            user.courses?.includes(parseInt(course.id))
                        );
                        setCourses(filteredCourses);
                    } else {
                        setCourses(data);
                    }
                })
                .catch((error) => {
                    console.error("Failed to load courses:", error);
                    setCourses([]);
                })
                .finally(() => setLoadingCourses(false));
        }
    }, [user, pathname]);

    if (!user) return null;

    // Only show header on graph page
    const isGraphPage = pathname === "/graph";

    // Use loaded courses for both roles
    const coursesToShow = courses;

    const handleApplyCSVValues = async (
        values: Record<string, number>,
        studentId?: string
    ) => {
        console.log(
            "Applying CSV values to graph:",
            values,
            "studentId:",
            studentId
        );

        // Call backend to persist mapped values on nodes and refresh graph
        try {
            const courseIdMatch =
                window.location.search.match(/courseId=([^&]+)/);
            const courseId = courseIdMatch
                ? decodeURIComponent(courseIdMatch[1])
                : undefined;
            const res = await applyScores(values, courseId);

            // Notify graph area to reload data
            window.dispatchEvent(new Event("scoresUpdated"));

            // If a studentId was provided, fetch calculated student results and dispatch event
            if (studentId) {
                try {
                    const studentResults = await (
                        await import("./apiClient")
                    ).calculateStudentResults(studentId, courseId);
                    window.dispatchEvent(
                        new CustomEvent("studentResultsUpdated", {
                            detail: studentResults,
                        })
                    );
                } catch (err) {
                    console.error("Failed to fetch student results:", err);
                }
            }

            console.log("Applied scores, updated graph response:", res);
        } catch (err) {
            console.error("Failed to apply scores to graph:", err);
        }
    };

    const handleResetScores = async () => {
        if (
            !confirm(
                "Are you sure you want to reset all scores for this graph?"
            )
        )
            return;

        try {
            const courseIdMatch =
                window.location.search.match(/courseId=([^&]+)/);
            const courseId = courseIdMatch
                ? decodeURIComponent(courseIdMatch[1])
                : undefined;
            await resetScores(courseId);
            window.dispatchEvent(new Event("scoresUpdated"));
        } catch (err) {
            console.error("Failed to reset scores:", err);
        }
    };

    if (isGraphPage) {
        return (
            <header className="flex justify-center items-start absolute top-0 left-0 w-full z-10 pt-6 pointer-events-none">
                 <div className="pointer-events-auto grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-2 px-4 border border-neutral-200 bg-white/60 backdrop-blur-xl rounded-full shadow-md transition-all hover:bg-white/70">
                      
                      {/* Left: Logic for Head/Lecturer */}
                      <div className="flex items-center justify-start gap-2">
                      {(user.role === "head" || user.role === "lecturer") && (
                         <> 
                            <Suspense fallback={null}>
                                <NewItemButton />
                            </Suspense>
                            <Suspense fallback={null}>
                                <UploadCSVButton
                                    onApplyValues={handleApplyCSVValues}
                                    onReset={handleResetScores}
                            />
                            </Suspense>
                         </>
                      )}
                      </div>

                      {/* Title */}
                      <Link href="/" className="px-3 py-1 justify-self-center mx-14">
                            <Text fw={900} size="xl" className="tracking-tight text-slate-800">
                                {process.env.NEXT_PUBLIC_APP_NAME || "Giraph"}
                            </Text>
                      </Link>

                      <div className="flex items-center justify-end gap-2 pl-2">
                            {user.role === "head" && (
                                <Suspense fallback={<Button size="compact-sm" variant="subtle" loading>...</Button>}>
                                    <Menu shadow="md" width={200}>
                                        <Menu.Target>
                                            <Button variant="subtle" radius="lg" color="dark">
                                                Courses ▾
                                            </Button>
                                        </Menu.Target>
                                         <Menu.Dropdown>
                                            {coursesToShow.length === 0 ? (
                                                <Menu.Item disabled>No courses available</Menu.Item>
                                            ) : (
                                                coursesToShow.map((course) => (
                                                    <Menu.Item key={course.id} onClick={() => router.push(`/graph?courseId=${course.id}`)}>
                                                        {course.name}
                                                    </Menu.Item>
                                                ))
                                            )}
                                        </Menu.Dropdown>
                                    </Menu>
                                </Suspense>
                            )}
                            
                          <Menu shadow="md" width={200} position="bottom-end">
                            <Menu.Target>
                                <Group gap={6} className="cursor-pointer hover:bg-black/5 p-1.5 rounded-2xl pr-3 transition-colors">
                                    <Avatar color="blue" radius="xl" size="sm">
                                        {user.first_name?.charAt(0) || user.username.charAt(0)}
                                    </Avatar>
                                    <Text size="sm" fw={500} visibleFrom="xs" className="text-slate-700">
                                        {user.first_name + " " + user.last_name || user.username}
                                    </Text>
                                </Group>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item onClick={() => router.push("/user")}>
                                    User Settings
                                </Menu.Item>
                                <Menu.Item color="red" onClick={logout}>
                                    Logout
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                      </div>
                 </div>
            </header>
        );
    }

    return (
        <header className="flex justify-between items-center absolute top-0 left-0 w-full z-10 px-8 py-4 pointer-events-none">
            {/* Left: Action buttons - Show for both head and lecturer */}
            {<div className="pointer-events-auto gap-4 flex items-center">
                <Link href="/" className="flex items-center gap-2">
                    <Image
                        src="/eys366.png"
                        alt="Logo"
                        width={40}
                        height={40}
                    />
                    <Text fw={900} size="xl" className="tracking-tight text-slate-800">
                        {process.env.NEXT_PUBLIC_APP_NAME || "Giraph"}
                    </Text>
                </Link>
            </div>}

            {/* Right: User Profile - Always visible */}
            <div className="pointer-events-auto flex items-center gap-4 ml-auto">
                {user.role === "head" && (
                    <Link href="/program">
                        <Button variant="subtle" color="grape">
                            Program Management
                        </Button>
                    </Link>
                )}
                <Link href="/">
                    <Button variant="subtle">Home</Button>
                </Link>
                <Menu shadow="md" width={200}>
                    <Menu.Target>
                        <Group
                            gap="xs"
                            className="cursor-pointer bg-white/80 p-2 rounded-lg shadow-sm"
                        >
                            <Avatar color="blue" radius="xl">
                                {user.first_name?.charAt(0) ||
                                    user.username.charAt(0)}
                            </Avatar>
                            <div className="flex flex-col">
                                <Text size="sm" fw={500}>
                                    {user.first_name && user.last_name
                                        ? `${user.first_name} ${user.last_name}`
                                        : user.username}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    {user.role}
                                </Text>
                            </div>
                        </Group>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item onClick={() => router.push("/user")}>
                            User Settings
                        </Menu.Item>
                        <Menu.Item color="red" onClick={logout}>
                            Logout
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </div>
        </header>
    );
}

export default function RootUILayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <AuthProvider>
            <div className="flex flex-col flex-grow h-screen relative">
                <HeaderContent />
                {children}
            </div>
        </AuthProvider>
    );
}
