
"use client";

import {
    Button,
    Container,
    Group,
    Modal,
    Paper,
    Table,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import {
    getProgramInfo,
    updateLecturer,
} from "../lib/apiClient";
import { useRouter } from "next/navigation";

interface Lecturer {
    id: number;
    name: string;
    username: string;
}

export default function ProgramPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [lecturers, setLecturers] = useState<Lecturer[]>([]);
    const [pageLoading, setPageLoading] = useState(true);

    // Edit state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (!user || user.role !== "head") {
                router.push("/");
                return;
            }
            loadLecturers();
        }
    }, [user, loading, router]);

    const loadLecturers = async () => {
        try {
            const data = await getProgramInfo();
            setLecturers(data.lecturers);
        } catch {
            alert("Failed to load lecturers");
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
                    Lecturers
                </Title>

                <Table>
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
                                            onClick={() => openEdit(lecturer)}
                                        >
                                            Edit
                                        </Button>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
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
        </Container>
    );
}
