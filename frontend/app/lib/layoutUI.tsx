"use client";

import { Button, Menu, Text, Avatar, Group } from "@mantine/core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import NewItemButton from "./NewItemButton";

function HeaderContent() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    if (!user) return null;

    return (
        <header className="flex justify-between items-center absolute top-0 left-0 w-full z-10 px-8 py-4 pointer-events-none">
            {/* Left: My Courses */}
            <div className="pointer-events-auto gap-4 flex items-center">
                <Suspense fallback={<Button variant="light" loading>My Courses</Button>}>
                    <Menu shadow="md" width={200}>
                        <Menu.Target>
                            <Button variant="light">
                                {user.role === "head" ? "All Courses" : "My Courses"}
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {user.courseIds.map((id) => (
                                <Menu.Item
                                    key={id}
                                    onClick={() => {
                                        router.push(`/?courseId=${id}`);
                                    }}
                                >
                                    Course {id}
                                </Menu.Item>
                            ))}
                        </Menu.Dropdown>
                    </Menu>
                </Suspense>
                <Suspense fallback={null}>
                    <NewItemButton />
                </Suspense>
            </div>

            {/* Center: App Title & New Item */}
            <div className="pointer-events-auto py-3 px-24 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-bold border-2 border-neutral-400 bg-blue-100/30 backdrop-blur rounded-4xl shadow-md flex items-center">
                <Link href="/" className="text-2xl">
                    {process.env.NEXT_PUBLIC_APP_NAME || "Giraph"}
                </Link>
            </div>

            {/* Right: User Profile */}
            <div className="pointer-events-auto flex items-center gap-4">
                {user.role === "head" && (
                    <Link href="/program">
                        <Button variant="subtle" color="grape">
                            Program Management
                        </Button>
                    </Link>
                )}
                <Menu shadow="md" width={200}>
                    <Menu.Target>
                        <Group gap="xs" className="cursor-pointer bg-white/80 p-2 rounded-lg shadow-sm">
                            <Avatar color="blue" radius="xl">
                                {user.name.charAt(0)}
                            </Avatar>
                            <div className="flex flex-col">
                                <Text size="sm" fw={500}>
                                    {user.name}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    {user.role}
                                </Text>
                            </div>
                        </Group>
                    </Menu.Target>
                    <Menu.Dropdown>
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
