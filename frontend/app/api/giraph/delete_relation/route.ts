import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { relation_id } = body;

        // Validate required fields
        if (!relation_id) {
            return NextResponse.json(
                { error: "Missing required field: relation_id" },
                { status: 400 }
            );
        }

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        return NextResponse.json({
            message: "Relation deleted successfully",
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
        );
    }
}
