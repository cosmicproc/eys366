"use client";

<<<<<<< HEAD
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

  // Only show header on graph page
  const isGraphPage = pathname === "/graph";

  return (
    <header className="flex justify-between items-center absolute top-0 left-0 w-full z-10 px-8 py-4 pointer-events-none">
      {/* Left: My Courses */}
      {isGraphPage && (
        <div className="pointer-events-auto gap-4 flex items-center">
          <Suspense
            fallback={
              <Button variant="light" loading>
                My Courses
              </Button>
            }
          >
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button variant="light">
                  {user.role === "head" ? "All Courses" : "My Courses"}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {user.courseIds?.map((id) => (
                  <Menu.Item
                    key={id}
                    onClick={() => {
                      router.push(`/graph?courseId=${id}`);
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
      )}

      {/* Center: App Title */}
      {isGraphPage && (
        <div className="pointer-events-auto py-3 px-24 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-bold border-2 border-neutral-400 bg-blue-100/30 backdrop-blur rounded-4xl shadow-md flex items-center">
          <Link href="/" className="text-2xl">
            {process.env.NEXT_PUBLIC_APP_NAME || "Giraph"}
          </Link>
        </div>
      )}

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
                {user.first_name?.charAt(0) || user.username.charAt(0)}
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
=======
import { Avatar, Button, Group, Menu, Text } from "@mantine/core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import NewItemButton from "./NewItemButton";

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

    // Load all courses for department heads
    useEffect(() => {
        if (user?.role === "head" && pathname === "/graph") {
            setLoadingCourses(true);
            fetch(
                `${
                    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
                }/api/programs/list_courses`
            )
                .then((res) => res.json())
                .then((data) => setCourses(data))
                .catch((error) =>
                    console.error("Failed to load courses:", error)
                )
                .finally(() => setLoadingCourses(false));
        }
    }, [user?.role, pathname]);

    if (!user) return null;

    // Only show header on graph page
    const isGraphPage = pathname === "/graph";

    // For lecturers, use courseIds; for heads, use loaded courses
    const coursesToShow =
        user.role === "head"
            ? courses
            : (user.courseIds || []).map((id) => ({
                  id: String(id),
                  name: `Course ${id}`,
              }));

    return (
        <header className="flex justify-between items-center absolute top-0 left-0 w-full z-10 px-8 py-4 pointer-events-none">
            {/* Left: My Courses */}
            {isGraphPage && (
                <div className="pointer-events-auto gap-4 flex items-center">
                    <Suspense
                        fallback={
                            <Button variant="light" loading>
                                {user.role === "head"
                                    ? "All Courses"
                                    : "My Courses"}
                            </Button>
                        }
                    >
                        <Menu shadow="md" width={200}>
                            <Menu.Target>
                                <Button
                                    variant="light"
                                    loading={
                                        user.role === "head" && loadingCourses
                                    }
                                >
                                    {user.role === "head"
                                        ? "All Courses"
                                        : "My Courses"}
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                {coursesToShow.length === 0 ? (
                                    <Menu.Item disabled>
                                        No courses available
                                    </Menu.Item>
                                ) : (
                                    coursesToShow.map((course) => (
                                        <Menu.Item
                                            key={course.id}
                                            onClick={() => {
                                                router.push(
                                                    `/graph?courseId=${course.id}`
                                                );
                                            }}
                                        >
                                            {course.name}
                                        </Menu.Item>
                                    ))
                                )}
                            </Menu.Dropdown>
                        </Menu>
                    </Suspense>
                    <Suspense fallback={null}>
                        <NewItemButton />
                    </Suspense>
                </div>
            )}

            {/* Center: App Title */}
            {isGraphPage && (
                <div className="pointer-events-auto py-3 px-24 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-bold border-2 border-neutral-400 bg-blue-100/30 backdrop-blur rounded-4xl shadow-md flex items-center">
                    <Link href="/" className="text-2xl">
                        {process.env.NEXT_PUBLIC_APP_NAME || "Giraph"}
                    </Link>
                </div>
            )}

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
>>>>>>> origin/dev
}
