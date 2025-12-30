"use client";

import {
  Button,
  FileInput,
  Modal,
  Select,
  Text,
  Group,
  Divider,
} from "@mantine/core";
import { useState } from "react";
import { IconUpload, IconFileSpreadsheet } from "@tabler/icons-react";

interface CSVData {
  headers: string[];
  rows: Record<string, string>[];
}

interface UploadCSVButtonProps {
  onApplyValues: (values: Record<string, number>) => void;
}

export default function UploadCSVButton({
  onApplyValues,
}: UploadCSVButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );
  const [useAverage, setUseAverage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse CSV file
  const handleFileUpload = (file: File | null) => {
    setError(null);
    setCsvFile(file);
    setCsvData(null);
    setSelectedStudentId(null);
    setUseAverage(false);

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          setError("CSV file must have at least a header row and one data row");
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

  // Get unique student IDs for dropdown
  const studentIds =
    csvData?.rows
      .map((row) => row.student_id)
      .filter((id, index, self) => id && self.indexOf(id) === index) || [];

  // Calculate averages for numeric columns (excluding student_id)
  const calculateAverages = (): Record<string, number> => {
    if (!csvData) return {};

    const numericColumns = csvData.headers.filter((h) => h !== "student_id");
    const averages: Record<string, number> = {};

    numericColumns.forEach((column) => {
      const values = csvData.rows
        .map((row) => parseFloat(row[column]))
        .filter((val) => !isNaN(val));

      if (values.length > 0) {
        averages[column] = values.reduce((a, b) => a + b, 0) / values.length;
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

  // Handle OK button
  const handleApply = () => {
    setError(null);

    if (!csvData) {
      setError("Please upload a CSV file first");
      return;
    }

    let values: Record<string, number>;

    if (useAverage) {
      values = calculateAverages();
    } else if (selectedStudentId) {
      values = getStudentValues();
    } else {
      setError("Please select a student or use average values");
      return;
    }

    if (Object.keys(values).length === 0) {
      setError("No valid numeric data found");
      return;
    }

    onApplyValues(values);
    setModalOpen(false);
    // Reset state
    setCsvFile(null);
    setCsvData(null);
    setSelectedStudentId(null);
    setUseAverage(false);
  };

  return (
    <>
      <Button
        leftSection={<IconFileSpreadsheet size={16} />}
        variant="light"
        color="teal"
        onClick={() => setModalOpen(true)}
      >
        Upload Learning Outcomes
      </Button>

      <Modal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError(null);
        }}
        title="Upload Learning Outcome Values"
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

          {/* Section 2: Student Selection */}
          <div>
            <Text size="sm" fw={500} mb="xs">
              2. Select Student
            </Text>
            <Select
              placeholder="Choose a student ID"
              data={studentIds}
              value={selectedStudentId}
              onChange={(value) => {
                setSelectedStudentId(value);
                setUseAverage(false);
              }}
              disabled={!csvData}
              searchable
            />
          </div>

          <Divider />

          {/* Section 3: Average Option */}
          <div>
            <Text size="sm" fw={500} mb="xs">
              3. Or Use Average Values
            </Text>
            <Button
              variant={useAverage ? "filled" : "light"}
              color="blue"
              fullWidth
              onClick={() => {
                setUseAverage(true);
                setSelectedStudentId(null);
              }}
              disabled={!csvData}
            >
              Calculate Average from All Students
            </Button>
            {useAverage && (
              <Text size="xs" c="blue" mt="xs">
                ✓ Will use average values across all students
              </Text>
            )}
          </div>

          <Divider />

          {/* Error Display */}
          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}

          {/* Section 4: Apply Button */}
          <Group justify="flex-end" mt="md">
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
              color="teal"
              onClick={handleApply}
              disabled={!csvData || (!selectedStudentId && !useAverage)}
            >
              OK - Apply to Graph
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  );
}
