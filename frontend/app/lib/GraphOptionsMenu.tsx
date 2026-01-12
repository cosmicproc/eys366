"use client";

import {
    Alert,
    Button,
    Group,
    Menu,
    Modal,
    Stack,
    Text,
    Textarea,
} from "@mantine/core";
import { IconChevronDown, IconPlus, IconSparkles, IconTrash } from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { clearCourseNodes, createNode, type NodeLayer } from "./apiClient";
import { useAuth } from "./AuthContext";

interface GraphOptionsMenuProps {
    onOpenSyllabusImport: () => void;
    onClearComplete: () => void;
    onNodeCreated: () => void;
}

export default function GraphOptionsMenu({
    onOpenSyllabusImport,
    onClearComplete,
    onNodeCreated,
}: GraphOptionsMenuProps) {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const courseId = searchParams.get("courseId") || undefined;

    // New Item Modal State
    const [newItemOpen, setNewItemOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [type, setType] = useState<NodeLayer>("course_content");
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    
    // Different max lengths: 60 for CC, 300 for CO/PO
    const getMaxLength = () => type === "course_content" ? 60 : 300;
    const NAME_MAX = getMaxLength();

    // Clear Nodes Modal State
    const [clearModalOpen, setClearModalOpen] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [clearError, setClearError] = useState<string | null>(null);

    const resetNewItem = () => {
        setType("course_content");
        setName("");
        setError(null);
    };

    const onSubmitNewItem = async () => {
        setError(null);

        if (!courseId) {
            setError("Please select a course first before adding items");
            return;
        }

        const trimmed = name.trim();
        if (!trimmed) {
            setError("Description cannot be empty");
            return;
        }
        if (trimmed.length > NAME_MAX) {
            setError(`Description must be at most ${NAME_MAX} characters`);
            return;
        }
        try {
            setSaving(true);
            await createNode(type, trimmed, courseId);
            setNewItemOpen(false);
            resetNewItem();
            onNodeCreated();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to create node";
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleClearNodes = async () => {
        if (!courseId) return;

        setClearing(true);
        setClearError(null);

        try {
            await clearCourseNodes(courseId);
            setClearModalOpen(false);
            onClearComplete();
        } catch (err: any) {
            setClearError(err.message || "Failed to clear nodes");
        } finally {
            setClearing(false);
        }
    };

    const nodeTypeOptions: { label: string; value: NodeLayer; bg: string; border: string }[] = [
        { label: "Course Content", value: "course_content", bg: "#e3f2fd", border: "#1976d2" },
        { label: "Course Outcome", value: "course_outcome", bg: "#f3e5f5", border: "#7b1fa2" },
    ];

    if (user?.role === "head") {
        nodeTypeOptions.push({ label: "Program Outcome", value: "program_outcome", bg: "#fff3e0", border: "#f57c00" });
    }

    return (
        <>
            <Menu shadow="md" width={200} position="bottom-start">
                <Menu.Target>
                    <Button
                        variant="subtle"
                        radius="lg"
                        rightSection={<IconChevronDown size={14} />}
                        disabled={!courseId}
                        title={!courseId ? "Please select a course first" : "Graph options"}
                    >
                        Graph
                    </Button>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item
                        leftSection={<IconPlus size={16} />}
                        onClick={() => setNewItemOpen(true)}
                    >
                        New Item
                    </Menu.Item>
                    <Menu.Item
                        leftSection={<IconSparkles size={16} />}
                        onClick={onOpenSyllabusImport}
                    >
                        Import Syllabus
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                        leftSection={<IconTrash size={16} />}
                        color="red"
                        onClick={() => setClearModalOpen(true)}
                    >
                        Clear Nodes
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>

            {/* New Item Modal */}
            <Modal
                opened={newItemOpen}
                onClose={() => setNewItemOpen(false)}
                title="Create new item"
                centered
            >
                <div className="space-y-4">
                    <Group gap="xs">
                        {nodeTypeOptions.map((opt) => (
                            <Button
                                key={opt.value}
                                variant={type === opt.value ? "filled" : "outline"}
                                size="xs"
                                onClick={() => {
                                    setType(opt.value);
                                    // Clear error and trim name if it exceeds new max
                                    setError(null);
                                    const newMax = opt.value === "course_content" ? 60 : 300;
                                    if (name.length > newMax) {
                                        setName(name.slice(0, newMax));
                                    }
                                }}
                                style={{
                                    backgroundColor: type === opt.value ? opt.border : opt.bg,
                                    borderColor: opt.border,
                                    color: type === opt.value ? "white" : opt.border,
                                }}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </Group>
                    {error && (
                        <Text c="red" size="sm">
                            {error}
                        </Text>
                    )}
                    <Textarea
                        label={`Description (max ${NAME_MAX} chars)`}
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        maxLength={NAME_MAX}
                        placeholder="Enter description"
                        autoFocus
                        autosize
                        minRows={2}
                        maxRows={4}
                        rightSection={
                            <Text size="xs" c="dimmed">{`${name.length}/${NAME_MAX}`}</Text>
                        }
                    />
                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="default"
                            onClick={() => setNewItemOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={onSubmitNewItem} loading={saving}>
                            Create
                        </Button>
                    </Group>
                </div>
            </Modal>

            {/* Clear Nodes Modal */}
            <Modal
                opened={clearModalOpen}
                onClose={() => setClearModalOpen(false)}
                title={
                    <Group gap="xs">
                        <IconTrash size={20} color="red" />
                        <Text fw={600}>Clear Course Nodes</Text>
                    </Group>
                }
                centered
                size="sm"
            >
                <Stack gap="md">
                    {clearError && (
                        <Alert icon={<IconTrash size={16} />} color="red">
                            {clearError}
                        </Alert>
                    )}
                    <Text size="sm">
                        This will delete all course contents and course outcomes for this course,
                        along with their relations. Program outcomes will not be affected.
                    </Text>
                    <Text size="sm" fw={600} c="red">
                        This action cannot be undone.
                    </Text>
                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={() => setClearModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            color="red"
                            onClick={handleClearNodes}
                            loading={clearing}
                            leftSection={<IconTrash size={16} />}
                        >
                            Clear All Nodes
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}
