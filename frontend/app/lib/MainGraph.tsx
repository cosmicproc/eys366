"use client";

import {
    Button,
    Group,
    Modal,
    NumberInput,
    Text,
    TextInput,
} from "@mantine/core";
import {
    Background,
    Controls,
    MiniMap,
    Position,
    ReactFlow,
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
    type Connection,
    type Edge,
    type EdgeChange,
    type Node,
    type NodeChange,
    type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    createRelation,
    deleteRelation,
    getNodes,
    updateRelation,
    type GetNodesResponse,
} from "./apiClient";
import { useAuth } from "./AuthContext";
import GraphNode from "./GraphNode";

// Layer 1: Course Content (Left)
const courseContentNodes = [
    {
        id: "cc1",
        position: { x: 50, y: 100 },
        data: { label: "Lecture 1: Introduction" },
        type: "default",
    },
    {
        id: "cc2",
        position: { x: 50, y: 200 },
        data: { label: "Lecture 2: Fundamentals" },
        type: "default",
    },
    {
        id: "cc3",
        position: { x: 50, y: 300 },
        data: { label: "Lab 1: Practical Skills" },
        type: "default",
    },
    {
        id: "cc4",
        position: { x: 50, y: 400 },
        data: { label: "Assignment 1" },
        type: "default",
    },
];

// We'll inject edit/delete handlers via a wrapper component for React Flow nodeTypes
const createNodeTypes = (
    onEdit: (apiId: number, currentName: string) => void,
    onDelete: (apiId: number, currentName: string) => void
) => ({
    graphnode: (props: NodeProps<AppNode>) => (
        <GraphNode {...props} onEdit={onEdit} onDelete={onDelete} />
    ),
});

// Helper function to convert API data to React Flow nodes
const convertToNodes = (data: GetNodesResponse): Node[] => {
    const nodes: Node[] = [];
    let yOffset = 100;

    // Course Content nodes
    data.course_contents.forEach((node, index) => {
        nodes.push({
            id: `course_content-${node.id}`,
            position: { x: 50, y: yOffset + index * 100 },
            data: { label: node.name, apiId: node.id },
            type: "graphnode",
            draggable: false,
            sourcePosition: Position.Right,
            targetPosition: Position.Right,
            style: {
                background: "#e3f2fd",
                border: "2px solid #1976d2",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "12px",
                width: 180,
            },
        });
    });

    // Course Outcomes nodes
    yOffset = 80;
    data.course_outcomes.forEach((node, index) => {
        nodes.push({
            id: `course_outcome-${node.id}`,
            position: { x: 400, y: yOffset + index * 100 },
            data: { label: node.name, apiId: node.id },
            type: "graphnode",
            draggable: false,
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            style: {
                background: "#f3e5f5",
                border: "2px solid #7b1fa2",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "12px",
                width: 180,
            },
        });
    });

    // Program Outcomes nodes
    yOffset = 100;
    data.program_outcomes.forEach((node, index) => {
        nodes.push({
            id: `program_outcome-${node.id}`,
            position: { x: 750, y: yOffset + index * 100 },
            data: { label: node.name, apiId: node.id },
            type: "graphnode",
            draggable: false,
            sourcePosition: Position.Left,
            targetPosition: Position.Left,
            style: {
                background: "#e8f5e9",
                border: "2px solid #388e3c",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "12px",
                width: 200,
            },
        });
    });

    return nodes;
};

// Helper function to convert API relations to React Flow edges
const convertToEdges = (data: GetNodesResponse): Edge[] => {
    const edges: Edge[] = [];
    const seenRelations = new Set<number>();

    // Process all node types and their relations
    const allNodes = [
        ...data.course_contents,
        ...data.course_outcomes,
        ...data.program_outcomes,
    ];

    allNodes.forEach((node) => {
        node.relations.forEach((relation) => {
            // Skip if we've already created this edge (API returns relations on both ends)
            if (seenRelations.has(relation.relation_id)) return;
            seenRelations.add(relation.relation_id);
            const sourceId = `${getLayerPrefix(relation.node1_id, data)}-${
                relation.node1_id
            }`;
            const targetId = `${getLayerPrefix(relation.node2_id, data)}-${
                relation.node2_id
            }`;
            const sourceLayer = getLayerPrefix(relation.node1_id, data);
            const edgeColor =
                sourceLayer === "course_content" ? "#1976d2" : "#388e3c";

            edges.push({
                id: `e-${relation.relation_id}`,
                source: sourceId,
                target: targetId,
                label: String(relation.weight),
                animated: true,
                style: {
                    stroke: edgeColor,
                    strokeWidth: 2,
                },
                labelStyle: {
                    fill: edgeColor,
                    fontWeight: 700,
                    fontSize: 14,
                },
                labelBgStyle: {
                    fill: "white",
                    fillOpacity: 0.9,
                },
                data: { relationId: relation.relation_id, weight: 3 },
            });
        });
    });

    return edges;
};

// Helper to get layer prefix from node ID
const getLayerPrefix = (nodeId: number, data: GetNodesResponse): string => {
    if (data.course_contents.some((n) => n.id === nodeId))
        return "course_content";
    if (data.course_outcomes.some((n) => n.id === nodeId))
        return "course_outcome";
    if (data.program_outcomes.some((n) => n.id === nodeId))
        return "program_outcome";
    return "unknown";
};

// Helper function to determine node layer
const getNodeLayer = (
    nodeId: string
): "course_content" | "course_outcome" | "program_outcome" | null => {
    if (nodeId.startsWith("course_content")) return "course_content";
    if (nodeId.startsWith("course_outcome")) return "course_outcome";
    if (nodeId.startsWith("program_outcome")) return "program_outcome";
    return null;
};

// Validate connection to maintain bipartite structure
const isValidConnection = (connection: Connection): boolean => {
    if (!connection.source || !connection.target) return false;

    const sourceLayer = getNodeLayer(connection.source);
    const targetLayer = getNodeLayer(connection.target);

    // Only allow CC -> CO or CO -> PO connections
    if (sourceLayer === "course_content" && targetLayer === "course_outcome")
        return true;
    if (sourceLayer === "course_outcome" && targetLayer === "program_outcome")
        return true;

    return false;
};

export default function MainGraph() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [loading, setLoading] = useState(true);
    // Weight modal state
    const [weightModalOpen, setWeightModalOpen] = useState(false);
    const [weightValue, setWeightValue] = useState<number | "">(1);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [pendingConnection, setPendingConnection] =
        useState<Connection | null>(null);
    const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
    const [saving, setSaving] = useState(false);
    // Node edit/delete modal state
    const [nodeEditModalOpen, setNodeEditModalOpen] = useState(false);
    const [nodeDeleteModalOpen, setNodeDeleteModalOpen] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
    const [editingNodeName, setEditingNodeName] = useState("");
    const [newNodeName, setNewNodeName] = useState("");
    const [modalError, setModalError] = useState<string | null>(null);
    const NAME_MAX = 60;
    // Click selection state
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const searchParams = useSearchParams();
    const courseIdParam = searchParams.get("courseId");
    const courseId = courseIdParam || null;
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [authLoading, user, router]);

    // Load initial data from API
    useEffect(() => {
        if (authLoading || !user) return;

        const loadData = async () => {
            setLoading(true);
            try {
                // If no course selected and user is lecturer, default to first course
                let targetCourseId = courseId;
                if (
                    !targetCourseId &&
                    user?.role === "lecturer" &&
                    user &&
                    user.courseIds &&
                    user.courseIds.length > 0
                ) {
                    targetCourseId = user.courseIds[0];
                }

                // If still no course ID and user is lecturer, show message
                if (!targetCourseId && user?.role === "lecturer") {
                    console.warn(
                        "No course selected and user has no courses assigned"
                    );
                    setLoading(false);
                    return;
                }

                const data = await getNodes(targetCourseId || undefined);
                setNodes(convertToNodes(data));
                setEdges(convertToEdges(data));
            } catch (error) {
                console.error("Failed to load graph data:", error);
                // Don't show alert for 404 errors when no course is selected
                if (error instanceof Error && !error.message.includes("404")) {
                    alert(`Failed to load graph data: ${error.message}`);
                }
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user, courseId, authLoading]);

    useEffect(() => {
        // Listen for new node event from header modal
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as
                | {
                      id: number;
                      name: string;
                      type:
                          | "course_content"
                          | "course_outcome"
                          | "program_outcome";
                  }
                | undefined;
            if (!detail) return;
            setNodes((prev) => {
                const y =
                    80 +
                    prev.filter((n) => n.id.startsWith(detail.type)).length *
                        100;
                const xMap = {
                    course_content: 50,
                    course_outcome: 400,
                    program_outcome: 750,
                } as const;
                const colorMap = {
                    course_content: {
                        bg: "#e3f2fd",
                        border: "#1976d2",
                        width: 180,
                    },
                    course_outcome: {
                        bg: "#f3e5f5",
                        border: "#7b1fa2",
                        width: 180,
                    },
                    program_outcome: {
                        bg: "#e8f5e9",
                        border: "#388e3c",
                        width: 200,
                    },
                } as const;
                const c = colorMap[detail.type];
                const posX = xMap[detail.type];
                const sourcePosition =
                    detail.type === "course_content"
                        ? Position.Right
                        : detail.type === "course_outcome"
                        ? Position.Right
                        : Position.Left;
                const targetPosition =
                    detail.type === "course_content"
                        ? Position.Right
                        : Position.Left;
                const newNode: Node = {
                    id: `${detail.type}-${detail.id}`,
                    position: { x: posX, y },
                    data: { label: detail.name, apiId: detail.id },
                    type: "graphnode",
                    draggable: false,
                    sourcePosition,
                    targetPosition,
                    style: {
                        background: c.bg,
                        border: `2px solid ${c.border}`,
                        borderRadius: "8px",
                        padding: "10px",
                        fontSize: "12px",
                        width: c.width,
                    },
                };
                return [...prev, newNode];
            });
        };
        window.addEventListener("giraph:new-node", handler as EventListener);
        return () => {
            window.removeEventListener(
                "giraph:new-node",
                handler as EventListener
            );
        };
    }, []);

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        // Filter out position changes to prevent node movement
        const filteredChanges = changes.filter(
            (change) => change.type !== "position"
        );
        setNodes((nodesSnapshot) =>
            applyNodeChanges(filteredChanges, nodesSnapshot)
        );
    }, []);

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            // Handle edge deletions by calling API
            changes.forEach((change) => {
                if (change.type === "remove") {
                    const edge = edges.find((e) => e.id === change.id);
                    if (edge?.data?.relationId) {
                        const relationId = edge.data.relationId as number;
                        deleteRelation(relationId)
                            .then(() => {
                                console.log(`Relation ${relationId} deleted`);
                            })
                            .catch((error) => {
                                console.error(
                                    `Failed to delete relation: ${error.message}`
                                );
                                alert(
                                    `Failed to delete relation: ${error.message}`
                                );
                            });
                    }
                }
            });

            setEdges((edgesSnapshot) =>
                applyEdgeChanges(changes, edgesSnapshot)
            );
        },
        [edges]
    );

    const onConnect = useCallback(
        (params: Connection) => {
            // Only add edge if it maintains bipartite structure
            if (isValidConnection(params)) {
                // Prevent duplicate edges between same source and target
                if (
                    edges.some(
                        (e) =>
                            e.source === params.source &&
                            e.target === params.target
                    )
                ) {
                    // Silently ignore duplicates
                    return;
                }
                setModalMode("create");
                setPendingConnection(params);
                setWeightValue(1);
                setWeightModalOpen(true);
            }
        },
        [nodes, edges]
    );

    const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
        // Open modal to edit existing weight
        setModalMode("edit");
        setEditingEdge(edge);
        const currentWeight = (edge.data as { weight?: number })?.weight;
        const parsed =
            typeof currentWeight === "number"
                ? currentWeight
                : parseInt((edge.label as string) || "", 10);
        setWeightValue(
            Number.isFinite(parsed) && parsed >= 1 && parsed <= 5 ? parsed : 1
        );
        setWeightModalOpen(true);
    }, []);

    const closeModal = () => {
        setWeightModalOpen(false);
        setPendingConnection(null);
        setEditingEdge(null);
        setSaving(false);
    };

    const deleteCurrentEdge = async () => {
        if (!editingEdge) return;

        const relationId = (editingEdge.data as { relationId?: number })
            ?.relationId;
        if (!relationId) {
            setEdges((prev) => prev.filter((e) => e.id !== editingEdge.id));
            closeModal();
            return;
        }

        setSaving(true);
        try {
            await deleteRelation(relationId);
            setEdges((prev) => prev.filter((e) => e.id !== editingEdge.id));
            closeModal();
        } catch (error) {
            console.error("Failed to delete relation:", error);
            setModalError("Failed to delete relation");
        } finally {
            setSaving(false);
        }
    };

    const submitWeight = async () => {
        setModalError(null);
        if (weightValue === "" || weightValue < 1 || weightValue > 5) {
            setModalError("Weight must be between 1 and 5");
            return;
        }
        try {
            setSaving(true);
            if (modalMode === "create" && pendingConnection) {
                const params = pendingConnection;
                // Double-check duplicates before creating, to avoid race conditions
                if (
                    params.source &&
                    params.target &&
                    edges.some(
                        (e) =>
                            e.source === params.source &&
                            e.target === params.target
                    )
                ) {
                    // Silently close modal on duplicate to avoid user-facing messages
                    setSaving(false);
                    closeModal();
                    return;
                }
                const sourceNode = nodes.find((n) => n.id === params.source);
                const targetNode = nodes.find((n) => n.id === params.target);
                if (!sourceNode || !targetNode) {
                    alert("Invalid nodes selected");
                    return;
                }
                const node1_id = sourceNode.data.apiId as number;
                const node2_id = targetNode.data.apiId as number;

                const response = await createRelation(
                    node1_id,
                    node2_id,
                    weightValue
                );
                const sourceLayer = getNodeLayer(params.source!);
                const edgeColor =
                    sourceLayer === "course_content" ? "#1976d2" : "#388e3c";
                setEdges((edgesSnapshot) =>
                    addEdge(
                        {
                            ...params,
                            id: `e-${response.relation_id}`,
                            label: String(weightValue),
                            animated: true,
                            style: {
                                stroke: edgeColor,
                                strokeWidth: 2,
                            },
                            labelStyle: {
                                fill: edgeColor,
                                fontWeight: 700,
                                fontSize: 14,
                            },
                            labelBgStyle: {
                                fill: "white",
                                fillOpacity: 0.9,
                            },
                            data: {
                                relationId: response.relation_id,
                                weight: weightValue,
                            },
                        },
                        edgesSnapshot
                    )
                );
                closeModal();
            } else if (modalMode === "edit" && editingEdge) {
                const relationId = (editingEdge.data as { relationId?: number })
                    ?.relationId;
                if (!relationId) {
                    setModalError("Missing relation id");
                    return;
                }
                // Optimistic UI update
                setEdges((prev) =>
                    prev.map((e) =>
                        e.id === editingEdge.id
                            ? {
                                  ...e,
                                  label: String(weightValue),
                                  data: {
                                      ...(e.data || {}),
                                      weight: weightValue,
                                  },
                              }
                            : e
                    )
                );
                try {
                    await updateRelation(relationId, weightValue);
                } catch (err: unknown) {
                    // Revert on error
                    setEdges((prev) =>
                        prev.map((e) =>
                            e.id === editingEdge.id
                                ? {
                                      ...e,
                                      label: String(
                                          (
                                              editingEdge.data as {
                                                  weight?: number;
                                              }
                                          )?.weight ?? editingEdge.label
                                      ),
                                      data: {
                                          ...(e.data || {}),
                                          weight: (
                                              editingEdge.data as {
                                                  weight?: number;
                                              }
                                          )?.weight,
                                      },
                                  }
                                : e
                        )
                    );
                    const msg =
                        err instanceof Error ? err.message : "Unknown error";
                    setModalError(`Failed to update relation: ${msg}`);
                    setSaving(false);
                    return;
                }
                closeModal();
            }
        } finally {
            setSaving(false);
        }
    };

    // Handlers for node edit/delete from GraphNode
    const handleNodeEdit = (apiId: number, currentName: string) => {
        // RBAC Check: Lecturers cannot edit Program Outcomes
        const node = nodes.find(
            (n) => (n.data as { apiId: number }).apiId === apiId
        );
        if (node?.id.startsWith("program_outcome") && user?.role !== "head") {
            alert("Only Department Head can edit Program Outcomes");
            return;
        }

        setEditingNodeId(apiId);
        setEditingNodeName(currentName);
        setNewNodeName(currentName);
        setModalError(null);
        setNodeEditModalOpen(true);
    };

    const handleNodeDelete = (apiId: number, currentName: string) => {
        // RBAC Check: Lecturers cannot delete Program Outcomes
        const node = nodes.find(
            (n) => (n.data as { apiId: number }).apiId === apiId
        );
        if (node?.id.startsWith("program_outcome") && user?.role !== "head") {
            alert("Only Department Head can delete Program Outcomes");
            return;
        }

        setEditingNodeId(apiId);
        setEditingNodeName(currentName);
        setModalError(null);
        setNodeDeleteModalOpen(true);
    };

    const submitNodeRename = async () => {
        if (!editingNodeId) return;
        setModalError(null);
        const trimmed = newNodeName.trim();
        if (!trimmed) {
            setModalError("Name cannot be empty");
            return;
        }
        if (trimmed.length > NAME_MAX) {
            setModalError(`Name must be at most ${NAME_MAX} characters`);
            return;
        }
        setSaving(true);
        // Optimistic update of nodes list
        const prevNodes = nodes;
        setNodes((prev) =>
            prev.map((n) =>
                (n.data as { apiId: number }).apiId === editingNodeId
                    ? { ...n, data: { ...n.data, label: trimmed } }
                    : n
            )
        );
        try {
            // Mock call (not yet implemented server side) - updateNode
            const { updateNode } = await import("./apiClient");
            await updateNode(editingNodeId, trimmed);
            setNodeEditModalOpen(false);
        } catch (e: unknown) {
            // Revert
            setNodes(prevNodes);
            const msg = e instanceof Error ? e.message : "Unknown error";
            setModalError(`Failed to rename node: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const submitNodeDelete = async () => {
        if (!editingNodeId) return;
        setModalError(null);
        setSaving(true);
        const prevNodes = nodes;
        const prevEdges = edges;
        // Optimistically remove node and any edges referencing it
        setNodes((prev) =>
            prev.filter(
                (n) => (n.data as { apiId: number }).apiId !== editingNodeId
            )
        );
        setEdges((prev) =>
            prev.filter(
                (e) =>
                    (
                        nodes.find((n) => n.id === e.source)?.data as {
                            apiId: number;
                        }
                    )?.apiId !== editingNodeId &&
                    (
                        nodes.find((n) => n.id === e.target)?.data as {
                            apiId: number;
                        }
                    )?.apiId !== editingNodeId
            )
        );
        try {
            const { deleteNode } = await import("./apiClient");
            await deleteNode(editingNodeId);
            setNodeDeleteModalOpen(false);
        } catch (e: unknown) {
            // Revert
            setNodes(prevNodes);
            setEdges(prevEdges);
            const msg = e instanceof Error ? e.message : "Unknown error";
            setModalError(`Failed to delete node: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    // Derive styled nodes/edges based on selection
    const { displayNodes, displayEdges } = useMemo(() => {
        if (!selectedNodeId)
            return { displayNodes: nodes, displayEdges: edges };

        const selectedLayer = getNodeLayer(selectedNodeId);
        const connectedEdgeIds = new Set<string>();
        const connectedNodeIds = new Set<string>([selectedNodeId]);

        // Build quick lookups
        const bySource = new Map<string, Edge[]>();
        const byTarget = new Map<string, Edge[]>();
        for (const e of edges) {
            if (!bySource.has(e.source)) bySource.set(e.source, []);
            if (!byTarget.has(e.target)) byTarget.set(e.target, []);
            bySource.get(e.source)!.push(e);
            byTarget.get(e.target)!.push(e);
        }

        if (selectedLayer === "course_content") {
            // cc -> co
            const toCo = bySource.get(selectedNodeId) || [];
            const coIds: string[] = [];
            for (const e of toCo) {
                connectedEdgeIds.add(e.id);
                connectedNodeIds.add(e.target);
                coIds.push(e.target);
            }
            // co -> po
            for (const coId of coIds) {
                const toPo = bySource.get(coId) || [];
                for (const e of toPo) {
                    connectedEdgeIds.add(e.id);
                    connectedNodeIds.add(e.target);
                }
            }
        } else if (selectedLayer === "course_outcome") {
            // co -> po
            const toPo = bySource.get(selectedNodeId) || [];
            for (const e of toPo) {
                connectedEdgeIds.add(e.id);
                connectedNodeIds.add(e.target);
            }
            // cc -> co (incoming)
            const fromCc = byTarget.get(selectedNodeId) || [];
            for (const e of fromCc) {
                connectedEdgeIds.add(e.id);
                connectedNodeIds.add(e.source);
            }
        } else if (selectedLayer === "program_outcome") {
            // co -> po (incoming)
            const fromCo = byTarget.get(selectedNodeId) || [];
            const coIds: string[] = [];
            for (const e of fromCo) {
                connectedEdgeIds.add(e.id);
                connectedNodeIds.add(e.source);
                coIds.push(e.source);
            }
            // cc -> co (incoming to those co)
            for (const coId of coIds) {
                const fromCc = byTarget.get(coId) || [];
                for (const e of fromCc) {
                    connectedEdgeIds.add(e.id);
                    connectedNodeIds.add(e.source);
                }
            }
        }

        const fadedOpacity = 0.25;

        const displayNodes = nodes.map((n) => {
            const isConnected = connectedNodeIds.has(n.id);
            const isSelected = n.id === selectedNodeId;
            return {
                ...n,
                style: {
                    ...(n.style || {}),
                    opacity: isConnected ? 1 : fadedOpacity,
                    transition:
                        "opacity 200ms ease, box-shadow 200ms ease, border-color 200ms ease",
                    boxShadow: isSelected
                        ? "0 0 0 4px rgba(255,165,0,0.4)"
                        : (n.style as React.CSSProperties)?.boxShadow,
                    border: isSelected
                        ? "2px solid #ff9800"
                        : (n.style as React.CSSProperties)?.border,
                },
            } as Node;
        });

        const displayEdges = edges.map((e) => {
            const isConnected = connectedEdgeIds.has(e.id);
            return {
                ...e,
                style: {
                    ...(e.style || {}),
                    opacity: isConnected ? 1 : fadedOpacity,
                    transition: "opacity 200ms ease",
                },
                labelStyle: {
                    ...(e.labelStyle || {}),
                    opacity: isConnected ? 1 : fadedOpacity,
                    transition: "opacity 200ms ease",
                },
            } as Edge;
        });

        return { displayNodes, displayEdges };
    }, [nodes, edges, selectedNodeId]);

    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                position: "absolute",
                top: 0,
                left: 0,
            }}
            className="bg-neutral-50"
        >
            {loading ? (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                    }}
                >
                    Loading graph data...
                </div>
            ) : (
                <ReactFlow
                    nodes={displayNodes}
                    edges={displayEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={createNodeTypes(
                        handleNodeEdit,
                        handleNodeDelete
                    )}
                    onConnect={onConnect}
                    onEdgeClick={onEdgeClick}
                    onNodeClick={(_, n) =>
                        setSelectedNodeId((prev) =>
                            prev === n.id ? null : n.id
                        )
                    }
                    onPaneClick={() => setSelectedNodeId(null)}
                    nodesDraggable={false}
                    elementsSelectable={true}
                    panOnScroll={false}
                    zoomOnPinch={false}
                    zoomOnDoubleClick={false}
                    preventScrolling={true}
                    proOptions={{ hideAttribution: true }}
                    fitView
                >
                    <Background />
                    <Controls />
                    <MiniMap />
                </ReactFlow>
            )}
            <Modal
                opened={weightModalOpen}
                onClose={closeModal}
                title={
                    modalMode === "create"
                        ? "Set edge weight"
                        : "Edit edge weight"
                }
                centered
            >
                <div className="space-y-4">
                    <Text size="sm" c="dimmed">
                        Choose a weight from 1 (weak) to 5 (strong).
                    </Text>
                    {modalError && (
                        <Text c="red" size="sm">
                            {modalError}
                        </Text>
                    )}
                    <NumberInput
                        label="Weight"
                        min={1}
                        max={5}
                        clampBehavior="strict"
                        value={weightValue}
                        onChange={(val) => {
                            if (val === "" || typeof val === "number") {
                                setWeightValue(val);
                            } else {
                                const n = parseInt(String(val), 10);
                                setWeightValue(Number.isFinite(n) ? n : "");
                            }
                        }}
                        data-autofocus
                    />
                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="default"
                            onClick={closeModal}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        {modalMode === "edit" && (
                            <Button
                                color="red"
                                variant="light"
                                onClick={deleteCurrentEdge}
                                disabled={saving}
                            >
                                Delete
                            </Button>
                        )}
                        <Button onClick={submitWeight} loading={saving}>
                            {modalMode === "create" ? "Create" : "Save"}
                        </Button>
                    </Group>
                </div>
            </Modal>
            <Modal
                opened={nodeEditModalOpen}
                onClose={() => setNodeEditModalOpen(false)}
                title="Rename node"
                centered
            >
                <div className="space-y-4">
                    <Text size="sm" c="dimmed">
                        Editing: {editingNodeName}
                    </Text>
                    {modalError && (
                        <Text c="red" size="sm">
                            {modalError}
                        </Text>
                    )}
                    <TextInput
                        label={`Name (max ${NAME_MAX} chars)`}
                        value={newNodeName}
                        onChange={(e) => setNewNodeName(e.currentTarget.value)}
                        maxLength={NAME_MAX}
                        placeholder="New name"
                        autoFocus
                        rightSection={
                            <Text
                                size="xs"
                                c="dimmed"
                            >{`${newNodeName.length}/${NAME_MAX}`}</Text>
                        }
                    />
                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="default"
                            onClick={() => setNodeEditModalOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={submitNodeRename} loading={saving}>
                            Save
                        </Button>
                    </Group>
                </div>
            </Modal>
            <Modal
                opened={nodeDeleteModalOpen}
                onClose={() => setNodeDeleteModalOpen(false)}
                title="Delete node"
                centered
            >
                <div className="space-y-4">
                    {modalError && (
                        <Text c="red" size="sm">
                            {modalError}
                        </Text>
                    )}
                    <Text>
                        Are you sure you want to delete &quot;{editingNodeName}
                        &quot;? This will remove related edges.
                    </Text>
                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="default"
                            onClick={() => setNodeDeleteModalOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            color="red"
                            onClick={submitNodeDelete}
                            loading={saving}
                        >
                            Delete
                        </Button>
                    </Group>
                </div>
            </Modal>
        </div>
    );
}
