"use client";

import { IDBPDatabase, openDB } from "idb";

const DB_NAME = "todo-app-db";
const DB_VERSION = 1;
const TODO_STORE_NAME = "todos";
const TAG_STORE_NAME = "tags";

let db: IDBPDatabase | null = null;

async function initDB() {
  if (!db) {
    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(TODO_STORE_NAME)) {
          db.createObjectStore(TODO_STORE_NAME, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(TAG_STORE_NAME)) {
          db.createObjectStore(TAG_STORE_NAME, { keyPath: "name" }); // Tags will have a 'name' property as key
        }
      },
    });
  }
  return db;
}

export async function addOrUpdateTodo(todo: any) {
  const db = await initDB();
  return db.put(TODO_STORE_NAME, todo);
}

export async function getTodo(id: string) {
  const db = await initDB();
  return db.get(TODO_STORE_NAME, id);
}

export async function getAllTodos() {
  const db = await initDB();
  return db.getAll(TODO_STORE_NAME);
}

export async function deleteTodoFromDB(id: string) {
  const db = await initDB();
  return db.delete(TODO_STORE_NAME, id);
}

export async function addOrUpdateTag(tag: { name: string }) {
  const db = await initDB();
  return db.put(TAG_STORE_NAME, tag);
}

export async function getAllTags() {
  const db = await initDB();
  const tags = await db.getAll(TAG_STORE_NAME);
  return tags.map((tag) => tag.name); // Return just the tag names
}

export async function deleteTagFromDB(name: string) {
  const db = await initDB();
  return db.delete(TAG_STORE_NAME, name);
}

// Export all data to JSON
export async function exportData() {
  const todos = await getAllTodos();
  const tags = await getAllTags();

  const exportData = {
    todos,
    tags,
    exportDate: new Date().toISOString(),
    version: "1.0",
  };

  return JSON.stringify(exportData, null, 2);
}

// Import data from JSON
export async function importData(jsonData: string) {
  try {
    const data = JSON.parse(jsonData);

    // Validate the data structure
    if (!data.todos || !Array.isArray(data.todos)) {
      throw new Error("Invalid data format: todos array is missing");
    }

    if (!data.tags || !Array.isArray(data.tags)) {
      throw new Error("Invalid data format: tags array is missing");
    }

    // Clear existing data
    const db = await initDB();
    await db.clear(TODO_STORE_NAME);
    await db.clear(TAG_STORE_NAME);

    // Import todos
    for (const todo of data.todos) {
      await addOrUpdateTodo(todo);
    }

    // Import tags
    for (const tag of data.tags) {
      await addOrUpdateTag({ name: tag });
    }

    return {
      success: true,
      message: `Imported ${data.todos.length} todos and ${data.tags.length} tags`,
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
