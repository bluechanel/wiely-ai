import { NextResponse } from "next/server";
import { z } from "zod";
import path from "path";
import { promises as fs } from "fs";

export const runtime = "nodejs";

const fileSchema = z
    .instanceof(Blob)
    .refine((file) => file.size >= 10_000, { message: "文件太小" })
    .refine((file) => file.size <= 5 * 1024 * 1024, { message: "文件太大" })
    .refine((file) => ["image/png", "image/jpeg"].includes(file.type), {
        message: "仅支持 PNG 或 JPEG 格式",
    });

export async function POST(request: Request) {
    if (request.body === null) {
        return new Response("Request body is empty", { status: 400 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as Blob;

        if (!file) {
            return NextResponse.json(
                { error: "No file uploaded" },
                { status: 400 },
            );
        }

        const validatedFile = fileSchema.safeParse({ file });
        if (!validatedFile.success) {
            const errorMessage = validatedFile.error.message;
            return NextResponse.json({ error: errorMessage }, { status: 400 });
        }

        const filename = (formData.get("file") as File).name;
        const fileBuffer = await file.arrayBuffer();

        // 创建文件夹
        const uploadDir = path.join(process.cwd(), "public");
        await fs.mkdir(uploadDir, { recursive: true });

        const buffer = Buffer.from(fileBuffer);
        const filePath = path.join(uploadDir, filename);
        await fs.writeFile(filePath, buffer);

        return NextResponse.json({
            url: `http://127.0.0.1:3000/${filename}`,
            pathname: filename,
            contentType: file.type,
            contentDisposition: `inline; filename="${filename}"`,
            size: file.size,
            uploadedAt: new Date().toISOString(),
        });
    } catch (_error) {
        return NextResponse.json(
            { error: "Failed to process request" },
            { status: 500 },
        );
    }
}
