import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { node1_id, node2_id, weight } = body;

        // Validate required fields
        if (!node1_id || !node2_id || !weight) {
            return NextResponse.json(
                {
                    error: "Missing required fields: node1_id, node2_id, weight",
                },
                { status: 400 }
            );
        }

        // Validate weight range (1-5, not 0)
        if (weight < 1 || weight > 5) {
            return NextResponse.json(
                { error: "Weight must be between 1 and 5" },
                { status: 400 }
            );
        }

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Return success with the created relation_id
        return NextResponse.json({
            message: "Relation created successfully",
            relation_id: Math.floor(Math.random() * 10000), // Mock ID
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
        );
    }
}
