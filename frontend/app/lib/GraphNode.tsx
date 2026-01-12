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
    // Use smaller font for CO/PO if text is longer than 150 chars
    const isLongText = props.data.label.length > 150;
    const isOutcome = props.data.nodeType === "co" || props.data.nodeType === "po";
    const useSmallFont = isLongText && isOutcome;
    
    return (
        <div className="flex flex-col h-full">
            {props.targetPosition && (
                <Handle type="target" position={props.targetPosition} />
            )}
            <div 
                className={`font-medium mb-1 text-center flex-1 flex items-center justify-center ${useSmallFont ? 'text-xs' : ''}`}
                style={{ 
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    hyphens: 'auto',
                    fontSize: useSmallFont ? '0.9em' : undefined,
                    lineHeight: useSmallFont ? '1.3' : undefined,
                }}
            >
                {props.data.label}
            </div>
            
            {(props.data.score !== undefined && props.data.score !== null) && (
                <div className="text-xs text-center text-gray-600 mb-2 font-semibold">
                    Score: {Math.round(props.data.score)}%
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
                <Handle type="source" position={props.sourcePosition} />
            )}
        </div>
    );
}
