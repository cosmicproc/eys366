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
  getProgramSettings,
  updateLecturer,
  updateProgramSettings,
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
  description?: string; // Add this
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
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLecturerId, setSelectedLecturerId] = useState<string | null>(
    null
  );
  const [assigningLecturer, setAssigningLecturer] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Edit lecturer state
  const [editLecturerModalOpen, setEditLecturerModalOpen] = useState(false);
  const [editingLecturerId, setEditingLecturerId] = useState<string | null>(
    null
  );
  const [editLecturerName, setEditLecturerName] = useState("");
  const [savingLecturer, setSavingLecturer] = useState(false);

  // Course creation/edit state
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseName, setCourseName] = useState("");
  const [courseDept, setCourseDept] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);

  // Program outcome state
  const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
  const [editingOutcomeId, setEditingOutcomeId] = useState<number | null>(null);
  const [outcomeName, setOutcomeName] = useState("");
  const [outcomeDescription, setOutcomeDescription] = useState("");
  const [creatingOutcome, setCreatingOutcome] = useState(false);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);
  const [deletingOutcomeId, setDeletingOutcomeId] = useState<number | null>(
    null
  );

  // Program settings state
  const [programSettingsModalOpen, setProgramSettingsModalOpen] = useState(false);
  const [programUniversity, setProgramUniversity] = useState("");
  const [programDepartment, setProgramDepartment] = useState("");
  const [savingProgramSettings, setSavingProgramSettings] = useState(false);
  const [programSettingsError, setProgramSettingsError] = useState<string | null>(null);

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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      // Load program settings separately with fallback
      let programSettings = { university: "", department: "" };
      try {
        programSettings = await getProgramSettings();
      } catch (error) {
        console.warn("Program settings not found, using defaults:", error);
      }
      
      const [lecturesData, outcomesData, coursesData] = await Promise.all([
        getProgramInfo(),
        getProgramOutcomes(),
        fetch(`${API_URL}/api/programs/list_courses`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }).then(res => {
          if (!res.ok) throw new Error(`Failed to load courses: ${res.status}`);
          return res.json();
        }),
      ]);

      // Transform lecturers to match Lecturer interface
      const transformedLecturers = lecturesData.lecturers.map((l: any) => ({
        id: l.id,
        username: l.username,
        name:
          l.first_name && l.last_name
            ? `${l.first_name} ${l.last_name}`
            : l.username,
      }));
      
      setLecturers(transformedLecturers);
      setOutcomes(outcomesData);
      setProgramUniversity(programSettings.university);
      setProgramDepartment(programSettings.department);
      setCourses(coursesData);
      
    } catch (error) {
      console.error("Failed to load data:", error);
      alert(`Failed to load data: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setPageLoading(false);
    }
  };

  const openEditLecturer = (lecturer: Lecturer) => {
    setEditingLecturerId(lecturer.id);
    setEditLecturerName(lecturer.name);
    setEditLecturerModalOpen(true);
  };

  const handleUpdateLecturer = async () => {
    if (!editingLecturerId) return;
    try {
      setSavingLecturer(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      // Fixed: Use proper API endpoint with credentials
      const response = await fetch(
        `${API_URL}/api/users/${editingLecturerId}/update/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            first_name: editLecturerName.split(" ")[0] || editLecturerName,
            last_name: editLecturerName.split(" ").slice(1).join(" ") || "",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update lecturer");
      }

      setLecturers((prev) =>
        prev.map((l) =>
          l.id === editingLecturerId ? { ...l, name: editLecturerName } : l
        )
      );
      setEditLecturerModalOpen(false);
    } catch (error) {
      alert(`Failed to update lecturer: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSavingLecturer(false);
    }
  };

  const handleDeleteLecturer = async (lecturerId: string) => {
    if (!confirm("Are you sure you want to delete this lecturer?")) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/users/delete_user/${lecturerId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete lecturer");
      }

      await loadData();
    } catch (error) {
      alert(
        `Failed to delete lecturer: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const openEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setCourseName(course.name);
    setCourseDept(course.department);
    setCourseModalOpen(true);
  };

  const handleCreateOrUpdateCourse = async () => {
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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      if (editingCourseId) {
        // Update existing course
        const response = await fetch(
          `${API_URL}/api/programs/update_program/${editingCourseId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              name: courseName,
              department: courseDept,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update course");
        }

        const updatedCourse = await response.json();
        setCourses((prev) =>
          prev.map((c) => (c.id === editingCourseId ? updatedCourse : c))
        );
      } else {
        // Create new course
        const response = await fetch(
          `${API_URL}/api/programs/create_course`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
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
      }

      setCourseModalOpen(false);
      setCourseName("");
      setCourseDept("");
      setEditingCourseId(null);
    } catch (error) {
      setCourseError(
        error instanceof Error ? error.message : "Failed to save course"
      );
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;

    setDeletingCourseId(courseId);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/programs/delete_program/${courseId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete course");
      }

      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (error) {
      alert(
        `Failed to delete course: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setDeletingCourseId(null);
    }
  };

  const openEditOutcome = (outcome: ProgramOutcome) => {
    setEditingOutcomeId(outcome.id);
    setOutcomeName(outcome.name);
    setOutcomeDescription(outcome.description || ""); // Show existing description
    setOutcomeModalOpen(true);
  };

  const handleCreateOrUpdateOutcome = async () => {
    if (!outcomeName.trim()) {
      setOutcomeError("Outcome name cannot be empty");
      return;
    }

    setCreatingOutcome(true);
    setOutcomeError(null);

    try {
      if (editingOutcomeId) {
        // Update existing outcome
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
          }/api/outcomes/program-outcomes/${editingOutcomeId}/`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              name: outcomeName,
              description: outcomeDescription || "",
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to update outcome");
        }
      } else {
        // Create new outcome
        await createProgramOutcome(outcomeName);
      }

      setOutcomeName("");
      setOutcomeDescription(""); // Reset description
      setEditingOutcomeId(null);
      setOutcomeModalOpen(false);
      await loadData(); // This reloads the data with correct IDs
    } catch (error) {
      setOutcomeError(
        error instanceof Error ? error.message : "Failed to save outcome"
      );
    } finally {
      setCreatingOutcome(false);
    }
  };

  const handleDeleteOutcome = async (outcomeId: number) => {
    if (!confirm("Are you sure you want to delete this outcome?")) return;

    setDeletingOutcomeId(outcomeId);
    try {
      await deleteProgramOutcome(outcomeId); // For deleting program outcome
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
        error instanceof Error ? error.message : "Failed to create lecturer"
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
        error instanceof Error ? error.message : "Failed to assign lecturer"
      );
    } finally {
      setAssigningLecturer(false);
    }
  };

  const handleUpdateProgramSettings = async () => {
    if (!programUniversity.trim() || !programDepartment.trim()) {
      setProgramSettingsError("University and department are required");
      return;
    }

    setSavingProgramSettings(true);
    setProgramSettingsError(null);

    try {
      await updateProgramSettings(programUniversity, programDepartment);
      setProgramSettingsModalOpen(false);
      // Optionally reload data
      await loadData();
    } catch (error) {
      setProgramSettingsError(
        error instanceof Error ? error.message : "Failed to update program settings"
      );
    } finally {
      setSavingProgramSettings(false);
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
          <Button
            variant="light"
            color="grape"
            onClick={() => setProgramSettingsModalOpen(true)}
          >
            Program Settings
          </Button>
        </Group>

        <Title order={4} mb="md">
          Courses
        </Title>
        <Group mb="lg">
          <Button
            onClick={() => {
              setEditingCourseId(null);
              setCourseName("");
              setCourseDept("");
              setCourseModalOpen(true);
            }}
            variant="light"
          >
            Add Course
          </Button>
        </Group>

        <Table mb="xl">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Department</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {courses.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={3} className="text-center">
                  <Text c="dimmed">No courses created yet</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              courses.map((course) => (
                <Table.Tr key={course.id}>
                  <Table.Td>{course.name}</Table.Td>
                  <Table.Td>{course.department}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => openEditCourse(course)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => handleDeleteCourse(course.id)}
                        loading={deletingCourseId === course.id}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>

        <Title order={4} mb="md" mt="xl">
          Lecturers
        </Title>
        <Group mb="lg">
          <Button onClick={() => setNewLecturerModalOpen(true)} variant="light">
            Add Lecturer
          </Button>
          <Button onClick={() => setAssignModalOpen(true)} variant="light">
            Assign Lecturer to Course
          </Button>
        </Group>

        <Table mb="xl">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Username</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {lecturers.map((lecturer) => (
              <Table.Tr key={lecturer.id}>
                <Table.Td>{lecturer.name}</Table.Td>
                <Table.Td>{lecturer.username}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => openEditLecturer(lecturer)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      onClick={() => handleDeleteLecturer(lecturer.id)}
                    >
                      Delete
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
            onClick={() => {
              setEditingOutcomeId(null);
              setOutcomeName("");
              setOutcomeDescription(""); // Add this - reset description
              setOutcomeModalOpen(true);
            }}
            variant="light"
          >
            Add Outcome
          </Button>
        </Group>

        <Table mb="xl">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {outcomes.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={2} className="text-center">
                  <Text c="dimmed">No program outcomes created yet</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              outcomes.map((outcome) => (
                <Table.Tr key={outcome.id}>
                  <Table.Td>{outcome.name}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => openEditOutcome(outcome)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        onClick={() => handleDeleteOutcome(outcome.id)}
                        loading={deletingOutcomeId === outcome.id}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Edit Lecturer Modal */}
      <Modal
        opened={editLecturerModalOpen}
        onClose={() => setEditLecturerModalOpen(false)}
        title="Edit Lecturer"
      >
        <TextInput
          label="Name"
          value={editLecturerName}
          onChange={(e) => setEditLecturerName(e.currentTarget.value)}
          mb="md"
        />
        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={() => setEditLecturerModalOpen(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdateLecturer} loading={savingLecturer}>
            Save
          </Button>
        </Group>
      </Modal>

      {/* Create/Edit Course Modal */}
      <Modal
        opened={courseModalOpen}
        onClose={() => setCourseModalOpen(false)}
        title={editingCourseId ? "Edit Course" : "Create New Course"}
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
          <Button onClick={handleCreateOrUpdateCourse} loading={creatingCourse}>
            {editingCourseId ? "Update" : "Create"}
          </Button>
        </Group>
      </Modal>

      {/* Create/Edit Outcome Modal */}
      <Modal
        opened={outcomeModalOpen}
        onClose={() => setOutcomeModalOpen(false)}
        title={
          editingOutcomeId ? "Edit Program Outcome" : "Create Program Outcome"
        }
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
        <TextInput
          label="Description"
          value={outcomeDescription}
          onChange={(e) => setOutcomeDescription(e.currentTarget.value)}
          mb="md"
          placeholder="Enter description"
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
            onClick={handleCreateOrUpdateOutcome}
            loading={creatingOutcome}
          >
            {editingOutcomeId ? "Update" : "Create"}
          </Button>
        </Group>
      </Modal>

      {/* Create Lecturer Modal */}
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
          <Button onClick={handleCreateLecturer} loading={creatingLecturer}>
            Create
          </Button>
        </Group>
      </Modal>

      {/* Assign Lecturer Modal */}
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
          <Button onClick={handleAssignLecturer} loading={assigningLecturer}>
            Assign
          </Button>
        </Group>
      </Modal>

      {/* Program Settings Modal */}
      <Modal
        opened={programSettingsModalOpen}
        onClose={() => setProgramSettingsModalOpen(false)}
        title="Program Settings"
      >
        {programSettingsError && (
          <Text c="red" size="sm" mb="md">
            {programSettingsError}
          </Text>
        )}
        <TextInput
          label="University"
          value={programUniversity}
          onChange={(e) => setProgramUniversity(e.currentTarget.value)}
          mb="md"
          placeholder="Enter university name"
        />
        <TextInput
          label="Department"
          value={programDepartment}
          onChange={(e) => setProgramDepartment(e.currentTarget.value)}
          mb="md"
          placeholder="Enter department name"
        />
        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={() => setProgramSettingsModalOpen(false)}
            disabled={savingProgramSettings}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateProgramSettings}
            loading={savingProgramSettings}
          >
            Save Settings
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
