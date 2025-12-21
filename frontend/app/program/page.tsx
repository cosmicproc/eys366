"use client";

import {
    Button,
    Container,
    Group,
    Modal,
    Paper,
    Select,
    Table,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import {
    assignLecturerToCourse,
    createLecturer,
    createProgramOutcome,
    deleteProgramOutcome,
    getProgramInfo,
    getProgramOutcomes,
    updateLecturer,
} from "../lib/apiClient";

interface Lecturer {
    id: string;
    name: string;
    username: string;
}

interface Course {
    id: string;
    name: string;
    department: string;
    lecturer?: string;
}

interface ProgramOutcome {
    id: number;
    name: string;
}

export default function ProgramPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [lecturers, setLecturers] = useState<Lecturer[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [outcomes, setOutcomes] = useState<ProgramOutcome[]>([]);
    const [pageLoading, setPageLoading] = useState(true);

    // New lecturer state
    const [newLecturerModalOpen, setNewLecturerModalOpen] = useState(false);
    const [lecturerUsername, setLecturerUsername] = useState("");
    const [lecturerEmail, setLecturerEmail] = useState("");
    const [lecturerName, setLecturerName] = useState("");
    const [lecturerPassword, setLecturerPassword] = useState("123");
    const [creatingLecturer, setCreatingLecturer] = useState(false);
    const [lecturerError, setLecturerError] = useState<string | null>(null);

    // Assign lecturer state
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
        null
    );
    const [selectedLecturerId, setSelectedLecturerId] = useState<string | null>(
        null
    );
    const [assigningLecturer, setAssigningLecturer] = useState(false);
    const [assignError, setAssignError] = useState<string | null>(null);

    // Edit state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [saving, setSaving] = useState(false);

    // Course creation state
    const [courseModalOpen, setCourseModalOpen] = useState(false);
    const [courseName, setCourseName] = useState("");
    const [courseDept, setCourseDept] = useState("");
    const [creatingCourse, setCreatingCourse] = useState(false);
    const [courseError, setCourseError] = useState<string | null>(null);

    // Program outcome state
    const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
    const [outcomeName, setOutcomeName] = useState("");
    const [creatingOutcome, setCreatingOutcome] = useState(false);
    const [outcomeError, setOutcomeError] = useState<string | null>(null);
    const [deletingOutcomeId, setDeletingOutcomeId] = useState<number | null>(
        null
    );

    useEffect(() => {
        if (!loading) {
            if (!user || user.role !== "head") {
                router.push("/");
                return;
            }
            loadData();
        }
    }, [user, loading, router]);

    const loadData = async () => {
        try {
            const [lecturesData, outcomesData] = await Promise.all([
                getProgramInfo(),
                getProgramOutcomes(),
            ]);
            // Transform lecturers to match Lecturer interface
            const transformedLecturers = lecturesData.lecturers.map((l: any) => ({
                id: l.id,
                username: l.username,
                name: l.first_name && l.last_name ? `${l.first_name} ${l.last_name}` : l.username,
            }));
            setLecturers(transformedLecturers);
            setOutcomes(outcomesData);

            // Load courses from API
            const coursesRes = await fetch(
                `${
                    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
                }/api/programs/list_courses`
            );
            if (coursesRes.ok) {
                const coursesData = await coursesRes.json();
                setCourses(coursesData);
            }
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setPageLoading(false);
        }
    };

    const openEdit = (lecturer: Lecturer) => {
        setEditingId(lecturer.id);
        setEditName(lecturer.name);
        setEditModalOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingId) return;
        try {
            setSaving(true);
            await updateLecturer(editingId, editName);
            setLecturers((prev) =>
                prev.map((l) =>
                    l.id === editingId ? { ...l, name: editName } : l
                )
            );
            setEditModalOpen(false);
        } catch {
            alert("Failed to update lecturer");
        } finally {
            setSaving(false);
        }
    };

    const handleCreateCourse = async () => {
        setCourseError(null);

        if (!courseName.trim()) {
            setCourseError("Course name is required");
            return;
        }
        if (!courseDept.trim()) {
            setCourseError("Department is required");
            return;
        }

        try {
            setCreatingCourse(true);
            const response = await fetch(
                `${
                    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
                }/api/programs/create_course`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: courseName,
                        department: courseDept,
                        lecturer_id: user?.id,
                        university: user?.university || "Not specified",
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to create course");
            }

            const newCourse = await response.json();
            setCourses((prev) => [...prev, newCourse]);
            setCourseModalOpen(false);
            setCourseName("");
            setCourseDept("");
        } catch (error) {
            setCourseError(
                error instanceof Error
                    ? error.message
                    : "Failed to create course"
            );
        } finally {
            setCreatingCourse(false);
        }
    };

    const handleCreateOutcome = async () => {
        if (!outcomeName.trim()) {
            setOutcomeError("Outcome name cannot be empty");
            return;
        }

        setCreatingOutcome(true);
        setOutcomeError(null);

        try {
            await createProgramOutcome(outcomeName);
            setOutcomeName("");
            setOutcomeModalOpen(false);
            await loadData();
        } catch (error) {
            setOutcomeError(
                error instanceof Error
                    ? error.message
                    : "Failed to create outcome"
            );
        } finally {
            setCreatingOutcome(false);
        }
    };

    const handleDeleteOutcome = async (outcomeId: number) => {
        if (!confirm("Are you sure you want to delete this outcome?")) return;

        setDeletingOutcomeId(outcomeId);
        try {
            await deleteProgramOutcome(outcomeId);
            await loadData();
        } catch (error) {
            alert(
                `Failed to delete outcome: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        } finally {
            setDeletingOutcomeId(null);
        }
    };

    const handleCreateLecturer = async () => {
        if (
            !lecturerUsername.trim() ||
            !lecturerEmail.trim() ||
            !lecturerName.trim()
        ) {
            setLecturerError("All fields are required");
            return;
        }

        setCreatingLecturer(true);
        setLecturerError(null);

        try {
            await createLecturer({
                username: lecturerUsername,
                email: lecturerEmail,
                name: lecturerName,
                password: lecturerPassword,
                university: user?.university || "",
                department: user?.department || "",
            });
            setLecturerUsername("");
            setLecturerEmail("");
            setLecturerName("");
            setLecturerPassword("123");
            setNewLecturerModalOpen(false);
            await loadData();
        } catch (error) {
            setLecturerError(
                error instanceof Error
                    ? error.message
                    : "Failed to create lecturer"
            );
        } finally {
            setCreatingLecturer(false);
        }
    };

    const handleAssignLecturer = async () => {
        if (!selectedCourseId || !selectedLecturerId) {
            setAssignError("Please select both course and lecturer");
            return;
        }

        setAssigningLecturer(true);
        setAssignError(null);

        try {
            await assignLecturerToCourse(selectedCourseId, selectedLecturerId);
            setSelectedCourseId(null);
            setSelectedLecturerId(null);
            setAssignModalOpen(false);
            await loadData();
        } catch (error) {
            setAssignError(
                error instanceof Error
                    ? error.message
                    : "Failed to assign lecturer"
            );
        } finally {
            setAssigningLecturer(false);
        }
    };

    if (loading || pageLoading) {
        return (
            <Container className="py-10 text-center">
                <Text>Loading...</Text>
            </Container>
        );
    }

    return (
        <Container size="md" className="py-10 mt-20">
            <Paper shadow="xs" p="md" withBorder>
                <Group justify="space-between" mb="lg">
                    <Title order={2}>Program Management</Title>
                </Group>

                <Title order={4} mb="md">
                    Courses
                </Title>
                <Group mb="lg">
                    <Button
                        onClick={() => setCourseModalOpen(true)}
                        variant="light"
                    >
                        Add Course
                    </Button>
                </Group>

                <Table mb="xl">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>ID</Table.Th>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Department</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {courses.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={3} className="text-center">
                                    <Text c="dimmed">
                                        No courses created yet
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        ) : (
                            courses.map((course) => (
                                <Table.Tr key={course.id}>
                                    <Table.Td>{course.id}</Table.Td>
                                    <Table.Td>{course.name}</Table.Td>
                                    <Table.Td>{course.department}</Table.Td>
                                </Table.Tr>
                            ))
                        )}
                    </Table.Tbody>
                </Table>

                <Title order={4} mb="md" mt="xl">
                    Lecturers
                </Title>
                <Group mb="lg">
                    <Button
                        onClick={() => setNewLecturerModalOpen(true)}
                        variant="light"
                    >
                        Add Lecturer
                    </Button>
                    <Button
                        onClick={() => setAssignModalOpen(true)}
                        variant="light"
                    >
                        Assign Lecturer to Course
                    </Button>
                </Group>

                <Table mb="xl">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>ID</Table.Th>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Username</Table.Th>
                            <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {lecturers.map((lecturer) => (
                            <Table.Tr key={lecturer.id}>
                                <Table.Td>{lecturer.id}</Table.Td>
                                <Table.Td>{lecturer.name}</Table.Td>
                                <Table.Td>{lecturer.username}</Table.Td>
                                <Table.Td>
                                    <Group gap="xs">
                                        <Button
                                            size="xs"
                                            variant="light"
                                            onClick={() => {
                                                setEditingId(
                                                    lecturer.id as unknown as number
                                                );
                                                setEditName(lecturer.name);
                                                setEditModalOpen(true);
                                            }}
                                        >
                                            Edit
                                        </Button>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>

                <Title order={4} mb="md" mt="xl">
                    Program Outcomes
                </Title>
                <Group mb="lg">
                    <Button
                        onClick={() => setOutcomeModalOpen(true)}
                        variant="light"
                    >
                        Add Outcome
                    </Button>
                </Group>

                <Table mb="xl">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>ID</Table.Th>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {outcomes.length === 0 ? (
                            <Table.Tr>
                                <Table.Td colSpan={3} className="text-center">
                                    <Text c="dimmed">
                                        No program outcomes created yet
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        ) : (
                            outcomes.map((outcome) => (
                                <Table.Tr key={outcome.id}>
                                    <Table.Td>{outcome.id}</Table.Td>
                                    <Table.Td>{outcome.name}</Table.Td>
                                    <Table.Td>
                                        <Button
                                            size="xs"
                                            variant="light"
                                            color="red"
                                            onClick={() =>
                                                handleDeleteOutcome(outcome.id)
                                            }
                                            loading={
                                                deletingOutcomeId === outcome.id
                                            }
                                        >
                                            Delete
                                        </Button>
                                    </Table.Td>
                                </Table.Tr>
                            ))
                        )}
                    </Table.Tbody>
                </Table>
            </Paper>

            <Modal
                opened={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title="Edit Lecturer"
            >
                <TextInput
                    label="Name"
                    value={editName}
                    onChange={(e) => setEditName(e.currentTarget.value)}
                    mb="md"
                />
                <Group justify="flex-end">
                    <Button
                        variant="default"
                        onClick={() => setEditModalOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleUpdate} loading={saving}>
                        Save
                    </Button>
                </Group>
            </Modal>

            <Modal
                opened={courseModalOpen}
                onClose={() => setCourseModalOpen(false)}
                title="Create New Course"
            >
                {courseError && (
                    <Text c="red" size="sm" mb="md">
                        {courseError}
                    </Text>
                )}
                <TextInput
                    label="Course Name"
                    value={courseName}
                    onChange={(e) => setCourseName(e.currentTarget.value)}
                    mb="md"
                    placeholder="Enter course name"
                />
                <TextInput
                    label="Department"
                    value={courseDept}
                    onChange={(e) => setCourseDept(e.currentTarget.value)}
                    mb="md"
                    placeholder="Enter department"
                />
                <Group justify="flex-end">
                    <Button
                        variant="default"
                        onClick={() => setCourseModalOpen(false)}
                        disabled={creatingCourse}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateCourse}
                        loading={creatingCourse}
                    >
                        Create
                    </Button>
                </Group>
            </Modal>

            <Modal
                opened={outcomeModalOpen}
                onClose={() => setOutcomeModalOpen(false)}
                title="Create Program Outcome"
            >
                {outcomeError && (
                    <Text c="red" size="sm" mb="md">
                        {outcomeError}
                    </Text>
                )}
                <TextInput
                    label="Outcome Name"
                    value={outcomeName}
                    onChange={(e) => setOutcomeName(e.currentTarget.value)}
                    mb="md"
                    placeholder="Enter outcome name"
                    autoFocus
                />
                <Group justify="flex-end">
                    <Button
                        variant="default"
                        onClick={() => setOutcomeModalOpen(false)}
                        disabled={creatingOutcome}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateOutcome}
                        loading={creatingOutcome}
                    >
                        Create
                    </Button>
                </Group>
            </Modal>

            <Modal
                opened={newLecturerModalOpen}
                onClose={() => setNewLecturerModalOpen(false)}
                title="Create New Lecturer"
            >
                {lecturerError && (
                    <Text c="red" size="sm" mb="md">
                        {lecturerError}
                    </Text>
                )}
                <TextInput
                    label="Username"
                    value={lecturerUsername}
                    onChange={(e) => setLecturerUsername(e.currentTarget.value)}
                    mb="md"
                    placeholder="Enter username"
                />
                <TextInput
                    label="Email"
                    value={lecturerEmail}
                    onChange={(e) => setLecturerEmail(e.currentTarget.value)}
                    mb="md"
                    placeholder="Enter email"
                    type="email"
                />
                <TextInput
                    label="Full Name"
                    value={lecturerName}
                    onChange={(e) => setLecturerName(e.currentTarget.value)}
                    mb="md"
                    placeholder="Enter full name"
                />
                <TextInput
                    label="Password"
                    value={lecturerPassword}
                    onChange={(e) => setLecturerPassword(e.currentTarget.value)}
                    mb="md"
                    placeholder="Default: 123"
                    type="password"
                />
                <Group justify="flex-end">
                    <Button
                        variant="default"
                        onClick={() => setNewLecturerModalOpen(false)}
                        disabled={creatingLecturer}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateLecturer}
                        loading={creatingLecturer}
                    >
                        Create
                    </Button>
                </Group>
            </Modal>

            <Modal
                opened={assignModalOpen}
                onClose={() => setAssignModalOpen(false)}
                title="Assign Lecturer to Course"
            >
                {assignError && (
                    <Text c="red" size="sm" mb="md">
                        {assignError}
                    </Text>
                )}
                <Select
                    label="Course"
                    placeholder="Select a course"
                    data={courses.map((c) => ({ value: c.id, label: c.name }))}
                    value={selectedCourseId || ""}
                    onChange={setSelectedCourseId}
                    mb="md"
                />
                <Select
                    label="Lecturer"
                    placeholder="Select a lecturer"
                    data={lecturers.map((l) => ({
                        value: l.id,
                        label: l.name,
                    }))}
                    value={selectedLecturerId || ""}
                    onChange={setSelectedLecturerId}
                    mb="md"
                />
                <Group justify="flex-end">
                    <Button
                        variant="default"
                        onClick={() => setAssignModalOpen(false)}
                        disabled={assigningLecturer}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAssignLecturer}
                        loading={assigningLecturer}
                    >
                        Assign
                    </Button>
                </Group>
            </Modal>
        </Container>
    );
}
