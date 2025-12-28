"use client";

import {
  Button,
  Group,
  Modal,
  NumberInput,
  Text,
  TextInput,
} from "@mantine/core";
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
  deleteRelation,
  updateRelation,
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
          label: `${rel.weight}`,
          data: { relationId: rel.relation_id, weight: rel.weight },
          animated: true,
          style: {
            stroke: sourcePrefix === "cc" ? "#1976d2" : "#388e3c",
            strokeWidth: 2,
          },
          labelStyle: {
            fill: sourcePrefix === "cc" ? "#1976d2" : "#388e3c",
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

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Weight modal state
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [weightValue, setWeightValue] = useState<number | "">(3);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
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
        setModalError("Only course content → course outcome or course outcome → program outcome connections are allowed.");
        return;
      }

      // Check for duplicate
      if (
        edges.some(
          (e) => e.source === connection.source && e.target === connection.target
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
        const sourceId = parseInt(pendingConnection.source.split("-")[1]);
        const targetId = parseInt(pendingConnection.target.split("-")[1]);

        const response = await createRelation(sourceId, targetId, weightValue);

        const sourceLayer = getNodeLayer(pendingConnection.source);
        const edgeColor = sourceLayer === "course_content" ? "#1976d2" : "#388e3c";

        const newEdge: Edge = {
          id: `e-${response.relation_id}`,
          source: pendingConnection.source,
          target: pendingConnection.target,
          label: `${weightValue}`,
          data: { relationId: response.relation_id, weight: weightValue },
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
        const relationId = (editingEdge.data as { relationId?: number })?.relationId;
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

    const relationId = (editingEdge.data as { relationId?: number })?.relationId;
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

  // Handle node delete - open modal
  const handleDeleteNode = useCallback((apiId: number, currentName: string) => {
    setEditingNodeId(apiId);
    setEditingNodeName(currentName);
    setModalError(null);
    setNodeDeleteModalOpen(true);
  }, []);

  // Submit node delete
  const submitNodeDelete = async () => {
    if (!editingNodeId) return;
    setModalError(null);

    setSaving(true);
    try {
      await apiDeleteNode(editingNodeId);
      setNodes((nds) => nds.filter((n) => n.data.apiId !== editingNodeId));
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
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {/* Weight Modal */}
      <Modal
        opened={weightModalOpen}
        onClose={closeWeightModal}
        title={modalMode === "create" ? "Set Relationship Weight" : "Edit Relationship Weight"}
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
            <Button variant="default" onClick={closeWeightModal} disabled={saving}>
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
            <Button onClick={submitNodeRename} loading={saving}>
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
            Are you sure you want to delete &quot;{editingNodeName}&quot;? This
            will remove all related connections.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setNodeDeleteModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button color="red" onClick={submitNodeDelete} loading={saving}>
              Delete
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  );
}
