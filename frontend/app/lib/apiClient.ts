// API Client for Giraph endpoints

export class ApiError extends Error {
    status: number;
    data?: unknown;
    constructor(message: string, status: number, data?: unknown) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("Content-Type") || "";
    let payload: unknown = null;
    try {
        if (contentType.includes("application/json")) {
            payload = await response.json();
        } else {
            payload = await response.text();
        }
    } catch {
        // ignore JSON parse errors
    }
    if (!response.ok) {
        const message =
            (payload &&
                typeof payload === "object" &&
                (payload as { error?: string; detail?: string }).error) ||
            (payload &&
                typeof payload === "object" &&
                (payload as { error?: string; detail?: string }).detail) ||
            response.statusText ||
            "Request failed";
        throw new ApiError(String(message), response.status, payload);
    }
    return payload as T;
}

// Configurable API base. Priority order:
// 1. Runtime override via setApiBase
// 2. NEXT_PUBLIC_GIRAPH_API_BASE env (browser/runtime)
// 3. Fallback to Next.js route namespace /api/giraph
let runtimeApiBase: string | null = null;

export function setApiBase(base: string) {
    runtimeApiBase = base.replace(/\/$/, "");
}

export function getApiBase(): string {
    if (runtimeApiBase) return runtimeApiBase;
    if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE) {
        return process.env.NEXT_PUBLIC_API_BASE.replace(/\/$/, "");
    }
    return "http://127.0.0.1:8000/api/giraph";
}

// Add this helper for non-giraph endpoints
export function getBaseUrl(): string {
    if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
    }
    return "http://127.0.0.1:8000";
}

export interface NodeRelation {
    node1_id: number;
    node2_id: number;
    weight: number;
    relation_id: number;
}

export interface NodeData {
    id: number;
    name: string;
    relations: NodeRelation[];
    score?: number; // optional score applied via CSV import
}

export interface GetNodesResponse {
    course_contents: NodeData[];
    course_outcomes: NodeData[];
    program_outcomes: NodeData[];
}

// --- Auth Helper Functions ---

function getAuthHeaders(): Record<string, string> {
    if (typeof localStorage === "undefined") return {};
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Token ${token}` } : {};
}

export async function getNodes(
    courseId?: string | number
): Promise<GetNodesResponse> {
    const url = courseId
        ? `${getApiBase()}/get_nodes/?courseId=${courseId}`
        : `${getApiBase()}/get_nodes/`;
    const response = await fetch(url, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
    });
    return handleResponse<GetNodesResponse>(response);
}

export async function applyScores(
    values: Record<string, number>,
    courseId?: string | number
): Promise<GetNodesResponse> {
    const url = `${getApiBase()}/apply_scores/`;

    // Build request options once so we can reuse them in a retry if needed
    const options: RequestInit = {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ values, course_id: courseId }),
        // Prevent automatic redirect following so we can handle 301/302 and avoid
        // the browser turning a POST into a GET on redirect which causes 405s.
        redirect: "manual",
    };

    // First attempt
    let response = await fetch(url, options);

    // If server redirected (301/302) and provided Location header, retry POST to the new location.
    if (
        (response.status === 301 || response.status === 302) &&
        response.headers.get("Location")
    ) {
        const location = response.headers.get("Location")!;
        // Absolute or relative location handling
        const retryUrl = location.startsWith("http")
            ? location
            : new URL(location, url).toString();
        response = await fetch(retryUrl, options);
    }

    // If we still got 405, attempt to detect a trailing-slash redirect scenario: try posting to same path without/with trailing slash.
    if (response.status === 405) {
        // Try the variant without the trailing slash
        const altUrl = url.endsWith("/") ? url.slice(0, -1) : `${url}/`;
        // Only retry if it's different
        if (altUrl !== url) {
            response = await fetch(altUrl, options);
        }
    }

    // For diagnostics: if still not ok, include response text in thrown error payload
    if (!response.ok) {
        const text = await response.text().catch(() => "");
        const contentType = response.headers.get("Content-Type") || "";
        let payload: unknown = text;
        if (contentType.includes("application/json")) {
            try {
                payload = JSON.parse(text);
            } catch {}
        }
        throw new ApiError(
            (payload &&
                typeof payload === "object" &&
                ((payload as any).detail || (payload as any).error)) ||
                response.statusText ||
                `Request failed (${response.status})`,
            response.status,
            payload
        );
    }

    return handleResponse<GetNodesResponse>(response);
}

export async function resetScores(
    courseId?: string | number
): Promise<GetNodesResponse> {
    const url = `${getApiBase()}/reset_scores/`;

    const options: RequestInit = {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ course_id: courseId }),
        redirect: "manual",
    };

    let response = await fetch(url, options);

    if (
        (response.status === 301 || response.status === 302) &&
        response.headers.get("Location")
    ) {
        const location = response.headers.get("Location")!;
        const retryUrl = location.startsWith("http")
            ? location
            : new URL(location, url).toString();
        response = await fetch(retryUrl, options);
    }

    if (response.status === 405) {
        const altUrl = url.endsWith("/") ? url.slice(0, -1) : `${url}/`;
        if (altUrl !== url) {
            response = await fetch(altUrl, options);
        }
    }

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        const contentType = response.headers.get("Content-Type") || "";
        let payload: unknown = text;
        if (contentType.includes("application/json")) {
            try {
                payload = JSON.parse(text);
            } catch {}
        }
        throw new ApiError(
            (payload &&
                typeof payload === "object" &&
                ((payload as any).detail || (payload as any).error)) ||
                response.statusText ||
                `Request failed (${response.status})`,
            response.status,
            payload
        );
    }

    return handleResponse<GetNodesResponse>(response);
}

export async function calculateStudentResults(
    studentId: string,
    courseId?: string | number
): Promise<{
    course_contents: { id: number; name: string; student_grade: number }[];
    learning_outcomes: { id: number; name: string; calculated_score: number }[];
    program_outcomes: { id: number; name: string; calculated_score: number }[];
}> {
    const url = `${getApiBase()}/calculate_student_results/?student_id=${encodeURIComponent(
        studentId
    )}${courseId ? `&courseId=${encodeURIComponent(String(courseId))}` : ""}`;
    const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
    });
    return handleResponse<any>(response);
}

export async function createRelation(
    node1_id: number,
    node2_id: number,
    weight: number
): Promise<{ message: string; relation_id: number }> {
    const response = await fetch(`${getApiBase()}/new_relation/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ node1_id, node2_id, weight }),
    });
    return handleResponse<{ message: string; relation_id: number }>(response);
}

export async function updateRelation(
    relationId: number,
    weight: number
): Promise<{ message: string }> {
    const response = await fetch(`${getApiBase()}/update_relation/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ relation_id: relationId, weight }),
    });
    return handleResponse<{ message: string }>(response);
}

export async function deleteRelation(
    relationId: number
): Promise<{ message: string }> {
    const response = await fetch(`${getApiBase()}/delete_relation/`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ relation_id: relationId }),
    });
    return handleResponse<{ message: string }>(response);
}

export async function deleteNode(nodeId: number): Promise<{ message: string }> {
    const response = await fetch(`${getApiBase()}/delete_node/`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ node_id: nodeId }),
    });
    return handleResponse<{ message: string }>(response);
}

export async function updateNode(
    nodeId: number,
    name: string
): Promise<{ message: string }> {
    const response = await fetch(`${getApiBase()}/update_node/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ node_id: nodeId, name }),
    });
    return handleResponse<{ message: string }>(response);
}

export type NodeLayer = "course_content" | "course_outcome" | "program_outcome";

export async function createNode(
    layer: NodeLayer,
    name: string,
    courseId?: string | number
): Promise<{ message: string; id: number }> {
    const response = await fetch(`${getApiBase()}/new_node/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ layer, name, course_id: courseId }),
    });
    return handleResponse<{ message: string; id: number }>(response);
}

// --- Auth & Program APIs ---

export async function login(
    username: string,
    password: string
): Promise<{ token: string; user: User }> {
    const response = await fetch(`${getBaseUrl()}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
    });
    return handleResponse<{ token: string; user: User }>(response);
}

export async function logout(): Promise<void> {
    await fetch(`${getBaseUrl()}/api/auth/logout/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
    });
}

export async function getUserInfo(): Promise<User> {
    const response = await fetch(`${getBaseUrl()}/api/auth/me/`, {
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
    });
    return handleResponse<User>(response);
}

export const getProgramSettings = async () => {
    const response = await fetch(`${getBaseUrl()}/api/programs/settings/`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
            errorData.detail || "Failed to get program settings",
            response.status,
            errorData
        );
    }

    return response.json();
};

export const updateProgramSettings = async (
    university: string,
    department: string
) => {
    const response = await fetch(`${getBaseUrl()}/api/programs/settings/`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ university, department }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
            errorData.detail || "Failed to update program settings",
            response.status,
            errorData
        );
    }

    return response.json();
};

export async function getProgramInfo(): Promise<{ lecturers: User[] }> {
    const response = await fetch(`${getBaseUrl()}/api/programs/program-info/`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
    });
    return handleResponse<{ lecturers: User[] }>(response);
}

export async function getCourses(): Promise<Course[]> {
    const response = await fetch(`${getBaseUrl()}/api/programs/list_courses/`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
    });
    return handleResponse<Course[]>(response);
}

export interface User {
    id: string;
    username: string;
    role: "lecturer" | "head";
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    courseIds?: string[];
    courses?: number[];
    department?: string;
    university?: string;
}

export async function updateLecturer(id: number, name: string): Promise<void> {
    await fetch(`${getBaseUrl()}/api/users/${id}/update/`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ name }),
    });
}

// Program Outcomes Management
export async function createProgramOutcome(
    name: string,
    description?: string
): Promise<{ id: number }> {
    // Create the program outcome as a graph node (this is the main storage)
    const response = await fetch(`${getApiBase()}/create_program_outcome/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ name, description }),
    });

    return handleResponse<{ id: number }>(response);
}

export async function deleteProgramOutcome(
    outcomeId: number
): Promise<{ message: string }> {
    // Delete the program outcome node directly
    const response = await fetch(`${getApiBase()}/delete_program_outcome/`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ outcome_id: outcomeId }),
    });

    return handleResponse<{ message: string }>(response);
}

export async function getProgramOutcomes(): Promise<
    { id: number; name: string }[]
> {
    const response = await fetch(`${getApiBase()}/get_program_outcomes/`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
    });
    const data = await handleResponse<{
        program_outcomes: { id: number; name: string }[];
    }>(response);
    return data.program_outcomes;
}

export async function generateStudentReport(
    file: File,
    courseId?: string
): Promise<any[]> {
    const formData = new FormData();
    formData.append("file", file);
    if (courseId) {
        formData.append("courseId", courseId);
    }

    const response = await fetch(`${getApiBase()}/generate_student_report/`, {
        method: "POST",
        headers: {
            ...getAuthHeaders(),
        },
        credentials: "include",
        body: formData,
    });
    return handleResponse<any[]>(response);
}

export async function createLecturer(data: {
    username: string;
    email: string;
    name: string;
    university: string;
    department: string;
    password?: string;
}): Promise<User> {
    const [first_name, ...lastNameParts] = data.name.split(" ");
    const last_name = lastNameParts.join(" ");

    const response = await fetch(`${getBaseUrl()}/api/users/create_lecturer/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
            username: data.username,
            email: data.email,
            first_name,
            last_name,
            university: data.university,
            department: data.department,
            password: data.password || "123",
            role: "lecturer",
        }),
    });

    return handleResponse<User>(response);
}

export async function assignLecturerToCourse(
    courseId: string,
    lecturerId: string
): Promise<{ id: string; name: string }> {
    const response = await fetch(
        `${getBaseUrl()}/api/programs/assign_lecturer/`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            credentials: "include",
            body: JSON.stringify({
                course_id: courseId,
                lecturer_id: lecturerId,
            }),
        }
    );
    return handleResponse<{ id: string; name: string }>(response);
}

export async function updateUserProfile(
    userId: string,
    data: {
        username?: string;
        first_name?: string;
        last_name?: string;
        email?: string;
    }
): Promise<User> {
    const response = await fetch(
        `${getBaseUrl()}/api/users/${userId}/update/`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            credentials: "include",
            body: JSON.stringify(data),
        }
    );

    return handleResponse<User>(response);
}

export async function updateUserPassword(
    userId: string,
    newPassword: string
): Promise<User> {
    const response = await fetch(
        `${getBaseUrl()}/api/users/${userId}/update/`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            credentials: "include",
            body: JSON.stringify({ password: newPassword }),
        }
    );

    return handleResponse<User>(response);
}

export async function createCourse(data: {
    name: string;
    lecturer_id?: string;
    university?: string;
    department?: string;
}): Promise<Course> {
    const response = await fetch(
        `${getBaseUrl()}/api/programs/create_course/`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            credentials: "include",
            body: JSON.stringify(data),
        }
    );

    return handleResponse<Course>(response);
}

export async function updateCourse(
    courseId: string,
    data: {
        name?: string;
        lecturer_id?: string | null;
        university?: string;
        department?: string;
    }
): Promise<Course> {
    const response = await fetch(
        `${getBaseUrl()}/api/programs/update_program/${courseId}/`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            credentials: "include",
            body: JSON.stringify(data),
        }
    );

    return handleResponse<Course>(response);
}

export async function deleteCourse(
    courseId: string
): Promise<{ message: string }> {
    const response = await fetch(
        `${getBaseUrl()}/api/programs/delete_program/${courseId}/`,
        {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            credentials: "include",
        }
    );

    return handleResponse<{ message: string }>(response);
}

export interface Course {
    id: string;
    name: string;
    lecturer?: string;
    lecturer_name?: string;
    university?: string;
    department?: string;
}

export async function requestPasswordReset(
    email: string
): Promise<{ message: string }> {
    const response = await fetch(
        `${getBaseUrl()}/api/users/request-password-reset/`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        }
    );

    if (!response.ok) {
        const error = await response
            .json()
            .catch(() => ({ error: "Failed to send reset email" }));
        throw new Error(error.error || "Failed to send reset email");
    }

    return response.json();
}

export async function resetPassword(
    token: string,
    password: string
): Promise<{ message: string }> {
    const response = await fetch(`${getBaseUrl()}/api/users/reset-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
        const error = await response
            .json()
            .catch(() => ({ error: "Failed to reset password" }));
        throw new Error(error.error || "Failed to reset password");
    }

    return response.json();
}

// --- Syllabus Import Types and Functions ---

export interface SyllabusContent {
    name: string;
}

export interface SyllabusOutcome {
    name: string;
}

export interface ParseSyllabusResponse {
    message: string;
    data: {
        course_contents: SyllabusContent[];
        course_outcomes: SyllabusOutcome[];
        raw_text: string;
    };
}

export interface ApplySyllabusResponse {
    message: string;
    created_nodes: {
        course_contents: { id: number; name: string }[];
        course_outcomes: { id: number; name: string }[];
    };
}

export async function parseSyllabus(file: File): Promise<ParseSyllabusResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${getApiBase()}/parse_syllabus/`, {
        method: "POST",
        credentials: "include",
        headers: {
            ...getAuthHeaders(),
        },
        body: formData,
    });

    return handleResponse<ParseSyllabusResponse>(response);
}

export async function applySyllabusImport(
    courseId: string,
    courseContents: SyllabusContent[],
    courseOutcomes: SyllabusOutcome[]
): Promise<ApplySyllabusResponse> {
    const response = await fetch(`${getApiBase()}/apply_syllabus_import/`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({
            course_id: courseId,
            course_contents: courseContents,
            course_outcomes: courseOutcomes,
        }),
    });

    return handleResponse<ApplySyllabusResponse>(response);
}

export interface ClearCourseNodesResponse {
    message: string;
    deleted_course_contents: number;
    deleted_course_outcomes: number;
}

export async function clearCourseNodes(courseId: string): Promise<ClearCourseNodesResponse> {
    const response = await fetch(`${getApiBase()}/clear_course_nodes/`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
        },
        body: JSON.stringify({ course_id: courseId }),
    });

    return handleResponse<ClearCourseNodesResponse>(response);
}
