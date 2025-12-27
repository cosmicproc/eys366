"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  createRelation,
  deleteNode as apiDeleteNode,
  getNodes,
  updateNode as apiUpdateNode,
  type GetNodesResponse,
} from "./apiClient";
import GraphNode from "./GraphNode";

type AppNode = Node<{ label: string; apiId: number }>;

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
      id: `cc-${node.id}`,
      type: "graphnode",
      position: { x: 50, y: yOffset + index * 120 },
      data: { label: node.name, apiId: node.id },
      sourcePosition: "right" as const,
      style: {
        background: "#e3f2fd",
        border: "2px solid #1976d2",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "150px",
      },
    });
  });

  // Course Outcomes nodes
  yOffset = 80;
  data.course_outcomes.forEach((node, index) => {
    nodes.push({
      id: `co-${node.id}`,
      type: "graphnode",
      position: { x: 500, y: yOffset + index * 120 },
      data: { label: node.name, apiId: node.id },
      sourcePosition: "right" as const,
      targetPosition: "left" as const,
      style: {
        background: "#f3e5f5",
        border: "2px solid #7b1fa2",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "150px",
      },
    });
  });

  // Program Outcomes nodes
  yOffset = 100;
  data.program_outcomes.forEach((node, index) => {
    nodes.push({
      id: `po-${node.id}`,
      type: "graphnode",
      position: { x: 950, y: yOffset + index * 120 },
      data: { label: node.name, apiId: node.id },
      targetPosition: "left" as const,
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

// Helper function to convert API relations to React Flow edges
const convertToEdges = (data: GetNodesResponse): Edge[] => {
  const edges: Edge[] = [];
  const processedRelations = new Set<number>();

  // Process all nodes
  const allNodes = [
    ...data.course_contents,
    ...data.course_outcomes,
    ...data.program_outcomes,
  ];

  allNodes.forEach((node) => {
    node.relations.forEach((rel) => {
      if (processedRelations.has(rel.relation_id)) return;
      processedRelations.add(rel.relation_id);

      const sourcePrefix = getLayerPrefix(rel.node1_id, data);
      const targetPrefix = getLayerPrefix(rel.node2_id, data);

      if (sourcePrefix && targetPrefix) {
        edges.push({
          id: `e-${rel.relation_id}`,
          source: `${sourcePrefix}-${rel.node1_id}`,
          target: `${targetPrefix}-${rel.node2_id}`,
          label: `Weight: ${rel.weight}`,
          data: { apiId: rel.relation_id, weight: rel.weight },
          animated: true,
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

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load graph data whenever courseId changes
  useEffect(() => {
    const loadGraph = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getNodes(courseId || undefined);
        const newNodes = convertToNodes(data);
        const newEdges = convertToEdges(data);

        setNodes(newNodes);
        setEdges(newEdges);
      } catch (err) {
        setError("Failed to load graph data");
        console.error("Error loading graph:", err);
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, [courseId, setNodes, setEdges]);

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!isValidConnection(connection)) {
        alert(
          "Invalid connection! Only course content → course outcome or course outcome → program outcome connections are allowed."
        );
        return;
      }

      try {
        const sourceId = parseInt(connection.source.split("-")[1]);
        const targetId = parseInt(connection.target.split("-")[1]);

        const weight = prompt("Enter relation weight (1-5):", "3");
        if (!weight) return;

        const weightNum = parseInt(weight);
        if (isNaN(weightNum) || weightNum < 1 || weightNum > 5) {
          alert("Weight must be between 1 and 5");
          return;
        }

        const response = await createRelation(sourceId, targetId, weightNum);

        const newEdge: Edge = {
          id: `e-${response.relation_id}`,
          source: connection.source,
          target: connection.target,
          label: `Weight: ${weightNum}`,
          data: { apiId: response.relation_id, weight: weightNum },
          animated: true,
        };

        setEdges((eds) => addEdge(newEdge, eds));
      } catch (error) {
        console.error("Failed to create relation:", error);
        alert("Failed to create relation");
      }
    },
    [setEdges]
  );

  const handleEditNode = useCallback(
    async (apiId: number, currentName: string) => {
      const newName = prompt("Enter new name:", currentName);
      if (!newName || newName === currentName) return;

      try {
        await apiUpdateNode(apiId, newName);
        setNodes((nds) =>
          nds.map((node) => {
            if (node.data?.apiId === apiId) {
              return {
                ...node,
                data: { ...node.data, label: newName },
              } as Node;
            }
            return node;
          })
        );
      } catch (error) {
        console.error("Failed to update node:", error);
        alert("Failed to update node");
      }
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    async (apiId: number, currentName: string) => {
      if (!confirm(`Delete node "${currentName}"?`)) return;

      try {
        await apiDeleteNode(apiId);
        setNodes((nds) => nds.filter((n) => n.data.apiId !== apiId));
        setEdges((eds) =>
          eds.filter(
            (e) =>
              !e.source.includes(`-${apiId}`) && !e.target.includes(`-${apiId}`)
          )
        );
      } catch (error) {
        console.error("Failed to delete node:", error);
        alert("Failed to delete node");
      }
    },
    [setNodes, setEdges]
  );

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
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
