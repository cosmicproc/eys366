"use client";

import {
    Badge,
    Button,
    Card,
    Container,
    Grid,
    Group,
    Paper,
    Skeleton,
    Text,
    Title,
} from "@mantine/core";
import {
    IconBook,
    IconGraph,
    IconTarget,
    IconUsers,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCourses, getNodes, type Course } from "./lib/apiClient";
import { useAuth } from "./lib/AuthContext";

export default function Home() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState({
        courseContents: 0,
        courseOutcomes: 0,
        programOutcomes: 0,
        totalRelations: 0,
    });
    const [loadingStats, setLoadingStats] = useState(true);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
            return;
        }

        if (user) {
            loadStatistics();
            loadCourses();
        }
    }, [user, authLoading, router]);

    const loadCourses = async () => {
        try {
            setLoadingCourses(true);
            const data = await getCourses();
            setCourses(data);
        } catch (error) {
            console.error("Failed to load courses:", error);
        } finally {
            setLoadingCourses(false);
        }
    };

    const loadStatistics = async () => {
        try {
            setLoadingStats(true);
            // Load stats for first course if lecturer, or all if head
            const courseId =
                user?.role === "lecturer" && user.courseIds?.[0]
                    ? user.courseIds[0]
                    : undefined;

            const data = await getNodes(courseId);

            const totalRelations =
                [
                    ...data.course_contents,
                    ...data.course_outcomes,
                    ...data.program_outcomes,
                ].reduce((sum, node) => sum + node.relations.length, 0) / 2; // Divide by 2 since relations are counted twice

            setStats({
                courseContents: data.course_contents.length,
                courseOutcomes: data.course_outcomes.length,
                programOutcomes: data.program_outcomes.length,
                totalRelations: Math.floor(totalRelations),
            });
        } catch (error) {
            console.error("Failed to load statistics:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    if (authLoading || !user) {
        return (
            <Container size="lg" className="py-20 mt-20">
                <Skeleton height={200} mb="lg" />
                <Grid>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <Skeleton height={150} />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 6 }}>
                        <Skeleton height={150} />
                    </Grid.Col>
                </Grid>
            </Container>
        );
    }

    const quickActions = [
        {
            title: "View Graph",
            description:
                user?.role === "head"
                    ? "Visualize course and program outcomes"
                    : "Visualize your course outcomes",
            icon: <IconGraph size={24} />,
            color: "blue",
            onClick: () => router.push("/graph"),
        },
    ];

    return (
        <Container size="lg" className="py-20 mt-20">
            {/* Welcome Section */}
            <Paper shadow="xs" p="xl" mb="xl" withBorder>
                <Group justify="space-between" mb="md">
                    <div>
                        <Title order={1} mb="xs">
                            Welcome back, {user.first_name || user.username}!
                        </Title>
                        <Group gap="xs">
                            <Badge
                                size="lg"
                                variant="light"
                                color={user.role === "head" ? "grape" : "blue"}
                            >
                                {user.role === "head"
                                    ? "Department Head"
                                    : "Lecturer"}
                            </Badge>
                            {user.department && (
                                <Badge size="lg" variant="outline">
                                    {user.department}
                                </Badge>
                            )}
                        </Group>
                    </div>
                </Group>
                <Text size="sm" c="dimmed">
                    {user.role === "head"
                        ? "Manage your program, oversee courses, and track outcomes across the department."
                        : `Manage your ${
                              user.courseIds?.length || 0
                          } assigned course${
                              (user.courseIds?.length || 0) !== 1 ? "s" : ""
                          }.`}
                </Text>
            </Paper>

            {/* Statistics Overview */}
            <Title order={2} mb="md">
                Overview
            </Title>
            <Grid mb="xl">
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card
                        shadow="sm"
                        padding="lg"
                        withBorder
                        h="100%"
                        minh={160}
                    >
                        {loadingStats ? (
                            <Skeleton height={80} />
                        ) : (
                            <>
                                <Group gap="xs" mb="lg">
                                    <Text size="sm" c="dimmed" flex={1}>
                                        Course Contents
                                    </Text>
                                    <IconBook
                                        size={20}
                                        color="var(--mantine-color-blue-6)"
                                        style={{ flexShrink: 0 }}
                                    />
                                </Group>
                                <Text size="xl" fw={700}>
                                    {stats.courseContents}
                                </Text>
                            </>
                        )}
                    </Card>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card
                        shadow="sm"
                        padding="lg"
                        withBorder
                        h="100%"
                        minh={160}
                    >
                        {loadingStats ? (
                            <Skeleton height={80} />
                        ) : (
                            <>
                                <Group gap="xs" mb="lg">
                                    <Text size="sm" c="dimmed" flex={1}>
                                        Course Outcomes
                                    </Text>
                                    <IconTarget
                                        size={20}
                                        color="var(--mantine-color-violet-6)"
                                        style={{ flexShrink: 0 }}
                                    />
                                </Group>
                                <Text size="xl" fw={700}>
                                    {stats.courseOutcomes}
                                </Text>
                            </>
                        )}
                    </Card>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card
                        shadow="sm"
                        padding="lg"
                        withBorder
                        h="100%"
                        minh={160}
                    >
                        {loadingStats ? (
                            <Skeleton height={80} />
                        ) : (
                            <>
                                <Group gap="xs" mb="lg">
                                    <Text size="sm" c="dimmed" flex={1}>
                                        Program Outcomes
                                    </Text>
                                    <IconUsers
                                        size={20}
                                        color="var(--mantine-color-green-6)"
                                        style={{ flexShrink: 0 }}
                                    />
                                </Group>
                                <Text size="xl" fw={700}>
                                    {stats.programOutcomes}
                                </Text>
                            </>
                        )}
                    </Card>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                    <Card
                        shadow="sm"
                        padding="lg"
                        withBorder
                        h="100%"
                        minh={160}
                    >
                        {loadingStats ? (
                            <Skeleton height={80} />
                        ) : (
                            <>
                                <Group gap="xs" mb="lg">
                                    <Text size="sm" c="dimmed" flex={1}>
                                        Total Relations
                                    </Text>
                                    <IconGraph
                                        size={20}
                                        color="var(--mantine-color-orange-6)"
                                        style={{ flexShrink: 0 }}
                                    />
                                </Group>
                                <Text size="xl" fw={700}>
                                    {stats.totalRelations}
                                </Text>
                            </>
                        )}
                    </Card>
                </Grid.Col>
            </Grid>

            {/* Quick Actions */}
            <Title order={2} mb="md">
                Quick Actions
            </Title>
            <Grid>
                {quickActions.map((action) => (
                    <Grid.Col
                        key={action.title}
                        span={{ base: 12, sm: 6, md: 6 }}
                    >
                        <Card
                            shadow="sm"
                            padding="lg"
                            withBorder
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={action.onClick}
                        >
                            <Group>
                                <div
                                    className={`p-3 rounded-lg bg-${action.color}-50`}
                                >
                                    {action.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Text fw={500} size="lg">
                                        {action.title}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        {action.description}
                                    </Text>
                                </div>
                            </Group>
                        </Card>
                    </Grid.Col>
                ))}
            </Grid>

            {/* Recent Activity / Additional Info */}
            {user.role === "head" && (
                <Paper shadow="xs" p="lg" mt="xl" withBorder>
                    <Title order={3} mb="md">
                        Department Information
                    </Title>
                    <Grid>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <Text size="sm" c="dimmed" mb="xs">
                                University
                            </Text>
                            <Text fw={500}>
                                {user.university || "Not specified"}
                            </Text>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 6 }}>
                            <Text size="sm" c="dimmed" mb="xs">
                                Total Courses
                            </Text>
                            <Text fw={500}>{user.courseIds?.length || 0}</Text>
                        </Grid.Col>
                    </Grid>
                    <Button
                        mt="md"
                        variant="light"
                        color="grape"
                        onClick={() => router.push("/program")}
                    >
                        Manage Program
                    </Button>
                </Paper>
            )}

            {user.role === "lecturer" && (
                <Paper shadow="xs" p="lg" mt="xl" withBorder>
                    <Title order={3} mb="md">
                        Your Courses
                    </Title>
                    <Text size="sm" c="dimmed" mb="md">
                        You have access to {user.courseIds?.length || 0} course
                        {(user.courseIds?.length || 0) !== 1 ? "s" : ""}.
                    </Text>
                    <Group>
                        {user.courseIds?.map((courseId) => {
                            const course = courses.find(
                                (c) => c.id === courseId
                            );
                            return (
                                <Button
                                    key={courseId}
                                    variant="light"
                                    onClick={() =>
                                        router.push(
                                            `/graph?courseId=${courseId}`
                                        )
                                    }
                                >
                                    {course?.name || `Course ${courseId}`}
                                </Button>
                            );
                        })}
                    </Group>
                </Paper>
            )}
        </Container>
    );
}
