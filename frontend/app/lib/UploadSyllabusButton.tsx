"use client";

import {
    Alert,
    Badge,
    Button,
    Checkbox,
    FileInput,
    Group,
    Loader,
    Modal,
    Paper,
    ScrollArea,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconFileUpload, IconSparkles } from "@tabler/icons-react";
import { useState } from "react";
import {
    applySyllabusImport,
    parseSyllabus,
    type SyllabusContent,
    type SyllabusOutcome,
} from "./apiClient";

interface UploadSyllabusButtonProps {
    courseId: string;
    onImportComplete: () => void;
    // Optional: control modal externally (hide button)
    externalOpen?: boolean;
    onExternalClose?: () => void;
}

export default function UploadSyllabusButton({
    courseId,
    onImportComplete,
    externalOpen,
    onExternalClose,
}: UploadSyllabusButtonProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const modalOpen = externalOpen !== undefined ? externalOpen : internalOpen;
    
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Parsed data state
    const [parsedData, setParsedData] = useState<{
        course_contents: SyllabusContent[];
        course_outcomes: SyllabusOutcome[];
        raw_text: string;
    } | null>(null);
    
    // Editable state for confirmation
    const [editedContents, setEditedContents] = useState<SyllabusContent[]>([]);
    const [editedOutcomes, setEditedOutcomes] = useState<SyllabusOutcome[]>([]);
    const [selectedContents, setSelectedContents] = useState<Set<number>>(new Set());
    const [selectedOutcomes, setSelectedOutcomes] = useState<Set<number>>(new Set());
    
    const [applying, setApplying] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleClose = () => {
        if (onExternalClose) {
            onExternalClose();
        } else {
            setInternalOpen(false);
        }
        setFile(null);
        setParsedData(null);
        setEditedContents([]);
        setEditedOutcomes([]);
        setSelectedContents(new Set());
        setSelectedOutcomes(new Set());
        setError(null);
        setSuccess(false);
    };

    const handleParse = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);
        setParsedData(null);

        try {
            const response = await parseSyllabus(file);
            const data = response.data;
            
            // Check if AI found any content
            if (data.course_contents.length === 0 && data.course_outcomes.length === 0) {
                const parseError = (data as any).parse_error;
                setError(parseError || "No course contents or outcomes found in the syllabus. Please try a different file or add items manually.");
                return;
            }
            
            setParsedData(data);
            setEditedContents([...data.course_contents]);
            setEditedOutcomes([...data.course_outcomes]);
            
            // Select all items by default
            setSelectedContents(new Set(data.course_contents.map((_, i) => i)));
            setSelectedOutcomes(new Set(data.course_outcomes.map((_, i) => i)));
        } catch (err: any) {
            setError(err.message || "Failed to parse syllabus");
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async () => {
        if (!courseId) {
            setError("No course selected");
            return;
        }

        setApplying(true);
        setError(null);

        try {
            // Filter to only selected items
            const contentsToApply = editedContents.filter((_, i) => selectedContents.has(i));
            const outcomesToApply = editedOutcomes.filter((_, i) => selectedOutcomes.has(i));

            await applySyllabusImport(
                courseId,
                contentsToApply,
                outcomesToApply
            );

            setSuccess(true);
            setTimeout(() => {
                handleClose();
                onImportComplete();
            }, 1500);
        } catch (err: any) {
            setError(err.message || "Failed to apply import");
        } finally {
            setApplying(false);
        }
    };

    const toggleContent = (index: number) => {
        const newSet = new Set(selectedContents);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        setSelectedContents(newSet);
    };

    const toggleOutcome = (index: number) => {
        const newSet = new Set(selectedOutcomes);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        setSelectedOutcomes(newSet);
    };

    const updateContentName = (index: number, name: string) => {
        const updated = [...editedContents];
        updated[index] = { ...updated[index], name };
        setEditedContents(updated);
    };

    const updateOutcomeName = (index: number, name: string) => {
        const updated = [...editedOutcomes];
        updated[index] = { ...updated[index], name };
        setEditedOutcomes(updated);
    };

    return (
        <>
            {/* Only show button if not externally controlled */}
            {externalOpen === undefined && (
                <Button
                    leftSection={<IconSparkles size={16} />}
                    variant="light"
                    color="violet"
                    onClick={() => setInternalOpen(true)}
                >
                    Import Syllabus
                </Button>
            )}

            <Modal
                opened={modalOpen}
                onClose={handleClose}
                title={
                    <Group gap="xs">
                        <IconSparkles size={20} />
                        <Text fw={600}>Auto Import from Syllabus (AI)</Text>
                    </Group>
                }
                size="lg"
                centered
            >
                <Stack gap="md">
                    {error && (
                        <Alert
                            icon={<IconAlertCircle size={16} />}
                            title="Error"
                            color="red"
                            withCloseButton
                            onClose={() => setError(null)}
                        >
                            {error}
                        </Alert>
                    )}

                    {success && (
                        <Alert
                            icon={<IconCheck size={16} />}
                            title="Success"
                            color="green"
                        >
                            Syllabus imported successfully! Refreshing graph...
                        </Alert>
                    )}

                    {!parsedData && !success && (
                        <>
                            <Text size="sm" c="dimmed">
                                Upload your course syllabus (PDF) and our AI will automatically 
                                extract course contents and learning outcomes.
                            </Text>

                            <FileInput
                                label="Syllabus PDF"
                                placeholder="Click to upload PDF"
                                accept=".pdf"
                                leftSection={<IconFileUpload size={16} />}
                                value={file}
                                onChange={setFile}
                            />

                            <Group justify="flex-end">
                                <Button variant="subtle" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleParse}
                                    disabled={!file}
                                    leftSection={<IconSparkles size={16} />}
                                >
                                    {loading ? "Analyzing..." : "Analyze Syllabus"}
                                </Button>
                            </Group>

                            {loading && (
                                <Paper p="md" withBorder>
                                    <Group justify="center">
                                        <Loader size="sm" />
                                        <Text size="sm" c="dimmed">
                                            AI is analyzing your syllabus... This may take a moment.
                                        </Text>
                                    </Group>
                                </Paper>
                            )}
                        </>
                    )}

                    {parsedData && !success && (
                        <>
                            <Text size="sm" c="dimmed">
                                Review the extracted information below. You can edit names
                                or deselect items you don&apos;t want to import.
                            </Text>

                            {/* Course Contents */}
                            <Paper p="sm" withBorder>
                                <Title order={5} mb="xs">
                                    Course Contents 
                                    <Badge ml="xs" size="sm" color="blue">
                                        {selectedContents.size} / {editedContents.length}
                                    </Badge>
                                </Title>
                                <ScrollArea h={200}>
                                    <Table striped highlightOnHover>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th w={40}>
                                                    <Checkbox
                                                        checked={selectedContents.size === editedContents.length}
                                                        indeterminate={selectedContents.size > 0 && selectedContents.size < editedContents.length}
                                                        onChange={() => {
                                                            if (selectedContents.size === editedContents.length) {
                                                                setSelectedContents(new Set());
                                                            } else {
                                                                setSelectedContents(new Set(editedContents.map((_, i) => i)));
                                                            }
                                                        }}
                                                    />
                                                </Table.Th>
                                                <Table.Th>Name</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {editedContents.map((content, index) => (
                                                <Table.Tr key={index} opacity={selectedContents.has(index) ? 1 : 0.5}>
                                                    <Table.Td>
                                                        <Checkbox
                                                            checked={selectedContents.has(index)}
                                                            onChange={() => toggleContent(index)}
                                                        />
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <TextInput
                                                            size="xs"
                                                            value={content.name}
                                                            onChange={(e) => updateContentName(index, e.target.value)}
                                                            disabled={!selectedContents.has(index)}
                                                        />
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </ScrollArea>
                            </Paper>

                            {/* Course Outcomes */}
                            <Paper p="sm" withBorder>
                                <Title order={5} mb="xs">
                                    Course Outcomes 
                                    <Badge ml="xs" size="sm" color="violet">
                                        {selectedOutcomes.size} / {editedOutcomes.length}
                                    </Badge>
                                </Title>
                                <ScrollArea h={200}>
                                    <Table striped highlightOnHover>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th w={40}>
                                                    <Checkbox
                                                        checked={selectedOutcomes.size === editedOutcomes.length}
                                                        indeterminate={selectedOutcomes.size > 0 && selectedOutcomes.size < editedOutcomes.length}
                                                        onChange={() => {
                                                            if (selectedOutcomes.size === editedOutcomes.length) {
                                                                setSelectedOutcomes(new Set());
                                                            } else {
                                                                setSelectedOutcomes(new Set(editedOutcomes.map((_, i) => i)));
                                                            }
                                                        }}
                                                    />
                                                </Table.Th>
                                                <Table.Th>Name</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {editedOutcomes.map((outcome, index) => (
                                                <Table.Tr key={index} opacity={selectedOutcomes.has(index) ? 1 : 0.5}>
                                                    <Table.Td>
                                                        <Checkbox
                                                            checked={selectedOutcomes.has(index)}
                                                            onChange={() => toggleOutcome(index)}
                                                        />
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <TextInput
                                                            size="xs"
                                                            value={outcome.name}
                                                            onChange={(e) => updateOutcomeName(index, e.target.value)}
                                                            disabled={!selectedOutcomes.has(index)}
                                                        />
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </ScrollArea>
                            </Paper>

                            <Group justify="flex-end">
                                <Button variant="subtle" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button variant="light" onClick={() => setParsedData(null)}>
                                    Re-upload
                                </Button>
                                <Button
                                    onClick={handleApply}
                                    loading={applying}
                                    disabled={selectedContents.size === 0 && selectedOutcomes.size === 0}
                                    leftSection={<IconCheck size={16} />}
                                    color="green"
                                >
                                    Confirm &amp; Import
                                </Button>
                            </Group>
                        </>
                    )}
                </Stack>
            </Modal>
        </>
    );
}
