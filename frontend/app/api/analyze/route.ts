import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const webhookUrl = process.env.N8N_WEBHOOK_URL;

        if (!webhookUrl) {
            return NextResponse.json(
                { error: "N8N_WEBHOOK_URL is not configured" },
                { status: 500 }
            );
        }

        const formData = await request.formData();
        const file = formData.get("data") as File | null;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Forward the file to n8n webhook
        const n8nFormData = new FormData();
        n8nFormData.append("data", file);

        const response = await fetch(webhookUrl, {
            method: "POST",
            body: n8nFormData,
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: "Failed to analyze resume" },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Resume analysis error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
