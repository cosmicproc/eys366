"use client";

import { Avatar, Button, Group, Menu, Text } from "@mantine/core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import NewItemButton from "./NewItemButton";
import UploadCSVButton from "./UploadCSVButton";

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
      const token = localStorage.getItem("auth_token");

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

  const handleApplyCSVValues = (values: Record<string, number>) => {
    console.log("Applying CSV values to graph:", values);
    // TODO: Implement logic to apply these values to the graph
    // This could involve:
    // 1. Matching CSV column names to node names
    // 2. Updating edge weights based on the values
    // 3. Visual feedback on the graph
  };

  return (
    <header className="flex justify-between items-center absolute top-0 left-0 w-full z-10 px-8 py-4 pointer-events-none">
      {/* Left: Action buttons - Show for both head and lecturer */}
      {isGraphPage && (user.role === "head" || user.role === "lecturer") && (
        <div className="pointer-events-auto gap-4 flex items-center">
          {/* Only show My Courses dropdown for head */}
          {user.role === "head" && (
            <Suspense
              fallback={
                <Button variant="light" loading>
                  All Courses
                </Button>
              }
            >
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button variant="light" loading={loadingCourses}>
                    All Courses
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {coursesToShow.length === 0 ? (
                    <Menu.Item disabled>No courses available</Menu.Item>
                  ) : (
                    coursesToShow.map((course) => (
                      <Menu.Item
                        key={course.id}
                        onClick={() => {
                          router.push(`/graph?courseId=${course.id}`);
                        }}
                      >
                        {course.name}
                      </Menu.Item>
                    ))
                  )}
                </Menu.Dropdown>
              </Menu>
            </Suspense>
          )}

          {/* Show New Item and Upload buttons for both roles */}
          <Suspense fallback={null}>
            <NewItemButton />
          </Suspense>
          <Suspense fallback={null}>
            <UploadCSVButton onApplyValues={handleApplyCSVValues} />
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
}
