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
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import {
  assignLecturerToCourse,
  createCourse,
  createLecturer,
  createProgramOutcome,
  deleteCourse,
  deleteProgramOutcome,
  getCourses,
  getProgramInfo,
  getProgramOutcomes,
  getProgramSettings,
  updateCourse,
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
  description?: string;
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

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Token ${token}` } : {}),
    };
  };

  const loadData = async () => {
    try {
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
        getCourses(),
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
      notifications.show({
        title: "Error",
        message: `Failed to load data: ${error instanceof Error ? error.message : "Unknown error"}`,
        color: "red",
      });
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
      
      const response = await fetch(
        `${API_URL}/api/users/${editingLecturerId}/update/`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
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
      
      notifications.show({
        title: "Success",
        message: "Lecturer updated successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: `Failed to update lecturer: ${error instanceof Error ? error.message : "Unknown error"}`,
        color: "red",
      });
    } finally {
      setSavingLecturer(false);
    }
  };

  const handleDeleteLecturer = async (lecturerId: string) => {
    if (!confirm("Are you sure you want to delete this lecturer?")) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/users/delete_user/${lecturerId}/`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete lecturer");
      }

      await loadData();
      
      notifications.show({
        title: "Success",
        message: "Lecturer deleted successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: `Failed to delete lecturer: ${error instanceof Error ? error.message : "Unknown error"}`,
        color: "red",
      });
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

      if (editingCourseId) {
        const updatedCourse = await updateCourse(editingCourseId, {
          name: courseName,
          department: courseDept,
        });
        
        setCourses((prev) =>
          prev.map((c) => (c.id === editingCourseId ? updatedCourse : c))
        );
        
        notifications.show({
          title: "Success",
          message: "Course updated successfully",
          color: "green",
        });
      } else {
        const newCourse = await createCourse({
          name: courseName,
          lecturer_id: user?.id,
          university: user?.university || "Not specified",
          department: courseDept,
        });
        
        setCourses((prev) => [...prev, newCourse]);
        
        notifications.show({
          title: "Success",
          message: "Course created successfully",
          color: "green",
        });
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
      await deleteCourse(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      
      notifications.show({
        title: "Success",
        message: "Course deleted successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: `Failed to delete course: ${error instanceof Error ? error.message : "Unknown error"}`,
        color: "red",
      });
    } finally {
      setDeletingCourseId(null);
    }
  };

  const openEditOutcome = (outcome: ProgramOutcome) => {
    setEditingOutcomeId(outcome.id);
    setOutcomeName(outcome.name);
    setOutcomeDescription(outcome.description || "");
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
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(
          `${API_URL}/api/outcomes/program-outcomes/${editingOutcomeId}/`,
          {
            method: "PUT",
            headers: getAuthHeaders(),
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
        
        notifications.show({
          title: "Success",
          message: "Program outcome updated successfully",
          color: "green",
        });
      } else {
        // This creates the program outcome via the API which also creates the graph node
        await createProgramOutcome(outcomeName);
        
        notifications.show({
          title: "Success",
          message: "Program outcome created successfully",
          color: "green",
        });
      }

      setOutcomeName("");
      setOutcomeDescription("");
      setEditingOutcomeId(null);
      setOutcomeModalOpen(false);
      await loadData();
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
      await deleteProgramOutcome(outcomeId);
      await loadData();
      
      notifications.show({
        title: "Success",
        message: "Program outcome deleted successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: `Failed to delete outcome: ${error instanceof Error ? error.message : "Unknown error"}`,
        color: "red",
      });
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
      
      notifications.show({
        title: "Success",
        message: "Lecturer created successfully",
        color: "green",
      });
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
      
      const courseNameFound = courses.find(c => c.id === selectedCourseId)?.name || "Course";
      const lecturerNameFound = lecturers.find(l => l.id === selectedLecturerId)?.name || "Lecturer";
      
      setSelectedCourseId(null);
      setSelectedLecturerId(null);
      setAssignModalOpen(false);
      await loadData();
      
      notifications.show({
        title: "Lecturer Assigned",
        message: `${lecturerNameFound} has been assigned to ${courseNameFound}`,
        color: "green",
        autoClose: 4000,
      });
    } catch (error) {
      setAssignError(
        error instanceof Error ? error.message : "Failed to assign lecturer"
      );
      
      notifications.show({
        title: "Assignment Failed",
        message: error instanceof Error ? error.message : "Failed to assign lecturer to course",
        color: "red",
      });
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
      await loadData();
      
      notifications.show({
        title: "Settings Saved",
        message: `Program settings updated successfully.\nUniversity: ${programUniversity}\nDepartment: ${programDepartment}`,
        color: "green",
        autoClose: 4000,
      });
    } catch (error) {
      setProgramSettingsError(
        error instanceof Error ? error.message : "Failed to update program settings"
      );
      
      notifications.show({
        title: "Save Failed",
        message: error instanceof Error ? error.message : "Failed to update program settings",
        color: "red",
      });
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
              setOutcomeDescription("");
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
