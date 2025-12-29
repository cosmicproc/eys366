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
}

export interface GetNodesResponse {
    course_contents: NodeData[];
    course_outcomes: NodeData[];
    program_outcomes: NodeData[];
}

// --- Auth Helper Functions ---

function getAuthHeaders(): Record<string, string> {
    if (typeof localStorage === "undefined") return {};
    const token = localStorage.getItem("auth_token"); // Changed from giraph_token
    return token ? { Authorization: `Token ${token}` } : {}; // Changed from Bearer
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
  const response = await fetch(
    `${getApiBase()}/update_relation/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ relation_id: relationId, weight }),
    }
  );
  return handleResponse<{ message: string }>(response);
}

export async function deleteRelation(
  relationId: number
): Promise<{ message: string }> {
  const response = await fetch(
    `${getApiBase()}/delete_relation/`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ relation_id: relationId }),
    }
  );
  return handleResponse<{ message: string }>(response);
}

export async function deleteNode(
  nodeId: number
): Promise<{ message: string }> {
  const response = await fetch(
    `${getApiBase()}/delete_node/`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ node_id: nodeId }),
    }
  );
  return handleResponse<{ message: string }>(response);
}

export async function updateNode(
  nodeId: number,
  name: string
): Promise<{ message: string }> {
  const response = await fetch(
    `${getApiBase()}/update_node/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ node_id: nodeId, name }),
    }
  );
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
            ...getAuthHeaders() 
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
    const response = await fetch(
        `${getBaseUrl()}/api/users/login/`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password }),
        }
    );
    return handleResponse<{ token: string; user: User }>(response);
}

export async function logout(): Promise<void> {
    await fetch(`${getBaseUrl()}/api/users/logout/`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            ...getAuthHeaders() 
        },
        credentials: "include",
    });
}

export async function getUserInfo(): Promise<User> {
    const response = await fetch(
        `${getBaseUrl()}/api/users/me/`,
        {
            headers: { 
                "Content-Type": "application/json",
                ...getAuthHeaders() 
            },
            credentials: "include",
        }
    );
    return handleResponse<User>(response);
}

export const getProgramSettings = async () => {
  const response = await fetch(
    `${getBaseUrl()}/api/programs/settings/`,
    {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
    }
  );
  
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

export const updateProgramSettings = async (university: string, department: string) => {
  const response = await fetch(
    `${getBaseUrl()}/api/programs/settings/`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ university, department }),
    }
  );
  
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
    await fetch(
        `${getBaseUrl()}/api/users/${id}/update/`,
        {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            credentials: "include",
            body: JSON.stringify({ name }),
        }
    );
}

// Program Outcomes Management
export async function getProgramOutcomes(): Promise<
    { id: number; name: string }[]
> {
    const response = await fetch(
        `${getBaseUrl()}/api/outcomes/program-outcomes/`,
        {
            method: "GET",
            headers: { 
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            credentials: "include",
        }
    );
    return handleResponse<{ id: number; name: string }[]>(response);
}

// Program Outcomes Management - Updated to also create graph node
export async function createProgramOutcome(
    name: string
): Promise<{ id: number }> {
    // First, create the program outcome in the outcomes table
    const response = await fetch(
        `${getBaseUrl()}/api/outcomes/program-outcomes/`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            credentials: "include",
            body: JSON.stringify({ name }),
        }
    );
    const result = await handleResponse<{ id: number }>(response);
    
    // Also create the corresponding graph node for program_outcome layer
    try {
        await fetch(`${getApiBase()}/create_node/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            credentials: "include",
            body: JSON.stringify({
                layer: "program_outcome",
                name: name,
            }),
        });
    } catch (error) {
        console.warn("Failed to create graph node for program outcome:", error);
        // Don't fail the whole operation if graph node creation fails
    }
    
    return result;
}

export async function deleteProgramOutcome(
    outcomeId: number
): Promise<{ message: string }> {
    // First, get the outcome name to find the corresponding graph node
    let outcomeName: string | null = null;
    try {
        const outcomesResponse = await fetch(
            `${getBaseUrl()}/api/outcomes/program-outcomes/`,
            {
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(),
                },
                credentials: "include",
            }
        );
        if (outcomesResponse.ok) {
            const outcomes = await outcomesResponse.json();
            const outcome = outcomes.find((o: { id: number; name: string }) => o.id === outcomeId);
            outcomeName = outcome?.name || null;
        }
    } catch (error) {
        console.warn("Failed to get outcome name:", error);
    }

    // Delete the program outcome from the outcomes table
    const response = await fetch(
        `${getBaseUrl()}/api/outcomes/program-outcomes/${outcomeId}/`,
        {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
            },
            credentials: "include",
        }
    );
    const result = await handleResponse<{ message: string }>(response);

    // Also delete the corresponding graph node if we found the name
    if (outcomeName) {
        try {
            // Get nodes to find the matching program outcome node
            const nodesResponse = await fetch(`${getApiBase()}/get_nodes/`, {
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(),
                },
                credentials: "include",
            });
            if (nodesResponse.ok) {
                const nodesData = await nodesResponse.json();
                const programOutcomeNode = nodesData.program_outcomes?.find(
                    (n: { id: number; name: string }) => n.name === outcomeName
                );
                if (programOutcomeNode) {
                    await fetch(`${getApiBase()}/delete_node/`, {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                            ...getAuthHeaders(),
                        },
                        credentials: "include",
                        body: JSON.stringify({ node_id: programOutcomeNode.id }),
                    });
                }
            }
        } catch (error) {
            console.warn("Failed to delete graph node for program outcome:", error);
        }
    }

    return result;
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

  const response = await fetch(
    `${getBaseUrl()}/api/users/create_lecturer/`,
    {
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
    }
  );

  return handleResponse<User>(response);
}

export async function assignLecturerToCourse(
  courseId: string,
  lecturerId: string
): Promise<{ id: string; name: string }> {
  const response = await fetch(`${getBaseUrl()}/api/programs/assign_lecturer/`, {
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
  });
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
  const response = await fetch(`${getBaseUrl()}/api/users/${userId}/update/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return handleResponse<User>(response);
}

export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<User> {
  const response = await fetch(`${getBaseUrl()}/api/users/${userId}/update/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ password: newPassword }),
  });

  return handleResponse<User>(response);
}

export async function createCourse(data: {
  name: string;
  lecturer_id?: string;
  university?: string;
  department?: string;
}): Promise<Course> {
  const response = await fetch(`${getBaseUrl()}/api/programs/create_course/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return handleResponse<Course>(response);
}

export async function updateCourse(
  courseId: string,
  data: {
    name?: string;
    lecturer_id?: string;
    university?: string;
    department?: string;
  }
): Promise<Course> {
  const response = await fetch(`${getBaseUrl()}/api/programs/update_program/${courseId}/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  return handleResponse<Course>(response);
}

export async function deleteCourse(courseId: string): Promise<{ message: string }> {
  const response = await fetch(`${getBaseUrl()}/api/programs/delete_program/${courseId}/`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
  });

  return handleResponse<{ message: string }>(response);
}

export interface Course {
  id: string;
  name: string;
  lecturer?: string;
  university?: string;
  department?: string;
}
