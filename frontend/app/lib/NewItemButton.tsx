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
import { createNode } from "./apiClient";

export default function NewItemButton() {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [type, setType] = useState<"cc" | "co" | "po">("cc");
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const NAME_MAX = 60;

    const reset = () => {
        setType("cc");
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
            const res = await createNode(type, trimmed);
            // Notify graph to insert the new node optimistically
            if (typeof window !== "undefined") {
                window.dispatchEvent(
                    new CustomEvent("giraph:new-node", {
                        detail: { id: res.id, name: trimmed, type },
                    })
                );
            }
            setOpen(false);
            reset();
        } catch (e: any) {
            setError(e?.message || "Failed to create node");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Button variant="subtle" onClick={() => setOpen(true)} radius="3em">
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
                        onChange={(v) => setType(v as any)}
                        data={[
                            { label: "Course Content", value: "cc" },
                            { label: "Course Outcome", value: "co" },
                            { label: "Program Outcome", value: "po" },
                        ]}
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
