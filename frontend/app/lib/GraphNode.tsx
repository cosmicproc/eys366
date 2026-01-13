"use client";

import { ActionIcon } from "@mantine/core";
import { IconBackspace, IconEdit } from "@tabler/icons-react";
import { Handle, Position } from "@xyflow/react";

export default function GraphNode(props: {
    data: {
        label: string;
        apiId: number;
        score?: number;
        nodeType?: "cc" | "co" | "po";
    };
    sourcePosition?: Position;
    targetPosition?: Position;
    onEdit?: (apiId: number, currentName: string, nodeType: "cc" | "co" | "po") => void;
    onDelete?: (apiId: number, currentName: string) => void;
}) {
    // Truncate CO/PO text at 100 chars and show full text on hover
    const isOutcome = props.data.nodeType === "co" || props.data.nodeType === "po";
    const shouldTruncate = isOutcome && props.data.label.length > 85;
    const truncatedLabel = shouldTruncate ? props.data.label.slice(0, 85) + '…' : props.data.label;
    
    return (
        <div className="flex flex-col h-full">
            {props.targetPosition && (
                <Handle type="target" position={props.targetPosition} className="h-2! w-2!" />
            )}
            <div
                className="font-medium mb-1 text-center flex-1 flex items-center justify-center"
                style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    hyphens: 'auto',
                }}
                title={shouldTruncate ? props.data.label : undefined}
            >
                {truncatedLabel}
            </div>

            {(props.data.score !== undefined && props.data.score !== null) && (
                <div className="absolute bottom-2 right-2">
                    <span className="inline-block bg-indigo-800 text-white text-xs font-bold rounded-full px-2 py-0.5 shadow-sm">
                        {Math.round(props.data.score)}%
                    </span>
                </div>
            )}

            <div className="flex gap-1 justify-center mt-auto">
                <ActionIcon
                    variant="subtle"
                    aria-label="Edit"
                    size="sm"
                    onClick={() =>
                        props.onEdit?.(props.data.apiId, props.data.label, props.data.nodeType || "cc")
                    }
                >
                    <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon
                    variant="subtle"
                    aria-label="Delete"
                    size="sm"
                    color="red"
                    onClick={() =>
                        props.onDelete?.(props.data.apiId, props.data.label)
                    }
                >
                    <IconBackspace size={16} />
                </ActionIcon>
            </div>
            {props.sourcePosition && (
                <Handle type="source" position={props.sourcePosition} className="h-2! w-2!" />
            )}
        </div>
    );
}
