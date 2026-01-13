"use client";

import {
    Button,
    Group,
    Modal,
    NumberInput,
    Text,
    Textarea,
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

// Constants for layout
const NODE_PADDING = 20; // padding inside node
const NODE_MIN_WIDTH = 180; // 10em assuming 1em = 16px
const NODE_MAX_WIDTH = 350;
const CHAR_WIDTH = 8; // approximate character width for normal font
const CHAR_WIDTH_SMALL = 6; // approximate character width for smaller font (11px)
const NODE_BASE_HEIGHT = 50; // base height for node
const VERTICAL_GAP = 50; // vertical gap between nodes in same layer
const LAYER_GAP = 225; // horizontal gap between layers (increased for clarity)

// Calculate node width based on text length
const calculateNodeWidth = (label: string): number => {
    const textWidth = label.length * CHAR_WIDTH + NODE_PADDING * 2;
    return Math.max(NODE_MIN_WIDTH, Math.min(NODE_MAX_WIDTH, textWidth));
};

// Calculate node height (can expand for multi-line text)
// If isTruncatedPO is true, use a smaller base height to avoid extra space
const calculateNodeHeight = (label: string, width: number, isTruncatedPO?: boolean): number => {
    const charWidth = CHAR_WIDTH;
    const baseHeight = isTruncatedPO ? 40 : NODE_BASE_HEIGHT;
    const lineHeight = 20;
    const charsPerLine = Math.floor((width - NODE_PADDING * 2) / charWidth);
    const lines = Math.ceil(label.length / charsPerLine);
    return baseHeight + Math.max(0, lines - 1) * lineHeight;
};

const createNodeTypes = (
    onEdit: (apiId: number, currentName: string, nodeType: "cc" | "co" | "po") => void,
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

    // ========== CROSSING MINIMIZATION (Barycenter Method) ==========
    // Build adjacency maps for edges between layers
    const ccToCoEdges = new Map<number, number[]>(); // CC node id -> list of CO node ids
    const coToCcEdges = new Map<number, number[]>(); // CO node id -> list of CC node ids  
    const coToPoEdges = new Map<number, number[]>(); // CO node id -> list of PO node ids
    const poToCoEdges = new Map<number, number[]>(); // PO node id -> list of CO node ids

    // Initialize maps
    data.course_contents.forEach(n => ccToCoEdges.set(n.id, []));
    data.course_outcomes.forEach(n => {
        coToCcEdges.set(n.id, []);
        coToPoEdges.set(n.id, []);
    });
    data.program_outcomes.forEach(n => poToCoEdges.set(n.id, []));

    // Helper to find which layer a node belongs to
    const ccIds = new Set(data.course_contents.map(n => n.id));
    const coIds = new Set(data.course_outcomes.map(n => n.id));
    const poIds = new Set(data.program_outcomes.map(n => n.id));

    // Process all relations to build adjacency
    const processedRels = new Set<number>();
    [...data.course_contents, ...data.course_outcomes, ...data.program_outcomes].forEach(node => {
        node.relations.forEach(rel => {
            if (processedRels.has(rel.relation_id)) return;
            processedRels.add(rel.relation_id);

            const n1 = rel.node1_id;
            const n2 = rel.node2_id;

            // CC <-> CO edge
            if (ccIds.has(n1) && coIds.has(n2)) {
                ccToCoEdges.get(n1)?.push(n2);
                coToCcEdges.get(n2)?.push(n1);
            } else if (coIds.has(n1) && ccIds.has(n2)) {
                ccToCoEdges.get(n2)?.push(n1);
                coToCcEdges.get(n1)?.push(n2);
            }
            // CO <-> PO edge
            else if (coIds.has(n1) && poIds.has(n2)) {
                coToPoEdges.get(n1)?.push(n2);
                poToCoEdges.get(n2)?.push(n1);
            } else if (poIds.has(n1) && coIds.has(n2)) {
                coToPoEdges.get(n2)?.push(n1);
                poToCoEdges.get(n1)?.push(n2);
            }
        });
    });

    // Sort CC layer by original order (as base), create index map
    const ccOrder = data.course_contents.map((n, i) => ({ node: n, origIndex: i }));
    const ccIndexMap = new Map<number, number>();
    ccOrder.forEach((item, idx) => ccIndexMap.set(item.node.id, idx));

    // Sort CO layer by barycenter of connected CC nodes
    const coOrder = data.course_outcomes.map((n, i) => ({ node: n, origIndex: i }));
    coOrder.sort((a, b) => {
        const aConns = coToCcEdges.get(a.node.id) || [];
        const bConns = coToCcEdges.get(b.node.id) || [];
        
        // Barycenter = average index of connected nodes in previous layer
        const aBarycenter = aConns.length > 0 
            ? aConns.reduce((sum, id) => sum + (ccIndexMap.get(id) ?? 0), 0) / aConns.length 
            : a.origIndex;
        const bBarycenter = bConns.length > 0 
            ? bConns.reduce((sum, id) => sum + (ccIndexMap.get(id) ?? 0), 0) / bConns.length 
            : b.origIndex;
        
        return aBarycenter - bBarycenter;
    });
    const coIndexMap = new Map<number, number>();
    coOrder.forEach((item, idx) => coIndexMap.set(item.node.id, idx));

    // Sort PO layer by barycenter of connected CO nodes
    const poOrder = data.program_outcomes.map((n, i) => ({ node: n, origIndex: i }));
    poOrder.sort((a, b) => {
        const aConns = poToCoEdges.get(a.node.id) || [];
        const bConns = poToCoEdges.get(b.node.id) || [];
        
        const aBarycenter = aConns.length > 0 
            ? aConns.reduce((sum, id) => sum + (coIndexMap.get(id) ?? 0), 0) / aConns.length 
            : a.origIndex;
        const bBarycenter = bConns.length > 0 
            ? bConns.reduce((sum, id) => sum + (coIndexMap.get(id) ?? 0), 0) / bConns.length 
            : b.origIndex;
        
        return aBarycenter - bBarycenter;
    });

    // Extract sorted node arrays
    const sortedCC = ccOrder.map(item => item.node);
    const sortedCO = coOrder.map(item => item.node);
    const sortedPO = poOrder.map(item => item.node);

    // ========== END CROSSING MINIMIZATION ==========

    // 2. Pre-calculate dimensions for all nodes in each layer (using sorted order)
    // CC nodes: normal font
    const ccDimensions = sortedCC.map(node => {
        const width = calculateNodeWidth(node.name);
        const height = calculateNodeHeight(node.name, width);
        return { width, height };
    });
    
    // CO nodes: use truncated label and reduced base height if text > 85 chars
    const coDimensions = sortedCO.map(node => {
        const width = calculateNodeWidth(node.name);
        const isTruncated = node.name.length > 85;
        const displayLabel = isTruncated ? node.name.slice(0, 85) + '…' : node.name;
        const height = calculateNodeHeight(displayLabel, width, isTruncated);
        return { width, height };
    });
    
    // PO nodes: use truncated label for height if text > 85 chars, and reduce base height for truncated
    const poDimensions = sortedPO.map(node => {
        const width = calculateNodeWidth(node.name);
        const isTruncated = node.name.length > 85;
        const displayLabel = isTruncated ? node.name.slice(0, 85) + '…' : node.name;
        const height = calculateNodeHeight(displayLabel, width, isTruncated);
        return { width, height };
    });

    // 3. Calculate max width per layer for alignment
    const ccMaxWidth = ccDimensions.length > 0 ? Math.max(...ccDimensions.map(d => d.width)) : NODE_MIN_WIDTH;
    const coMaxWidth = coDimensions.length > 0 ? Math.max(...coDimensions.map(d => d.width)) : NODE_MIN_WIDTH;

    // 4. Calculate total height per layer
    const ccTotalHeight = ccDimensions.reduce((sum, d) => sum + d.height + VERTICAL_GAP, -VERTICAL_GAP);
    const coTotalHeight = coDimensions.reduce((sum, d) => sum + d.height + VERTICAL_GAP, -VERTICAL_GAP);
    const poTotalHeight = poDimensions.reduce((sum, d) => sum + d.height + VERTICAL_GAP, -VERTICAL_GAP);
    const maxTotalHeight = Math.max(ccTotalHeight, coTotalHeight, poTotalHeight, 0);

    // 5. Calculate X positions for each layer
    // Layer 1 (CC): right-aligned within its column
    // Layer 2 (CO): center-aligned
    // Layer 3 (PO): left-aligned within its column
    const layer1X = 50; // CC layer starts here
    const layer2X = layer1X + ccMaxWidth + LAYER_GAP; // CO layer
    const layer3X = layer2X + coMaxWidth + LAYER_GAP; // PO layer

    const nodes: Node[] = [];

    // 6. Position Course Contents (right-aligned within layer) - using sorted order
    let ccStartY = (maxTotalHeight - ccTotalHeight) / 2 + 50;
    let ccCurrentY = ccStartY;
    sortedCC.forEach((node, index) => {
        let score = calculatedScores.get(`cc-${node.id}`);
        if (!hasAnyNonZeroScore) score = undefined;
        
        const { width, height } = ccDimensions[index];
        // Right-align: position x so right edge aligns with ccMaxWidth
        const xPos = layer1X + (ccMaxWidth - width);

        nodes.push({
            id: `cc-${node.id}`,
            type: "graphnode",
            position: { x: xPos, y: ccCurrentY },
            draggable: false,
            sourcePosition: Position.Right,
            data: { label: node.name, apiId: node.id, score, nodeType: "cc" as const },
            style: {
                background: "#e3f2fd",
                border: "2px solid #1976d2",
                borderRadius: "8px",
                padding: "10px",
                width: `${width}px`,
                minHeight: `${height}px`,
            },
        });
        
        ccCurrentY += height + VERTICAL_GAP;
    });

    // 7. Position Course Outcomes (center-aligned within layer) - using sorted order
    let coStartY = (maxTotalHeight - coTotalHeight) / 2 + 50;
    let coCurrentY = coStartY;
    sortedCO.forEach((node, index) => {
        let score = calculatedScores.get(`co-${node.id}`);
        if (!hasAnyNonZeroScore) score = undefined;
        
        const { width, height } = coDimensions[index];
        // Center-align: position x so node is centered in coMaxWidth
        const xPos = layer2X + (coMaxWidth - width) / 2;

        nodes.push({
            id: `co-${node.id}`,
            type: "graphnode",
            position: { x: xPos, y: coCurrentY },
            draggable: false,
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
            data: { label: node.name, apiId: node.id, score, nodeType: "co" as const },
            style: {
                background: "#f3e5f5",
                border: "2px solid #7b1fa2",
                borderRadius: "8px",
                padding: "10px",
                width: `${width}px`,
                minHeight: `${height}px`,
            },
        });
        
        coCurrentY += height + VERTICAL_GAP;
    });

    // 8. Position Program Outcomes (left-aligned within layer) - using sorted order
    let poStartY = (maxTotalHeight - poTotalHeight) / 2 + 50;
    let poCurrentY = poStartY;
    sortedPO.forEach((node, index) => {
        let score = calculatedScores.get(`po-${node.id}`);
        if (!hasAnyNonZeroScore) score = undefined;
        
        const { width, height } = poDimensions[index];
        // Left-align: position x at layer3X
        const xPos = layer3X;

        nodes.push({
            id: `po-${node.id}`,
            type: "graphnode",
            position: { x: xPos, y: poCurrentY },
            draggable: false,
            targetPosition: Position.Left,
            data: { label: node.name, apiId: node.id, score, nodeType: "po" as const },
            style: {
                background: "#fff3e0",
                border: "2px solid #f57c00",
                borderRadius: "8px",
                padding: "10px",
                width: `${width}px`,
                minHeight: `${height}px`,
            },
        });
        
        poCurrentY += height + VERTICAL_GAP;
    });

    return nodes;
};

// Helper function to convert API relations to React Flow edges
const convertToEdges = (data: GetNodesResponse): Edge[] => {
    const edges: Edge[] = [];
    const processedRelations = new Set<number>();

    let colorIndex = 0;
    
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
                const color = DISTINCT_COLORS[colorIndex % DISTINCT_COLORS.length];
                colorIndex++;

                // Make edge thickness depend on weight (e.g. 1-5 maps to 2-6px)
                const minStroke = 1.5;
                const maxStroke = 4;
                const minWeight = 1;
                const maxWeight = 5;
                const weight = Math.max(minWeight, Math.min(maxWeight, rel.weight));
                const strokeWidth = minStroke + ((weight - minWeight) / (maxWeight - minWeight)) * (maxStroke - minStroke);
                edges.push({
                    id: `e-${rel.relation_id}`,
                    source: srcId,
                    target: tgtId,
                    label: `${rel.weight}`,
                    data: { relationId: rel.relation_id, weight: rel.weight, color },
                    animated: true,
                    style: {
                        stroke: color,
                        strokeWidth,
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
            }
        });
    });

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
    const [editingNodeType, setEditingNodeType] = useState<"cc" | "co" | "po">("cc");
    const [newNodeName, setNewNodeName] = useState("");
    
    // Different max lengths: 60 for CC, 300 for CO/PO
    const NAME_MAX = editingNodeType === "cc" ? 60 : 300;

    // Node delete modal state
    const [nodeDeleteModalOpen, setNodeDeleteModalOpen] = useState(false);

    // Highlight state - tracks which nodes should be highlighted
    const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
    const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(new Set());

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
                const newEdges = convertToEdges(data);

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
                setEdges(convertToEdges(data));
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
            setEdges(convertToEdges(data));
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
        setModalMode("edit");
        setEditingEdge(edge);
        const currentWeight = (edge.data as { weight?: number })?.weight;
        setWeightValue(typeof currentWeight === "number" ? currentWeight : 3);
        setModalError(null);
        setWeightModalOpen(true);
    }, []);

    // Handle node click for highlighting connected nodes
    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        // If clicking the same node, clear highlight
        if (highlightedNodes.has(node.id) && highlightedNodes.size > 0) {
            setHighlightedNodes(new Set());
            setHighlightedEdges(new Set());
            return;
        }

        const connectedNodes = new Set<string>([node.id]);
        const connectedEdges = new Set<string>();

        // Build adjacency maps
        const leftNeighbors = new Map<string, { nodeId: string; edgeId: string }[]>(); // target -> sources
        const rightNeighbors = new Map<string, { nodeId: string; edgeId: string }[]>(); // source -> targets

        edges.forEach((edge) => {
            // Left neighbors: who points TO this node (sources)
            if (!leftNeighbors.has(edge.target)) {
                leftNeighbors.set(edge.target, []);
            }
            leftNeighbors.get(edge.target)!.push({ nodeId: edge.source, edgeId: edge.id });

            // Right neighbors: who this node points TO (targets)
            if (!rightNeighbors.has(edge.source)) {
                rightNeighbors.set(edge.source, []);
            }
            rightNeighbors.get(edge.source)!.push({ nodeId: edge.target, edgeId: edge.id });
        });

        // Traverse left (sources) - recursive
        const traverseLeft = (nodeId: string) => {
            const neighbors = leftNeighbors.get(nodeId) || [];
            for (const { nodeId: neighborId, edgeId } of neighbors) {
                if (!connectedNodes.has(neighborId)) {
                    connectedNodes.add(neighborId);
                    connectedEdges.add(edgeId);
                    traverseLeft(neighborId); // Continue leftward
                } else {
                    connectedEdges.add(edgeId); // Still highlight the edge
                }
            }
        };

        // Traverse right (targets) - recursive
        const traverseRight = (nodeId: string) => {
            const neighbors = rightNeighbors.get(nodeId) || [];
            for (const { nodeId: neighborId, edgeId } of neighbors) {
                if (!connectedNodes.has(neighborId)) {
                    connectedNodes.add(neighborId);
                    connectedEdges.add(edgeId);
                    traverseRight(neighborId); // Continue rightward
                } else {
                    connectedEdges.add(edgeId); // Still highlight the edge
                }
            }
        };

        // Start traversal from clicked node
        traverseLeft(node.id);
        traverseRight(node.id);

        setHighlightedNodes(connectedNodes);
        setHighlightedEdges(connectedEdges);
    }, [edges, highlightedNodes]);

    // Handle pane click to clear highlights
    const onPaneClick = useCallback(() => {
        if (highlightedNodes.size > 0) {
            setHighlightedNodes(new Set());
            setHighlightedEdges(new Set());
        }
    }, [highlightedNodes]);


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

                // Use same thickness logic as convertToEdges
                const minStroke = 1.5;
                const maxStroke = 4;
                const minWeight = 1;
                const maxWeight = 5;
                const weight = Math.max(minWeight, Math.min(maxWeight, weightValue));
                const strokeWidth = minStroke + ((weight - minWeight) / (maxWeight - minWeight)) * (maxStroke - minStroke);
                const sourceLayer = getNodeLayer(pendingConnection.source);
                const edgeColor = sourceLayer === "course_content" ? "#1976d2" : "#388e3c";
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
                        strokeWidth,
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

                // Use same thickness logic as convertToEdges
                const minStroke = 1.5;
                const maxStroke = 4;
                const minWeight = 1;
                const maxWeight = 5;
                const weight = Math.max(minWeight, Math.min(maxWeight, weightValue));
                const strokeWidth = minStroke + ((weight - minWeight) / (maxWeight - minWeight)) * (maxStroke - minStroke);
                setEdges((prev) =>
                    prev.map((e) =>
                        e.id === editingEdge.id
                            ? {
                                  ...e,
                                  label: `${weightValue}`,
                                  data: { ...e.data, weight: weightValue },
                                  style: {
                                      ...(e.style || {}),
                                      strokeWidth,
                                  },
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
    const handleEditNode = useCallback((apiId: number, currentName: string, nodeType: "cc" | "co" | "po") => {
        setEditingNodeId(apiId);
        setEditingNodeName(currentName);
        setEditingNodeType(nodeType);
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
            setModalError("Description cannot be empty");
            return;
        }
        if (trimmed.length > NAME_MAX) {
            setModalError(`Description must be at most ${NAME_MAX} characters`);
            return;
        }

        setSaving(true);
        try {
            await apiUpdateNode(editingNodeId, trimmed);
            setNodeEditModalOpen(false);
            // Reload graph to update layout
            window.dispatchEvent(new Event("scoresUpdated"));
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            setModalError(`Failed to rename: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    // Helper to get edge info for color indicator
    const getEdgeInfo = () => {
        if (!editingEdge) return null;
        
        const sourceNode = nodes.find(n => n.id === editingEdge.source);
        const targetNode = nodes.find(n => n.id === editingEdge.target);
        const color = (editingEdge.data as any)?.color || (editingEdge.style?.stroke as string) || '#000';
        
        return {
            source: String(sourceNode?.data.label || "Unknown"),
            target: String(targetNode?.data.label || "Unknown"),
            color
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

    // Apply highlighting styles to nodes
    const styledNodes = useMemo(() => {
        if (highlightedNodes.size === 0) return nodes;
        
        return nodes.map((node) => ({
            ...node,
            style: {
                ...node.style,
                opacity: highlightedNodes.has(node.id) ? 1 : 0.2,
                transition: 'opacity 0.2s ease-in-out',
            },
        }));
    }, [nodes, highlightedNodes]);

    // Apply highlighting styles to edges
    const styledEdges = useMemo(() => {
        if (highlightedEdges.size === 0) return edges;
        
        return edges.map((edge) => ({
            ...edge,
            style: {
                ...edge.style,
                opacity: highlightedEdges.has(edge.id) ? 1 : 0.1,
                transition: 'opacity 0.2s ease-in-out',
            },
            labelStyle: {
                ...edge.labelStyle,
                opacity: highlightedEdges.has(edge.id) ? 1 : 0.1,
            },
        }));
    }, [edges, highlightedEdges]);

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
                nodes={styledNodes}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeClick={onEdgeClick}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
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
                    {/* Color indicator for edit mode */}
                    {modalMode === "edit" && editingEdge && (() => {
                        const info = getEdgeInfo();
                        if (!info) return null;
                        return (
                            <div 
                                className="p-3 border rounded-md flex items-center gap-3"
                                style={{ borderLeft: `4px solid ${info.color}` }}
                            >
                                <div 
                                    className="w-4 h-4 rounded-full shrink-0"
                                    style={{ backgroundColor: info.color }}
                                />
                                <div className="text-sm">
                                    <span className="font-medium">{info.source}</span>
                                    <span className="text-gray-400 mx-2">→</span>
                                    <span className="font-medium">{info.target}</span>
                                </div>
                            </div>
                        );
                    })()}
                    
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
                title="Edit Node"
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
                    <Textarea
                        label={`Description (max ${NAME_MAX} chars)`}
                        value={newNodeName}
                        onChange={(e) => setNewNodeName(e.currentTarget.value)}
                        maxLength={NAME_MAX}
                        placeholder="New description"
                        autoFocus
                        autosize
                        minRows={2}
                        maxRows={4}
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
