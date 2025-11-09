import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
    try {
        const body = await request.json();
        const { id } = body;
        if (!id) {
            return NextResponse.json(
                { error: "Missing required field: id" },
                { status: 400 }
            );
        }
        await new Promise((r) => setTimeout(r, 100));
        return NextResponse.json({ message: "Node deleted successfully" });
    } catch (e) {
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
        );
    }
}
