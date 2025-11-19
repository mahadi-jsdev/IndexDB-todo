import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import Todo from "@/models/Todo";

export async function POST(request: Request) {
  try {
    const { todos } = await request.json();

    if (!Array.isArray(todos)) {
      return NextResponse.json(
        { message: "Invalid payload: todos array missing" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    await Todo.deleteMany({});

    if (todos.length > 0) {
      const normalizedTodos = todos.map((todo) => ({
        text: todo.text,
        status: todo.status ?? "todo",
        createdAt: todo.createdAt ? new Date(todo.createdAt) : new Date(),
        ongoingStartTime: todo.ongoingStartTime
          ? new Date(todo.ongoingStartTime)
          : undefined,
        completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
        image: todo.image,
      }));

      await Todo.insertMany(normalizedTodos);
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${todos.length} todos`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message ?? "Failed to import data" },
      { status: 400 }
    );
  }
}
