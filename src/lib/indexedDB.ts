"use client";

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'todo-app-db';
const DB_VERSION = 1;
const TODO_STORE_NAME = 'todos';
const TAG_STORE_NAME = 'tags';

let db: IDBPDatabase | null = null;

async function initDB() {
  if (!db) {
    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(TODO_STORE_NAME)) {
          db.createObjectStore(TODO_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(TAG_STORE_NAME)) {
          db.createObjectStore(TAG_STORE_NAME, { keyPath: 'name' }); // Tags will have a 'name' property as key
        }
      },
    });o
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
  return tags.map(tag => tag.name); // Return just the tag names
}

export async function deleteTagFromDB(name: string) {
  const db = await initDB();
  return db.delete(TAG_STORE_NAME, name);
}