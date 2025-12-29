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
  IconSettings,
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
        user?.role !== "head" && user?.courseIds?.[0]
          ? user.courseIds[0]
          : undefined;

      const data = await getNodes(courseId);

      const totalRelations =
        [
          ...data.course_contents,
          ...data.course_outcomes,
          ...data.program_outcomes,
        ].reduce((sum, node) => sum + node.relations.length, 0) / 2;

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

  const isHead = user.role === "head";

  // Filter courses for lecturers based on their assigned course IDs
  const userCourses = isHead
    ? courses
    : courses.filter((course) => {
        // Check if course.id matches any of user's courseIds or courses
        const courseIdStr = String(course.id);
        const courseIdNum = parseInt(course.id);
        return (
          user.courseIds?.includes(courseIdStr) ||
          user.courses?.includes(courseIdNum)
        );
      });

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
                color={isHead ? "grape" : "blue"}
              >
                {isHead ? "Department Head" : "Lecturer"}
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
          {isHead
            ? "Manage your program, oversee courses, and track outcomes across the department."
            : `Manage your ${userCourses.length || 0} assigned course${
                userCourses.length !== 1 ? "s" : ""
              }.`}
        </Text>
      </Paper>

      {/* Statistics Overview */}
      <Title order={2} mb="md">
        Overview
      </Title>
      <Grid mb="xl">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" withBorder h="100%">
            {loadingStats ? (
              <Skeleton height={80} />
            ) : (
              <>
                <Group gap="xs" mb="lg">
                  <Text size="sm" c="dimmed" flex={1}>
                    Course Contents
                  </Text>
                  <IconBook size={20} color="var(--mantine-color-blue-6)" />
                </Group>
                <Text size="xl" fw={700}>
                  {stats.courseContents}
                </Text>
              </>
            )}
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" withBorder h="100%">
            {loadingStats ? (
              <Skeleton height={80} />
            ) : (
              <>
                <Group gap="xs" mb="lg">
                  <Text size="sm" c="dimmed" flex={1}>
                    Course Outcomes
                  </Text>
                  <IconTarget size={20} color="var(--mantine-color-violet-6)" />
                </Group>
                <Text size="xl" fw={700}>
                  {stats.courseOutcomes}
                </Text>
              </>
            )}
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" withBorder h="100%">
            {loadingStats ? (
              <Skeleton height={80} />
            ) : (
              <>
                <Group gap="xs" mb="lg">
                  <Text size="sm" c="dimmed" flex={1}>
                    Program Outcomes
                  </Text>
                  <IconUsers size={20} color="var(--mantine-color-green-6)" />
                </Group>
                <Text size="xl" fw={700}>
                  {stats.programOutcomes}
                </Text>
              </>
            )}
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" withBorder h="100%">
            {loadingStats ? (
              <Skeleton height={80} />
            ) : (
              <>
                <Group gap="xs" mb="lg">
                  <Text size="sm" c="dimmed" flex={1}>
                    Total Relations
                  </Text>
                  <IconGraph size={20} color="var(--mantine-color-orange-6)" />
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
      <Grid mb="xl">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Card
            shadow="sm"
            padding="lg"
            withBorder
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/graph")}
          >
            <Group>
              <div className="p-3 rounded-lg bg-blue-50">
                <IconGraph size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <Text fw={500} size="lg">
                  View Graph
                </Text>
                <Text size="sm" c="dimmed">
                  {isHead
                    ? "Visualize course and program outcomes"
                    : "Visualize your course outcomes"}
                </Text>
              </div>
            </Group>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Card
            shadow="sm"
            padding="lg"
            withBorder
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/user")}
          >
            <Group>
              <div className="p-3 rounded-lg bg-gray-50">
                <IconSettings size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <Text fw={500} size="lg">
                  User Settings
                </Text>
                <Text size="sm" c="dimmed">
                  Update your profile and account settings
                </Text>
              </div>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Your Courses Section */}
      <Title order={2} mb="md">
        {isHead ? "All Courses" : "Your Courses"}
      </Title>
      <Paper shadow="xs" p="lg" mb="xl" withBorder>
        {loadingCourses ? (
          <Grid>
            {[1, 2, 3].map((i) => (
              <Grid.Col key={i} span={{ base: 12, sm: 6, md: 4 }}>
                <Skeleton height={100} radius="md" />
              </Grid.Col>
            ))}
          </Grid>
        ) : userCourses.length === 0 ? (
          <Text c="dimmed" ta="center" py="lg">
            {isHead
              ? "No courses created yet. Go to Program Management to add courses."
              : "You have no courses assigned yet. Contact your department head."}
          </Text>
        ) : (
          <Grid>
            {userCourses.map((course) => (
              <Grid.Col key={course.id} span={{ base: 12, sm: 6, md: 4 }}>
                <Card
                  shadow="sm"
                  padding="md"
                  withBorder
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/graph?courseId=${course.id}`)}
                >
                  <Group justify="space-between" mb="xs">
                    <Text fw={500} lineClamp={1}>
                      {course.name}
                    </Text>
                    <IconBook size={18} color="var(--mantine-color-blue-6)" />
                  </Group>
                  {course.department && (
                    <Text size="xs" c="dimmed" mb="sm">
                      {course.department}
                    </Text>
                  )}
                  <Button
                    variant="light"
                    size="xs"
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/graph?courseId=${course.id}`);
                    }}
                  >
                    View Graph
                  </Button>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Department Information (Head only) */}
      {isHead && (
        <Paper shadow="xs" p="lg" mt="xl" withBorder>
          <Title order={3} mb="md">
            Department Information
          </Title>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="sm" c="dimmed" mb="xs">
                University
              </Text>
              <Text fw={500}>{user.university || "Not specified"}</Text>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Text size="sm" c="dimmed" mb="xs">
                Total Courses
              </Text>
              <Text fw={500}>{courses.length}</Text>
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
    </Container>
  );
}
