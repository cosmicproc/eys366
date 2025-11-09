import { NextResponse } from "next/server";

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, name } = body;
        if (!id || !name) {
            return NextResponse.json(
                { error: "Missing required fields: id, name" },
                { status: 400 }
            );
        }
        if (typeof name !== "string" || name.trim().length === 0) {
            return NextResponse.json(
                { error: "Name must be a non-empty string" },
                { status: 400 }
            );
        }
        await new Promise((r) => setTimeout(r, 100));
        return NextResponse.json({ message: "Node updated successfully" });
    } catch (e) {
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
        );
    }
}
