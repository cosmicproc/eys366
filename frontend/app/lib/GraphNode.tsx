"use client";

import { ActionIcon } from "@mantine/core";
import { IconBackspace, IconEdit } from "@tabler/icons-react";
import { Handle, Position } from "@xyflow/react";

export default function GraphNode(props: {
    data: {
        label: string;
        apiId: number;
    };
    sourcePosition?: Position;
    targetPosition?: Position;
    onEdit?: (apiId: number, currentName: string) => void;
    onDelete?: (apiId: number, currentName: string) => void;
}) {
    return (
        <div className="px-4 py-2">
            {props.targetPosition && (
                <Handle type="target" position={props.targetPosition} />
            )}
            <div className="font-medium mb-2 text-center">{props.data.label}</div>
            <div className="flex gap-1 justify-center">
                <ActionIcon
                    variant="subtle"
                    aria-label="Edit"
                    size="sm"
                    onClick={() =>
                        props.onEdit?.(props.data.apiId, props.data.label)
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
