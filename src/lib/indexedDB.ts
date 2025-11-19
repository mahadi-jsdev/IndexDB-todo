"use client";

const BASE_URL = "/api/todos";
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const jsonHeaders = {
  "Content-Type": "application/json",
};

const normalizeTodo = (todo: any) => ({
  ...todo,
  id: todo._id ?? todo.id,
});

async function handleResponse(response: Response) {
  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json();
      message = data?.message ?? message;
    } catch (_error) {
      // no-op
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getAllTodos() {
  const response = await fetch(BASE_URL, {
    cache: "no-store",
  });
  const todos = await handleResponse(response);
  return Array.isArray(todos) ? todos.map(normalizeTodo) : [];
}

export async function addOrUpdateTodo(todo: any) {
  const payload = {
    text: todo.text,
    status: todo.status ?? "todo",
    createdAt: todo.createdAt,
    ongoingStartTime: todo.ongoingStartTime,
    completedAt: todo.completedAt,
    image: todo.image,
  };

  const isExistingTodo =
    typeof todo.id === "string" && OBJECT_ID_REGEX.test(todo.id);

  const response = await fetch(
    isExistingTodo ? `${BASE_URL}/${todo.id}` : BASE_URL,
    {
      method: isExistingTodo ? "PUT" : "POST",
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    }
  );

  const result = await handleResponse(response);
  return normalizeTodo(result);
}

export async function deleteTodoFromDB(id: string) {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });
  await handleResponse(response);
}

export async function exportData() {
  const todos = await getAllTodos();

  const exportData = {
    todos,
    exportDate: new Date().toISOString(),
    version: "1.0",
  };

  return JSON.stringify(exportData, null, 2);
}

export async function importData(jsonData: string) {
  try {
    const data = JSON.parse(jsonData);

    if (!data.todos || !Array.isArray(data.todos)) {
      throw new Error("Invalid data format: todos array is missing");
    }

    const response = await fetch(`${BASE_URL}/import`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ todos: data.todos }),
    });

    const result = await handleResponse(response);
    return {
      success: true,
      message: result?.message ?? `Imported ${data.todos.length} todos`,
    };
  } catch (error) {
    console.error("Import error:", error);
    return {
      success: false,
      message: `Import failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
