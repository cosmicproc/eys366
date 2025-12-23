"use client";

import {
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useState } from "react";

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

// Layer 2: Course Outcomes (Middle)
const courseOutcomesNodes = [
    {
        id: "co1",
        position: { x: 400, y: 80 },
        data: { label: "CO1: Apply Core Concepts" },
        type: "default",
    },
    {
        id: "co2",
        position: { x: 400, y: 180 },
        data: { label: "CO2: Analyze Problems" },
        type: "default",
    },
    {
        id: "co3",
        position: { x: 400, y: 280 },
        data: { label: "CO3: Design Solutions" },
        type: "default",
    },
    {
        id: "co4",
        position: { x: 400, y: 380 },
        data: { label: "CO4: Evaluate Methods" },
        type: "default",
    },
    {
        id: "co5",
        position: { x: 400, y: 480 },
        data: { label: "CO5: Communicate Effectively" },
        type: "default",
    },
];

// Layer 3: Program Outcomes (Right)
const programOutcomesNodes = [
    {
        id: "po1",
        position: { x: 750, y: 100 },
        data: { label: "PO1: Engineering Knowledge" },
        type: "default",
    },
    {
        id: "po2",
        position: { x: 750, y: 200 },
        data: { label: "PO2: Problem Analysis" },
        type: "default",
    },
    {
        id: "po3",
        position: { x: 750, y: 300 },
        data: { label: "PO3: Design/Development" },
        type: "default",
    },
    {
        id: "po4",
        position: { x: 750, y: 400 },
        data: { label: "PO4: Professional Skills" },
        type: "default",
    },
];

// Combine all nodes
const initialNodes = [
    // Course Content nodes - only right handle (source)
    ...courseContentNodes.map((node) => ({
        ...node,
        draggable: false,
        sourcePosition: Position.Right,
        targetPosition: Position.Right, // Hide target handles by putting them on same side
        style: {
            background: "#e3f2fd",
            border: "2px solid #1976d2",
            borderRadius: "8px",
            padding: "10px",
            fontSize: "12px",
            width: 180,
        },
    })),
    // Course Outcomes nodes - left handle (target) and right handle (source)
    ...courseOutcomesNodes.map((node) => ({
        ...node,
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
    })),
    // Program Outcomes nodes - only left handle (target)
    ...programOutcomesNodes.map((node) => ({
        ...node,
        draggable: false,
        sourcePosition: Position.Left, // Hide source handles by putting them on same side
        targetPosition: Position.Left,
        style: {
            background: "#e8f5e9",
            border: "2px solid #388e3c",
            borderRadius: "8px",
            padding: "10px",
            fontSize: "12px",
            width: 200,
        },
    })),
];

// Start with no edges - users will create them
const initialEdges: Edge[] = [];

// Helper function to determine node layer
const getNodeLayer = (nodeId: string): "cc" | "co" | "po" | null => {
    if (nodeId.startsWith("cc")) return "cc";
    if (nodeId.startsWith("co")) return "co";
    if (nodeId.startsWith("po")) return "po";
    return null;
};

// Validate connection to maintain bipartite structure
const isValidConnection = (connection: Connection): boolean => {
    if (!connection.source || !connection.target) return false;

    const sourceLayer = getNodeLayer(connection.source);
    const targetLayer = getNodeLayer(connection.target);

    // Only allow CC -> CO or CO -> PO connections
    if (sourceLayer === "cc" && targetLayer === "co") return true;
    if (sourceLayer === "co" && targetLayer === "po") return true;

    return false;
};

export default function MainGraph() {
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>(initialEdges);

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
        (changes: EdgeChange[]) =>
            setEdges((edgesSnapshot) =>
                applyEdgeChanges(changes, edgesSnapshot)
            ),
        []
    );

    const onConnect = useCallback((params: Connection) => {
        // Only add edge if it maintains bipartite structure
        if (isValidConnection(params)) {
            // Prompt user for weight
            const weight = prompt("Enter edge weight (0-5):");
            const weightNum = parseInt(weight || "0", 10);

            // Validate weight is between 0-5
            if (weightNum >= 0 && weightNum <= 5) {
                const sourceLayer = getNodeLayer(params.source!);
                const edgeColor = sourceLayer === "cc" ? "#1976d2" : "#388e3c";

                setEdges((edgesSnapshot) =>
                    addEdge(
                        {
                            ...params,
                            label: weightNum.toString(),
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
                            data: { weight: weightNum },
                        },
                        edgesSnapshot
                    )
                );
            } else {
                alert("Weight must be between 0 and 5");
            }
        }
    }, []);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodesDraggable={false}
            elementsSelectable={true}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={true}
            fitView
        />
    );
}
