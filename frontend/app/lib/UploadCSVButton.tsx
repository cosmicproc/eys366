"use client";

import {
    Button,
    Divider,
    FileInput,
    Group,
    Modal,
    NumberInput,
    Select,
    Text
} from "@mantine/core";
import { IconDownload, IconFilter, IconUpload } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { generateStudentReport } from "./apiClient";

interface CSVData {
    headers: string[];
    rows: Record<string, string>[];
}

interface UploadCSVButtonProps {
    onApplyValues: (values: Record<string, number>, studentId?: string) => void;
    onReset?: () => void | Promise<void>;
}

export default function UploadCSVButton({
    onApplyValues,
    onReset,
}: UploadCSVButtonProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvData, setCsvData] = useState<CSVData | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
        null
    );
    // useAverage removed
    const [error, setError] = useState<string | null>(null);

    // Report & Export State
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportData, setReportData] = useState<any[]>([]);
    const [loadingReport, setLoadingReport] = useState(false);
    const [filterColumn, setFilterColumn] = useState<string | null>(null);
    const [filterOperator, setFilterOperator] = useState<"gt" | "lt">("gt");
    const [filterValue, setFilterValue] = useState<number | "">("");

    // Parse CSV file
    const handleFileUpload = (file: File | null) => {
        setError(null);
        setCsvFile(file);
        setCsvData(null);
        setSelectedStudentId(null);
        
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split("\n").filter((line) => line.trim());

                if (lines.length < 2) {
                    setError(
                        "CSV file must have at least a header row and one data row"
                    );
                    return;
                }

                const headers = lines[0].split(",").map((h) => h.trim());

                // Check if student_id column exists
                if (!headers.includes("student_id")) {
                    setError("CSV must contain a 'student_id' column");
                    return;
                }

                const rows = lines.slice(1).map((line) => {
                    const values = line.split(",").map((v) => v.trim());
                    const row: Record<string, string> = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index] || "";
                    });
                    return row;
                });

                setCsvData({ headers, rows });
            } catch (err) {
                setError("Failed to parse CSV file");
                console.error(err);
            }
        };

        reader.readAsText(file);
    };

    // Get unique student IDs for dropdown (with "All Students" option)
    const studentIds = [
        { value: "__all__", label: "All Students" },
        ...(csvData?.rows
            .map((row) => row.student_id)
            .filter((id, index, self) => id && self.indexOf(id) === index)
            .map((id) => ({ value: id, label: id })) || [])
    ];

    // Calculate averages for numeric columns (excluding student_id)
    const calculateAverages = (): Record<string, number> => {
        if (!csvData) return {};

        const numericColumns = csvData.headers.filter(
            (h) => h !== "student_id"
        );
        const averages: Record<string, number> = {};

        numericColumns.forEach((column) => {
            const values = csvData.rows
                .map((row) => parseFloat(row[column]))
                .filter((val) => !isNaN(val));

            if (values.length > 0) {
                averages[column] =
                    values.reduce((a, b) => a + b, 0) / values.length;
            }
        });

        return averages;
    };

    // Get values for selected student
    const getStudentValues = (): Record<string, number> => {
        if (!csvData || !selectedStudentId) return {};

        const studentRow = csvData.rows.find(
            (row) => row.student_id === selectedStudentId
        );
        if (!studentRow) return {};

        const values: Record<string, number> = {};
        csvData.headers.forEach((header) => {
            if (header !== "student_id") {
                const value = parseFloat(studentRow[header]);
                if (!isNaN(value)) {
                    values[header] = value;
                }
            }
        });

        return values;
    };

    // Handle OK button (Main Modal)
    const handleApply = async () => {
        // If we have filtered report data, use that for graph calculation
        if (filteredReportData.length > 0 && reportData.length > 0) {
            handleApplyFilteredToGraph();
            return;
        }

        setError(null);

        if (!csvData && !csvFile) {
            setError("Please upload a CSV file first");
            return;
        }

        const API_URL =
            process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        try {
            let mappedValues: Record<string, number> = {};
            const mode = selectedStudentId ? "student" : "average";

            if (csvFile) {
                // Send file to backend for processing (supports CSV and Excel)
                const form = new FormData();
                form.append("file", csvFile);
                form.append("mode", mode);
                if (selectedStudentId)
                    form.append("student_id", selectedStudentId);

                const token =
                    typeof localStorage !== "undefined"
                        ? localStorage.getItem("token")
                        : null;

                const res = await fetch(
                    `${API_URL}/api/outcomes/upload_grades/`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: token
                            ? { Authorization: `Token ${token}` }
                            : {},
                        body: form,
                    }
                );

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(
                        err.error || "Failed to upload CSV to server"
                    );
                }

                const data = await res.json();
                // Expecting { mapped_values: { colName: value }, ... }
                mappedValues = data.mapped_values || {};
            } else {
                // No file object (parsed CSV only) - fallback to local computation
                mappedValues = selectedStudentId
                    ? getStudentValues()
                    : calculateAverages();
            }

            if (Object.keys(mappedValues).length === 0) {
                setError("No valid numeric data found after processing");
                return;
            }

            // Apply to graph via callback, pass selected student id if any
            onApplyValues(mappedValues, selectedStudentId || undefined);

            setModalOpen(false);
            // Reset state
            setCsvFile(null);
            setCsvData(null);
            setSelectedStudentId(null);
        } catch (err: any) {
            console.error(err);
            setError(err.message || String(err));
        }
    };

    const handleGenerateReport = async () => {
        if (!csvFile) return;
        setLoadingReport(true);
        setError(null);
        try {
            const courseIdMatch = window.location.search.match(/courseId=([^&]+)/);
            const courseId = courseIdMatch
                ? decodeURIComponent(courseIdMatch[1])
                : undefined;
            
            const data = await generateStudentReport(csvFile, courseId);
            setReportData(data);
            setReportModalOpen(true);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Failed to generate report");
        } finally {
            setLoadingReport(false);
        }
    };

    const filteredReportData = useMemo(() => {
        if (!filterColumn || filterValue === "" || reportData.length === 0) {
            return reportData;
        }

        const limit = Number(filterValue);
        return reportData.filter(row => {
            const val = row[filterColumn];
            if (typeof val !== 'number') return false;
            return filterOperator === "gt" ? val > limit : val < limit;
        });
    }, [reportData, filterColumn, filterOperator, filterValue]);

    const handleApplyFilteredToGraph = () => {
        if (filteredReportData.length === 0) return;

        // Calculate averages for inputs (CC)
        const sums: Record<string, number> = {};
        const counts: Record<string, number> = {};
        
        filteredReportData.forEach(row => {
            Object.keys(row).forEach(key => {
                // We only care about Course Content inputs for the graph scores
                if (!key.startsWith("CC_")) return;
                
                const val = row[key];
                const cleanKey = key.substring(3); // Remove "CC_" prefix
                
                if (typeof val === 'number') {
                    sums[cleanKey] = (sums[cleanKey] || 0) + val;
                    counts[cleanKey] = (counts[cleanKey] || 0) + 1;
                }
            });
        });

        const averages: Record<string, number> = {};
        Object.keys(sums).forEach(key => {
            averages[key] = sums[key] / counts[key];
        });
        
        onApplyValues(averages);
        setReportModalOpen(false);
        setModalOpen(false);
        setCsvFile(null);
        setCsvData(null);
        setReportData([]); // Clear report data
    };

    const handleExportFilteredCSV = async () => {
        // If no report data, generate it from file
        let dataToExport = filteredReportData;
        if (dataToExport.length === 0 && csvFile) {
            try {
                const courseIdMatch = window.location.search.match(/courseId=([^&]+)/);
                const courseId = courseIdMatch
                    ? decodeURIComponent(courseIdMatch[1])
                    : undefined;
                dataToExport = await generateStudentReport(csvFile, courseId);
                setReportData(dataToExport);
            } catch (err) {
                console.error("Export generation failed", err);
                return;
            }
        }

        // Filter by selected student ID if one is chosen (skip if "All Students")
        if (selectedStudentId && selectedStudentId !== "__all__" && dataToExport.length > 0) {
            dataToExport = dataToExport.filter(
                row => String(row.student_id) === String(selectedStudentId)
            );
        }

        if (dataToExport.length === 0) return;
        
        // Collect all keys
        const keys = Object.keys(dataToExport[0]);
        const csvRows = [keys.join(",")];
        
        dataToExport.forEach(row => {
            const values = keys.map(k => {
                const val = row[k];
                return val === undefined || val === null ? "" : val;
            });
            csvRows.push(values.join(","));
        });
        
        const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = selectedStudentId && selectedStudentId !== "__all__"
            ? `student_${selectedStudentId}_outcomes_report.csv`
            : "student_outcomes_report.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <>
            <Button
                leftSection={<IconUpload size={16} />}
                variant="subtle"
                radius="lg"
                onClick={() => setModalOpen(true)}
            >
                Upload Data
            </Button>


            <Modal
                opened={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setError(null);
                }}
                title="Upload Data"
                size="lg"
                centered
            >
                <div className="space-y-4">
                    {/* Section 1: CSV Upload */}
                    <div>
                        <Text size="sm" fw={500} mb="xs">
                            1. Upload CSV File
                        </Text>
                        <FileInput
                            placeholder="Select CSV file"
                            accept=".csv"
                            value={csvFile}
                            onChange={handleFileUpload}
                            leftSection={<IconUpload size={16} />}
                        />
                        {csvData && (
                            <Text size="xs" c="green" mt="xs">
                                ✓ Loaded {csvData.rows.length} rows with{" "}
                                {csvData.headers.length} columns
                            </Text>
                        )}
                    </div>

                    <Divider />

                    {/* Section 2: Filtering */}
                    <div>
                        <Text size="sm" fw={500} mb="xs">
                            2. Filtering
                        </Text>
                        <Group align="flex-end">
                            <Select
                                className="flex-1"
                                label="Choose Student ID"
                                placeholder="Select ID"
                                data={studentIds}
                                value={selectedStudentId || "__all__"}
                                onChange={(value) => {
                                    setSelectedStudentId(value);
                                }}
                                disabled={!csvData}
                                searchable
                            />
                            <Button
                                variant="light" 
                                color="grape" 
                                onClick={handleGenerateReport}
                                leftSection={<IconFilter size={16} />}
                                disabled={!csvData}
                            >
                                Advanced Filtering
                            </Button>
                        </Group>
                    </div>

                    <Divider />

                    {/* Error Display */}
                    {error && (
                        <Text c="red" size="sm">
                            {error}
                        </Text>
                    )}

                    {/* Section 5: Apply Button */}
                    <Group justify="space-between" mt="md">
                        {onReset && (
                            <Button
                                variant="subtle"
                                color="red"
                                onClick={async () => {
                                    setModalOpen(false);
                                    await onReset();
                                }}
                            >
                                Reset Scores
                            </Button>
                        )}
                        <Group>
                            <Button
                                variant="default"
                                onClick={() => {
                                    setModalOpen(false);
                                    setError(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                leftSection={<IconDownload size={16} />}
                                variant="default"
                                onClick={handleExportFilteredCSV}
                                disabled={!csvData && filteredReportData.length === 0}
                            >
                                Export CSV
                            </Button>
                            <Button
                                color="teal"
                                onClick={handleApply}
                                disabled={!csvData}
                            >
                                OK - Apply to Graph
                            </Button>
                        </Group>
                    </Group>
                </div>
            </Modal>

            {/* Report & Filter Modal */}
            <Modal
                opened={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                title="Advanced Filtering"
                size="xl"
            >
                <div className="flex flex-col gap-4">
                    {/* Filters */}
                    <Text fw={500}>Filter Results</Text>
                    <Group className="items-end">
                         <Select 
                            label="Column"
                            placeholder="Select column"
                            className="flex-1"
                            data={reportData.length > 0 ? Object.keys(reportData[0]).filter(k => k !== 'student_id') : []}
                            value={filterColumn}
                            onChange={setFilterColumn}
                         />
                         <Select 
                            label="Operator"
                            data={[
                                { value: "gt", label: "Greater Than (>)" },
                                { value: "lt", label: "Less Than (<)" },
                            ]}
                            value={filterOperator}
                            onChange={(v) => setFilterOperator(v as "gt" | "lt")}
                            w={150}
                         />
                         <NumberInput
                            label="Value"
                            placeholder="Threshold"
                            value={filterValue}
                            onChange={(val) => setFilterValue(val === "" ? "" : Number(val))}
                            w={150} 
                         />
                    </Group>

                    {/* Table Preview Removed */}
                    
                    <Divider />
                    
                    <Group justify="space-between">
                         <Text size="sm" c="dimmed">
                             Filtering {filteredReportData.length} of {reportData.length} students
                         </Text>
                        <Group>
                            <Button 
                                variant="subtle"
                                color="gray"
                                onClick={() => {
                                    setFilterColumn(null);
                                    setFilterOperator("gt");
                                    setFilterValue("");
                                }}
                                disabled={!filterColumn && filterValue === ""}
                            >
                                Reset Filter
                            </Button>
                            <Button 
                                variant="outline"
                                color="teal"
                                onClick={() => setReportModalOpen(false)}
                                disabled={filteredReportData.length === 0}
                            >
                                Apply Filter
                            </Button>
                        </Group>
                    </Group>
                </div>
            </Modal>
        </>
    );
}
