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
    Position,
    ReactFlow,
    addEdge,
    useEdgesState,
    useNodesState,
    type Connection,
    type Edge,
    type Node,
    type NodeProps
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    deleteNode as apiDeleteNode,
    updateNode as apiUpdateNode,
    calculateStudentResults,
    createRelation,
    deleteRelation,
    getNodes,
    updateRelation,
    type GetNodesResponse,
} from "./apiClient";
import GraphNode from "./GraphNode";

type AppNode = Node<{ label: string; apiId: number; score?: number }>;

const DISTINCT_COLORS = [
    "#1976d2", "#388e3c", "#d32f2f", "#7b1fa2", "#0288d1", 
    "#fbc02d", "#e64a19", "#5d4037", "#455a64", "#0097a7", 
    "#c2185b", "#512da8", "#303f9f", "#00796b", "#689f38", 
    "#afb42b", "#f57c00", "#795548", "#607d8b"
];

const createNodeTypes = (
    onEdit: (apiId: number, currentName: string) => void,
    onDelete: (apiId: number, currentName: string) => void
) => ({
    graphnode: (props: NodeProps<AppNode>) => (
        <GraphNode {...props} onEdit={onEdit} onDelete={onDelete} />
    ),
});

const convertToNodes = (
    data: GetNodesResponse,
    studentResults?: any
): Node[] => {
    // 1. Calculate scores for all nodes first
    const calculatedScores = new Map<string, number>();
    let hasAnyNonZeroScore = false;

    // Helper to process score
    const regScore = (key: string, score: number | undefined | null) => {
        if (score !== undefined && score !== null) {
            const val = typeof score === 'string' ? parseFloat(score) : score;
            calculatedScores.set(key, val);
            if (val > 0) hasAnyNonZeroScore = true;
        }
    };

    data.course_contents.forEach((node) => {
        let score: number | undefined;
        if (studentResults && studentResults.course_contents) {
             const match = studentResults.course_contents.find((c: any) => c.id === node.id);
             if (match) score = match.student_grade;
        } else if (node.score !== undefined && node.score !== null) {
             score = node.score;
        }
        regScore(`cc-${node.id}`, score);
    });

    data.course_outcomes.forEach((node) => {
        let score: number | undefined;
        if (studentResults && studentResults.learning_outcomes) {
             const match = studentResults.learning_outcomes.find((c: any) => c.id === node.id);
             if (match) score = match.calculated_score;
        }
        regScore(`co-${node.id}`, score);
    });

    data.program_outcomes.forEach((node) => {
        let score: number | undefined;
        if (studentResults && studentResults.program_outcomes) {
             const match = studentResults.program_outcomes.find((c: any) => c.id === node.id);
             if (match) score = match.calculated_score;
        }
        regScore(`po-${node.id}`, score);
    });

    const nodes: Node[] = [];
    let yOffset = 100;

    // Course Content
    data.course_contents.forEach((node, index) => {
        let score = calculatedScores.get(`cc-${node.id}`);
        // If all scores are zero, hide them (pass undefined)
        if (!hasAnyNonZeroScore) score = undefined;

        nodes.push({
            id: `cc-${node.id}`,
            type: "graphnode",
            position: { x: 50, y: yOffset + index * 120 },
            draggable: false,
            // Course Content: source (outgoing) handles on the right
            sourcePosition: Position.Right,
            data: { label: node.name, apiId: node.id, score },
            style: {
                background: "#e3f2fd",
                border: "2px solid #1976d2",
                borderRadius: "8px",
                padding: "10px",
                minWidth: "150px",
            },
        });
    });

    // Course Outcomes
    yOffset = 80;
    data.course_outcomes.forEach((node, index) => {
        let score = calculatedScores.get(`co-${node.id}`);
        if (!hasAnyNonZeroScore) score = undefined;

        nodes.push({
            id: `co-${node.id}`,
            type: "graphnode",
            position: { x: 500, y: yOffset + index * 120 },
            draggable: false,
            // Course Outcome: accept incoming on left and provide outgoing on right
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            data: { label: node.name, apiId: node.id, score },
            style: {
                background: "#f3e5f5",
                border: "2px solid #7b1fa2",
                borderRadius: "8px",
                padding: "10px",
                minWidth: "150px",
            },
        });
    });

    // Program Outcomes
    yOffset = 100;
    data.program_outcomes.forEach((node, index) => {
        let score = calculatedScores.get(`po-${node.id}`);
        if (!hasAnyNonZeroScore) score = undefined;

        nodes.push({
            id: `po-${node.id}`,
            type: "graphnode",
            position: { x: 950, y: yOffset + index * 120 },
            draggable: false,
            // Program Outcome: only accept incoming connections (from CO)
            targetPosition: Position.Left,
            data: { label: node.name, apiId: node.id, score },
            style: {
                background: "#fff3e0",
                border: "2px solid #f57c00",
                borderRadius: "8px",
                padding: "10px",
                minWidth: "150px",
            },
        });
    });

    return nodes;
};

// Helper functions for geometric overlap detection
const getMidpoint = (p1: {x:number, y:number}, p2: {x:number, y:number}) => {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
};

const dist = (p1: {x:number, y:number}, p2: {x:number, y:number}) => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// Helper function to convert API relations to React Flow edges
const convertToEdges = (data: GetNodesResponse, nodes: Node[]): Edge[] => {
    const edges: Edge[] = [];
    const processedRelations = new Set<number>();

    // Need map of node positions for clustering
    const nodePosMap = new Map<string, {x:number, y:number}>();
    nodes.forEach(n => nodePosMap.set(n.id, n.position));

    // Group edges by layer for coloring
    const ccEdges: any[] = [];
    const coEdges: any[] = [];
    
    // Preliminary edge collection
    const allNodes = [
        ...data.course_contents, 
        ...data.course_outcomes, 
        ...data.program_outcomes
    ];

    allNodes.forEach((node) => {
        node.relations.forEach((rel) => {
            if (processedRelations.has(rel.relation_id)) return;
            processedRelations.add(rel.relation_id);

            const sourcePrefix = getLayerPrefix(rel.node1_id, data);
            const targetPrefix = getLayerPrefix(rel.node2_id, data);
            if (sourcePrefix && targetPrefix) {
                const srcId = `${sourcePrefix}-${rel.node1_id}`;
                const tgtId = `${targetPrefix}-${rel.node2_id}`;

                const edgeObj = {
                    id: `e-${rel.relation_id}`,
                    source: srcId,
                    target: tgtId,
                    weight: rel.weight,
                    relationId: rel.relation_id
                };
                if (sourcePrefix === 'cc') ccEdges.push(edgeObj);
                else coEdges.push(edgeObj);
            }
        });
    });

    const processLayer = (layerEdges: any[], colorOffset: number) => {
        // 1. Assign colors
        layerEdges.forEach((e, i) => {
            e.color = DISTINCT_COLORS[(i + colorOffset) % DISTINCT_COLORS.length];
        });

        // 2. Detect overlaps
        // Map edge ID -> midpoint
        const midpoints = new Map<string, {x:number, y:number}>();
        layerEdges.forEach(e => {
            const p1 = nodePosMap.get(e.source);
            const p2 = nodePosMap.get(e.target);
            if (p1 && p2) {
                midpoints.set(e.id, getMidpoint(p1, p2));
            }
        });

        // Cluster edges
        const clusters: string[][] = [];
        const assigned = new Set<string>();
        const OVERLAP_THRESHOLD = 30; // pixels

        layerEdges.forEach(e => {
            if (assigned.has(e.id)) return;
            const mp = midpoints.get(e.id);
            if (!mp) {
                clusters.push([e.id]);
                assigned.add(e.id);
                return;
            }

            const cluster = [e.id];
            assigned.add(e.id);

            // Find overlapping neighbors
            layerEdges.forEach(other => {
                if (assigned.has(other.id)) return;
                const mpOther = midpoints.get(other.id);
                if (mpOther && dist(mp, mpOther) < OVERLAP_THRESHOLD) {
                    cluster.push(other.id);
                    assigned.add(other.id);
                }
            });
            clusters.push(cluster);
        });

        // Build edges
        clusters.forEach(cluster => {
             if (cluster.length === 1) {
                 const eDef = layerEdges.find(le => le.id === cluster[0]);
                 edges.push(createEdge(eDef, eDef.color));
             } else {
                 // Multiple edges overlap
                 const leaderId = cluster[0];
                 
                 const clusterLabel = cluster.map(id => {
                    const e = layerEdges.find(le => le.id === id);
                    return e ? e.weight : '';
                 }).join(", ");

                 cluster.forEach((edgeId, idx) => {
                     const eDef = layerEdges.find(le => le.id === edgeId);
                     const isLeader = idx === 0;
                     
                     edges.push({
                         ...createEdge(eDef, eDef.color),
                         label: isLeader ? clusterLabel : "", // Only leader shows label
                         zIndex: isLeader ? 100 : 1, // Leader on top
                         style: { 
                             stroke: eDef.color, 
                             strokeWidth: 2,
                         },
                         labelStyle: isLeader ? { 
                            fill: "black", fontWeight: 900, fontSize: 14 
                         } : { fill: "transparent" }, // Label style tweak
                         data: { 
                             relationId: eDef.relationId, 
                             weight: eDef.weight,
                             isGroup: true,
                             groupMembers: cluster // Store all IDs in group
                         }
                     });
                 });
             }
        });
    };

    const createEdge = (def: any, color: string): Edge => ({
        id: def.id,
        source: def.source,
        target: def.target,
        label: `${def.weight}`,
        data: { relationId: def.relationId, weight: def.weight },
        animated: true,
        style: {
            stroke: color,
            strokeWidth: 2,
        },
        labelStyle: {
            fill: color,
            fontWeight: 700,
            fontSize: 14,
        },
        labelBgStyle: {
            fill: "white",
            fillOpacity: 0.9,
        },
    });

    processLayer(ccEdges, 0);
    processLayer(coEdges, 5); // Offset colors for variety

    return edges;
};

// Helper to get layer prefix from node ID
const getLayerPrefix = (nodeId: number, data: GetNodesResponse): string => {
    if (data.course_contents.find((n) => n.id === nodeId)) return "cc";
    if (data.course_outcomes.find((n) => n.id === nodeId)) return "co";
    if (data.program_outcomes.find((n) => n.id === nodeId)) return "po";
    return "";
};

// Helper function to determine node layer
const getNodeLayer = (
    nodeId: string
): "course_content" | "course_outcome" | "program_outcome" | null => {
    if (nodeId.startsWith("cc-")) return "course_content";
    if (nodeId.startsWith("co-")) return "course_outcome";
    if (nodeId.startsWith("po-")) return "program_outcome";
    return null;
};

// Validate connection to maintain bipartite structure
const isValidConnection = (connection: Connection): boolean => {
    const sourceLayer = getNodeLayer(connection.source);
    const targetLayer = getNodeLayer(connection.target);

    if (!sourceLayer || !targetLayer) return false;

    // Only allow cc -> co or co -> po connections
    if (sourceLayer === "course_content" && targetLayer === "course_outcome")
        return true;
    if (sourceLayer === "course_outcome" && targetLayer === "program_outcome")
        return true;

    return false;
};

export default function MainGraph() {
    const searchParams = useSearchParams();
    const courseId = searchParams.get("courseId");

    const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Keep last loaded API data so UI can re-render with student results
    const lastLoadedDataRef = useRef<GetNodesResponse | null>(null);
    const [studentResults, setStudentResults] = useState<any | null>(null);

    // Weight modal state
    const [weightModalOpen, setWeightModalOpen] = useState(false);
    const [weightValue, setWeightValue] = useState<number | "">(3);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [pendingConnection, setPendingConnection] =
        useState<Connection | null>(null);
    const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
    const [saving, setSaving] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Node edit modal state
    const [nodeEditModalOpen, setNodeEditModalOpen] = useState(false);
    const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
    const [editingNodeName, setEditingNodeName] = useState("");
    const [newNodeName, setNewNodeName] = useState("");
    const NAME_MAX = 60;

    // Node delete modal state
    const [nodeDeleteModalOpen, setNodeDeleteModalOpen] = useState(false);

    // Load graph data whenever courseId changes
    useEffect(() => {
        const loadGraph = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getNodes(courseId || undefined);
                // Keep last loaded data for future re-render with student results
                lastLoadedDataRef.current = data;

                // Initial render without student-specific values (we'll fetch them next)
                const newNodes = convertToNodes(data, studentResults);
                const newEdges = convertToEdges(data, newNodes);

                setNodes(newNodes);
                setEdges(newEdges);

                // Determine studentId: prefer localStorage, fallback to a hardcoded temporary id
                const studentId =
                    typeof localStorage !== "undefined"
                        ? localStorage.getItem("selectedStudentId") ||
                          "221401005"
                        : "221401005";

                try {
                    const sr = await calculateStudentResults(
                        studentId,
                        courseId || undefined
                    );
                    setStudentResults(sr);
                    // Rebuild nodes with student results applied
                    const nodesWithStudent = convertToNodes(data, sr);
                    setNodes(nodesWithStudent);
                // Rebuild edges with nodes (for positions)
                setEdges(convertToEdges(data, nodesWithStudent));
            } catch (err) {
                // If student results fetch fails, log but keep showing the base graph
                console.error("Failed to fetch student results:", err);
            }
        } catch (err) {
            setError("Failed to load graph data");
            console.error("Error loading graph:", err);
        } finally {
            setLoading(false);
        }
    };

    loadGraph();

    // Listen for external events and reload or update
    const onScoresUpdated = () => loadGraph();
    const onStudentResultsUpdated = async (e: Event) => {
        const detail = (e as CustomEvent).detail;
        setStudentResults(detail);

        // Re-render nodes to include student values. If we don't have last loaded data,
        // fetch nodes first, otherwise reuse cached data.
        try {
            let data = lastLoadedDataRef.current;
            if (!data) {
                data = await getNodes(courseId || undefined);
                lastLoadedDataRef.current = data;
            }
            const newNodes = convertToNodes(data, detail);
            setNodes(newNodes);
            // Rebuild edges to ensure positions and overlays are consistent
            setEdges(convertToEdges(data, newNodes));
        } catch (err) {
            console.error("Failed to apply student results to nodes", err);
        }
    };

    window.addEventListener("scoresUpdated", onScoresUpdated);
    window.addEventListener(
        "studentResultsUpdated",
        onStudentResultsUpdated as EventListener
    );
    return () => {
        window.removeEventListener("scoresUpdated", onScoresUpdated);
        window.removeEventListener(
            "studentResultsUpdated",
            onStudentResultsUpdated as EventListener
        );
    };
}, [courseId, setNodes, setEdges]);

    // Close weight modal
    const closeWeightModal = () => {
        setWeightModalOpen(false);
        setPendingConnection(null);
        setEditingEdge(null);
        setSaving(false);
        setModalError(null);
    };

    // Handle new connection - open modal instead of prompt
    const onConnect = useCallback(
        (connection: Connection) => {
            if (!isValidConnection(connection)) {
                setModalError(
                    "Only course content → course outcome or course outcome → program outcome connections are allowed."
                );
                return;
            }

            // Check for duplicate
            if (
                edges.some(
                    (e) =>
                        e.source === connection.source &&
                        e.target === connection.target
                )
            ) {
                return;
            }

            setModalMode("create");
            setPendingConnection(connection);
            setWeightValue(3);
            setModalError(null);
            setWeightModalOpen(true);
        },
        [edges]
    );

    // Handle edge click - open modal to edit
    const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
        // Handle grouped edges
        if (edge.data?.isGroup && Array.isArray(edge.data.groupMembers) && edge.data.groupMembers.length > 0) {
            setGroupedEdgesList(edge.data.groupMembers as string[]);
            setGroupModalOpen(true);
            return;
        }

        setModalMode("edit");
        setEditingEdge(edge);
        const currentWeight = (edge.data as { weight?: number })?.weight;
        setWeightValue(typeof currentWeight === "number" ? currentWeight : 3);
        setModalError(null);
        setWeightModalOpen(true);
    }, []);

    // Group Modal State
    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [groupedEdgesList, setGroupedEdgesList] = useState<string[]>([]);


    // Submit weight (create or edit)
    const submitWeight = async () => {
        setModalError(null);
        if (weightValue === "" || weightValue < 1 || weightValue > 5) {
            setModalError("Weight must be between 1 and 5");
            return;
        }

        setSaving(true);
        try {
            if (modalMode === "create" && pendingConnection) {
                const sourceId = parseInt(
                    pendingConnection.source.split("-")[1]
                );
                const targetId = parseInt(
                    pendingConnection.target.split("-")[1]
                );

                const response = await createRelation(
                    sourceId,
                    targetId,
                    weightValue
                );

                const sourceLayer = getNodeLayer(pendingConnection.source);
                const edgeColor =
                    sourceLayer === "course_content" ? "#1976d2" : "#388e3c";

                const newEdge: Edge = {
                    id: `e-${response.relation_id}`,
                    source: pendingConnection.source,
                    target: pendingConnection.target,
                    label: `${weightValue}`,
                    data: {
                        relationId: response.relation_id,
                        weight: weightValue,
                    },
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
                };

                setEdges((eds) => addEdge(newEdge, eds));
                closeWeightModal();
            } else if (modalMode === "edit" && editingEdge) {
                const relationId = (editingEdge.data as { relationId?: number })
                    ?.relationId;
                if (!relationId) {
                    setModalError("Missing relation ID");
                    return;
                }

                await updateRelation(relationId, weightValue);

                setEdges((prev) =>
                    prev.map((e) =>
                        e.id === editingEdge.id
                            ? {
                                  ...e,
                                  label: `${weightValue}`,
                                  data: { ...e.data, weight: weightValue },
                              }
                            : e
                    )
                );

                closeWeightModal();
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            setModalError(`Failed: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    // Delete current edge
    const deleteCurrentEdge = async () => {
        if (!editingEdge) return;

        const relationId = (editingEdge.data as { relationId?: number })
            ?.relationId;
        if (!relationId) {
            setEdges((prev) => prev.filter((e) => e.id !== editingEdge.id));
            closeWeightModal();
            return;
        }

        setSaving(true);
        try {
            await deleteRelation(relationId);
            setEdges((prev) => prev.filter((e) => e.id !== editingEdge.id));
            closeWeightModal();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            setModalError(`Failed to delete: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    // Handle node edit - open modal
    const handleEditNode = useCallback((apiId: number, currentName: string) => {
        setEditingNodeId(apiId);
        setEditingNodeName(currentName);
        setNewNodeName(currentName);
        setModalError(null);
        setNodeEditModalOpen(true);
    }, []);

    // Submit node rename
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
        try {
            await apiUpdateNode(editingNodeId, trimmed);
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.data?.apiId === editingNodeId) {
                        return {
                            ...node,
                            data: { ...node.data, label: trimmed },
                        } as Node;
                    }
                    return node;
                })
            );
            setNodeEditModalOpen(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            setModalError(`Failed to rename: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    // Helper to open edit for a specific edge from the group list
    const editGroupedEdge = useCallback((edgeId: string) => {
         const edge = edges.find(e => e.id === edgeId);
         if (edge) {
             setGroupModalOpen(false);
             setModalMode("edit");
             setEditingEdge(edge);
             const currentWeight = (edge.data as { weight?: number })?.weight;
             setWeightValue(typeof currentWeight === "number" ? currentWeight : 3);
             setModalError(null);
             setWeightModalOpen(true);
         }
    }, [edges]);

    const getGroupedEdgeInfo = (edgeId: string) => {
        const edge = edges.find(e => e.id === edgeId);
        if (!edge) return { source: "Unknown", target: "Unknown", weight: 0, color: '#000' };
        
        // Find source and target node names
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        return {
            source: String(sourceNode?.data.label || "Unknown"),
            target: String(targetNode?.data.label || "Unknown"),
            weight: Number((edge.data as any)?.weight || 0),
            color: (edge.style?.stroke as string) || '#000'
        };
    };

    // Handle node delete - open modal
    const handleDeleteNode = useCallback(
        (apiId: number, currentName: string) => {
            setEditingNodeId(apiId);
            setEditingNodeName(currentName);
            setModalError(null);
            setNodeDeleteModalOpen(true);
        },
        []
    );

    // Submit node delete
    const submitNodeDelete = async () => {
        if (!editingNodeId) return;
        setModalError(null);

        setSaving(true);
        try {
            await apiDeleteNode(editingNodeId);
            setNodes((nds) =>
                nds.filter((n) => n.data.apiId !== editingNodeId)
            );
            setEdges((eds) =>
                eds.filter(
                    (e) =>
                        !e.source.includes(`-${editingNodeId}`) &&
                        !e.target.includes(`-${editingNodeId}`)
                )
            );
            setNodeDeleteModalOpen(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            setModalError(`Failed to delete: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const nodeTypes = useMemo(
        () => createNodeTypes(handleEditNode, handleDeleteNode),
        [handleEditNode, handleDeleteNode]
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p>Loading graph...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    return (
        <>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeClick={onEdgeClick}
                nodeTypes={nodeTypes}
                proOptions={{ hideAttribution: true }}
                fitView
                fitViewOptions={{ padding: 0.2 }}
            >
                <Background />
                <Controls />
            </ReactFlow>

            {/* Weight Modal */}
            <Modal
                opened={groupModalOpen}
                onClose={() => setGroupModalOpen(false)}
                title="Overlapping Edges"
                centered
                size="md"
            >
                <Text size="sm" mb="md" c="dimmed">
                    Select an edge to edit its weight:
                </Text>
                <div className="space-y-2">
                    {groupedEdgesList.map(edgeId => {
                        const info = getGroupedEdgeInfo(edgeId);
                        return (
                            <div 
                                key={edgeId} 
                                className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 flex justify-between items-center`}
                                style={{ borderLeft: `4px solid ${info.color}` }}
                                onClick={() => editGroupedEdge(edgeId)}
                            >
                                <div>
                                    <div className="text-sm font-semibold">{info.source} → {info.target}</div>
                                </div>
                                <div className="font-bold bg-gray-200 px-2 py-1 rounded text-xs">
                                    Weight: {info.weight}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <Group justify="flex-end" mt="md">
                    <Button variant="default" onClick={() => setGroupModalOpen(false)}>
                        Close
                    </Button>
                </Group>
            </Modal>

            <Modal
                opened={weightModalOpen}
                onClose={closeWeightModal}
                title={
                    modalMode === "create"
                        ? "Set Relationship Weight"
                        : "Edit Relationship Weight"
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
                            }
                        }}
                        data-autofocus
                    />
                    <Group justify="flex-end" mt="md">
                        <Button
                            variant="default"
                            onClick={closeWeightModal}
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
                        <Button onClick={submitWeight}>
                            {modalMode === "create" ? "Create" : "Save"}
                        </Button>
                    </Group>
                </div>
            </Modal>

            {/* Node Edit Modal */}
            <Modal
                opened={nodeEditModalOpen}
                onClose={() => setNodeEditModalOpen(false)}
                title="Rename Node"
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
                            <Text size="xs" c="dimmed">
                                {newNodeName.length}/{NAME_MAX}
                            </Text>
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
                        <Button onClick={submitNodeRename}>
                            Save
                        </Button>
                    </Group>
                </div>
            </Modal>

            {/* Node Delete Modal */}
            <Modal
                opened={nodeDeleteModalOpen}
                onClose={() => setNodeDeleteModalOpen(false)}
                title="Delete Node"
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
                        &quot;? This will remove all related connections.
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
                        >
                            Delete
                        </Button>
                    </Group>
                </div>
            </Modal>
        </>
    );
}
