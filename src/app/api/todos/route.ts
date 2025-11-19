import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import Todo from "@/models/Todo";

export async function GET() {
  await connectToDatabase();
  const todos = await Todo.find().sort({ createdAt: -1 });
  return NextResponse.json(todos);
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const payload = await request.json();

    const todo = await Todo.create({
      text: payload.text,
      status: payload.status ?? "todo",
      createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
      ongoingStartTime: payload.ongoingStartTime
        ? new Date(payload.ongoingStartTime)
        : undefined,
      completedAt: payload.completedAt
        ? new Date(payload.completedAt)
        : undefined,
      image: payload.image,
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message ?? "Failed to create todo" },
      { status: 400 }
    );
  }
}
