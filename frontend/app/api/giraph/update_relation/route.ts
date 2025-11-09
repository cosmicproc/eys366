import { NextResponse } from "next/server";

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { relation_id, weight } = body;

        if (!relation_id || !weight) {
            return NextResponse.json(
                { error: "Missing required fields: relation_id, weight" },
                { status: 400 }
            );
        }
        if (weight < 1 || weight > 5) {
            return NextResponse.json(
                { error: "Weight must be between 1 and 5" },
                { status: 400 }
            );
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        return NextResponse.json({ message: "Relation updated successfully" });
    } catch (error) {
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
        );
    }
}
