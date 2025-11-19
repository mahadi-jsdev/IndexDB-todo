import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import Todo from "@/models/Todo";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await connectToDatabase();
    const updates = await request.json();
    const { id } = await params;
    const todo = await Todo.findByIdAndUpdate(
      id,
      {
        ...updates,
        createdAt: updates.createdAt ? new Date(updates.createdAt) : undefined,
        ongoingStartTime: updates.ongoingStartTime
          ? new Date(updates.ongoingStartTime)
          : undefined,
        completedAt: updates.completedAt
          ? new Date(updates.completedAt)
          : undefined,
      },
      { new: true }
    );

    if (!todo) {
      return NextResponse.json({ message: "Todo not found" }, { status: 404 });
    }

    return NextResponse.json(todo);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message ?? "Failed to update todo" },
      { status: 400 }
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const result = await Todo.findByIdAndDelete(id);

    if (!result) {
      return NextResponse.json({ message: "Todo not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message ?? "Failed to delete todo" },
      { status: 400 }
    );
  }
}
