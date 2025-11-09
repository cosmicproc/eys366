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
    let payload: any = null;
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
                (payload as any).error) ||
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
    if (
        typeof process !== "undefined" &&
        process.env.NEXT_PUBLIC_GIRAPH_API_BASE
    ) {
        return process.env.NEXT_PUBLIC_GIRAPH_API_BASE.replace(/\/$/, "");
    }
    return "/api/giraph";
}

export interface NodeRelation {
    node1_id: number;
    node2_id: number;
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

export async function getNodes(): Promise<GetNodesResponse> {
    const response = await fetch(`${getApiBase()}/get_nodes`);
    return handleResponse<GetNodesResponse>(response);
}

export async function createRelation(
    node1_id: number,
    node2_id: number,
    weight: number
): Promise<{ message: string; relation_id: number }> {
    const response = await fetch(`${getApiBase()}/new_relation`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ node1_id, node2_id, weight }),
    });
    return handleResponse<{ message: string; relation_id: number }>(response);
}

export async function deleteRelation(
    relation_id: number
): Promise<{ message: string }> {
    const response = await fetch(`${getApiBase()}/delete_relation`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ relation_id }),
    });
    return handleResponse<{ message: string }>(response);
}

export async function updateRelation(
    relation_id: number,
    weight: number
): Promise<{ message: string }> {
    const response = await fetch(`${getApiBase()}/update_relation`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ relation_id, weight }),
    });
    return handleResponse<{ message: string }>(response);
}

export async function updateNode(
    id: number,
    name: string
): Promise<{ message: string }> {
    const response = await fetch(`${getApiBase()}/update_node`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name }),
    });
    return handleResponse<{ message: string }>(response);
}

export async function deleteNode(id: number): Promise<{ message: string }> {
    const response = await fetch(`${getApiBase()}/delete_node`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
    });
    return handleResponse<{ message: string }>(response);
}

export async function createNode(
    layer: "cc" | "co" | "po",
    name: string
): Promise<{ message: string; id: number }> {
    const response = await fetch(`${getApiBase()}/new_node`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layer, name }),
    });
    return handleResponse<{ message: string; id: number }>(response);
}
