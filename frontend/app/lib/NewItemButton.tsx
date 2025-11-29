"use client";

import {
    Button,
    Group,
    Modal,
    SegmentedControl,
    Text,
    TextInput,
} from "@mantine/core";
import { useState } from "react";
import { createNode, type NodeLayer } from "./apiClient";
import { useAuth } from "./AuthContext";
import { useSearchParams } from "next/navigation";

export default function NewItemButton() {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [type, setType] = useState<NodeLayer>("course_content");
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const NAME_MAX = 60;

    const { user } = useAuth();
    const searchParams = useSearchParams();
    const courseId = searchParams.get("courseId") ? parseInt(searchParams.get("courseId")!) : undefined;

    const reset = () => {
        setType("course_content");
        setName("");
        setError(null);
    };

    const onSubmit = async () => {
        setError(null);
        const trimmed = name.trim();
        if (!trimmed) {
            setError("Name cannot be empty");
            return;
        }
        if (trimmed.length > NAME_MAX) {
            setError(`Name must be at most ${NAME_MAX} characters`);
            return;
        }
        try {
            setSaving(true);
            // Pass courseId if available
            await createNode(type, trimmed, courseId);
            // Reload the page so data is re-fetched and graph is consistent
            if (typeof window !== "undefined") {
                window.location.reload();
                return;
            }
            // Fallback for non-browser
            setOpen(false);
            reset();
            // Fallback for non-browser
            setOpen(false);
            reset();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to create node";
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const options = [
        {
            label: "Course Content",
            value: "course_content",
        },
        {
            label: "Course Outcome",
            value: "course_outcome",
        },
    ];

    if (user?.role === "head") {
        options.push({
            label: "Program Outcome",
            value: "program_outcome",
        });
    }

    return (
        <>
            <Button variant="subtle" onClick={() => setOpen(true)}>
                New Item
            </Button>
            <Modal
                opened={open}
                onClose={() => setOpen(false)}
                title="Create new item"
                centered
            >
                <div className="space-y-4">
                    <SegmentedControl
                        value={type}
                        onChange={(v) => setType(v as NodeLayer)}
                        data={options}
                    />
                    {error && (
                        <Text c="red" size="sm">
                            {error}
                        </Text>
                    )}
                    <TextInput
                        label={`Name (max ${NAME_MAX} chars)`}
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        maxLength={NAME_MAX}
                        placeholder="Enter name"
                        autoFocus
                        rightSection={
                            <Text
                                size="xs"
                                c="dimmed"
                            >{`${name.length}/${NAME_MAX}`}</Text>
                        }
                    />
                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="default"
                            onClick={() => setOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={onSubmit} loading={saving}>
                            Create
                        </Button>
                    </Group>
                </div>
            </Modal>
        </>
    );
}
