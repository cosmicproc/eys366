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
        <div className="text-center">
            <div>{props.data.label}</div>
            <div className="flex justify-center">
                <ActionIcon
                    variant="subtle"
                    aria-label="Edit"
                    size="1em"
                    onClick={() =>
                        props.onEdit?.(props.data.apiId, props.data.label)
                    }
                >
                    <IconEdit />
                </ActionIcon>
                <ActionIcon
                    variant="subtle"
                    aria-label="Delete"
                    size="1em"
                    color="red"
                    onClick={() =>
                        props.onDelete?.(props.data.apiId, props.data.label)
                    }
                >
                    <IconBackspace />
                </ActionIcon>
            </div>
            {props.targetPosition && (
                <Handle type="target" position={props.targetPosition} />
            )}
            {props.sourcePosition && (
                <Handle type="source" position={props.sourcePosition} />
            )}
        </div>
    );
}
