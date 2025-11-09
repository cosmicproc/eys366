import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { layer, name } = body;
        if (!layer || !name) {
            return NextResponse.json(
                { error: "Missing required fields: layer, name" },
                { status: 400 }
            );
        }
        if (!["cc", "co", "po"].includes(layer)) {
            return NextResponse.json(
                { error: "Invalid layer value" },
                { status: 400 }
            );
        }
        if (typeof name !== "string" || name.trim().length === 0) {
            return NextResponse.json(
                { error: "Name must be a non-empty string" },
                { status: 400 }
            );
        }
        if (name.length > 100) {
            return NextResponse.json(
                { error: "Name exceeds 50 character limit" },
                { status: 400 }
            );
        }
        await new Promise((r) => setTimeout(r, 100));
        return NextResponse.json({
            message: "Node created successfully",
            id: Math.floor(Math.random() * 10000),
        });
    } catch (e) {
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
        );
    }
}
