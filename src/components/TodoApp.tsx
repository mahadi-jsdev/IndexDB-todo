"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Play,
  CheckCircle,
  Clock,
  ImageIcon,
  X,
  Tag,
  ListTodo,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface TodoItem {
  id: string;
  text: string;
  status: "todo" | "planned" | "ongoing" | "done";
  createdAt: Date;
  ongoingStartTime?: Date;
  completedAt?: Date;
  image?: string;
  tag?: string;
}

const TodoApp = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [isPastingImage, setIsPastingImage] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [showTagManager, setShowTagManager] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTodos = localStorage.getItem("todos");
    if (savedTodos) {
      try {
        const parsedTodos = JSON.parse(savedTodos).map((todo: any) => ({
          ...todo,
          createdAt: new Date(todo.createdAt),
          ongoingStartTime: todo.ongoingStartTime
            ? new Date(todo.ongoingStartTime)
            : undefined,
          completedAt: todo.completedAt
            ? new Date(todo.completedAt)
            : undefined,
          tag: todo.tag || undefined,
        }));
        setTodos(parsedTodos);
      } catch (error: any) {
        console.error("Error parsing todos:", error);
        setTodos([]);
      }
    }

    const savedTags = localStorage.getItem("tags");
    if (savedTags) {
      try {
        setTags(JSON.parse(savedTags));
      } catch (error: any) {
        console.error("Error parsing tags:", error);
        setTags([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem("tags", JSON.stringify(tags));
  }, [tags]);

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        setIsPastingImage(true);

        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageDataUrl = event.target?.result as string;

            const text = newTodo.trim() || "Image todo";
            let status: "todo" | "planned" | "ongoing" | "done" = "todo";

            if (text.toLowerCase().startsWith("plan ")) {
              status = "planned";
            } else if (text.toLowerCase().startsWith("going ")) {
              status = "ongoing";
            } else if (text.toLowerCase().startsWith("done ")) {
              status = "done";
            }

            const todo: TodoItem = {
              id: Date.now().toString(),
              text: text.replace(/^(plan|going|done)\s+/i, ""),
              status,
              createdAt: new Date(),
              image: imageDataUrl,
              tag: selectedTag !== null ? selectedTag : undefined,
            };

            setTodos([...todos, todo]);
            setNewTodo("");
            setIsPastingImage(false);
            toast.success("Image todo added!");
          };
          reader.readAsDataURL(blob);
        }
        break;
      }
    }
  };

  const addTodo = () => {
    if (!newTodo.trim() && !isPastingImage) return;

    const text = newTodo.trim();
    let status: "todo" | "planned" | "ongoing" | "done" = "todo";

    if (text.toLowerCase().startsWith("plan ")) {
      status = "planned";
    } else if (text.toLowerCase().startsWith("going ")) {
      status = "ongoing";
    } else if (text.toLowerCase().startsWith("done ")) {
      status = "done";
    }

    const todo: TodoItem = {
      id: Date.now().toString(),
      text: text.replace(/^(plan|going|done)\s+/i, ""),
      status,
      createdAt: new Date(),
      tag: selectedTag !== null ? selectedTag : undefined,
    };

    setTodos([...todos, todo]);
    setNewTodo("");
    toast.success("Todo added!");
  };

  const updateStatus = (
    id: string,
    newStatus: "todo" | "planned" | "ongoing" | "done",
  ) => {
    setTodos(
      todos.map((todo: TodoItem) => {
        if (todo.id === id) {
          const updatedTodo = { ...todo, status: newStatus };

          if (newStatus === "ongoing" && !todo.ongoingStartTime) {
            updatedTodo.ongoingStartTime = new Date();
          }

          if (newStatus !== "ongoing" && todo.ongoingStartTime) {
            updatedTodo.ongoingStartTime = undefined;
          }

          if (newStatus === "done" && !todo.completedAt) {
            updatedTodo.completedAt = new Date();
          }

          if (newStatus !== "done" && todo.completedAt) {
            updatedTodo.completedAt = undefined;
          }

          return updatedTodo;
        }
        return todo;
      }),
    );
    toast.info("Status updated!");
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo: TodoItem) => todo.id !== id));
    toast.error("Todo deleted!");
  };

  const getElapsedTime = (startTime?: Date): string => {
    if (!startTime) return "";

    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-blue-100 border-blue-300";
      case "planned":
        return "bg-purple-100 border-purple-300";
      case "ongoing":
        return "bg-yellow-100 border-yellow-300";
      case "done":
        return "bg-green-100 border-green-300";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return <Plus className="w-4 h-4" />;
      case "planned":
        return <ListTodo className="w-4 h-4" />;
      case "ongoing":
        return <Play className="w-4 h-4" />;
      case "done":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Plus className="w-4 h-4" />;
    }
  };

  const filteredTodos = (status: "todo" | "planned" | "ongoing" | "done") => {
    if (!todos || !Array.isArray(todos)) return [];

    return todos.filter((todo: TodoItem) => {
      if (!todo) return false;
      const statusMatch = todo.status === status;
      const tagMatch = selectedTag ? todo.tag === selectedTag : true;
      return statusMatch && tagMatch;
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTodos([...todos]);
    }, 1000);

    return () => clearInterval(interval);
  }, [todos]);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
      toast.success(`Tag "${newTag.trim()}" added!`);
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the tag "${tagToRemove}"? This will remove it from all todos.`,
      )
    ) {
      setTags(tags.filter((t: string) => t !== tagToRemove));
      setTodos(
        todos.map((todo: TodoItem) => ({
          ...todo,
          tag: todo.tag === tagToRemove ? undefined : todo.tag,
        })),
      );
      toast.success(`Tag "${tagToRemove}" deleted!`);
    }
  };

  const removeTagFromTodo = (todoId: string) => {
    setTodos(
      todos.map((todo: TodoItem) => {
        if (todo.id === todoId) {
          return { ...todo, tag: undefined };
        }
        return todo;
      }),
    );
    toast.success(`Tag removed from todo!`);
  };

  const getCompletionTime = (completedAt?: Date): string => {
    if (!completedAt) return "";
    return `Completed: ${completedAt.toLocaleString()}`;
  };

  const getTagUsageCount = (tag: string): number => {
    return todos.filter((todo: TodoItem) => todo.tag === tag).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-purple-600">
          Todo List
        </h1>

        {/* Add Todo Input */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder={`Type your todo or paste an image (Ctrl+V)... ${selectedTag ? `[Tag: ${selectedTag}]` : ""}`}
              className="pr-10"
              onKeyPress={(e) => e.key === "Enter" && addTodo()}
              onPaste={handlePaste}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <ImageIcon className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <Button
            onClick={addTodo}
            className="bg-purple-600 hover:bg-purple-700"
            disabled={isPastingImage}
          >
            {isPastingImage ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add
          </Button>
        </div>

        {/* Tags Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Tags</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTagManager(!showTagManager)}
            >
              {showTagManager ? "Hide Manager" : "Manage Tags"}
            </Button>
          </div>

          {showTagManager && (
            <div className="bg-white p-4 rounded-lg border mb-4">
              <h3 className="font-medium mb-3">Tag Manager</h3>
              {tags.length === 0 ? (
                <p className="text-gray-500 text-sm">No tags created yet.</p>
              ) : (
                <div className="space-y-2">
                  {tags.map((tag: string) => (
                    <div
                      key={tag}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-600" />
                        <span className="font-medium">{tag}</span>
                        <span className="text-xs text-gray-500">
                          ({getTagUsageCount(tag)}{" "}
                          {getTagUsageCount(tag) === 1 ? "todo" : "todos"})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTag(tag)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-2">
            <span className="font-medium">Filter by:</span>
            <Button
              variant={selectedTag === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTag(null)}
              className="h-7"
            >
              All
            </Button>
            {tags &&
              tags.map((tag: string) => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setSelectedTag(tag === selectedTag ? null : tag)
                  }
                  className="h-7 flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </Button>
              ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add new tag"
              className="max-w-xs"
              onKeyPress={(e) => e.key === "Enter" && addTag()}
            />
            <Button onClick={addTag} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Tag
            </Button>
          </div>
        </div>

        {/* Todo Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* To Do Column */}
          <Card className={getStatusColor("todo")}>
            <CardHeader className="bg-blue-200">
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                To Do ({filteredTodos("todo").length})
              </CardTitle>
            </CardHeader>
            <ScrollArea className="h-[550px] rounded-md border">
              <CardContent className="p-4 space-y-3">
                {filteredTodos("todo").map((todo: TodoItem) => (
                  <div
                    key={todo.id}
                    className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm"
                  >
                    {todo.image && (
                      <div
                        className="mb-2 cursor-pointer"
                        onClick={() => setFullscreenImage(todo.image!)}
                      >
                        <Image
                          src={todo.image}
                          alt="Todo image"
                          width={200}
                          height={150}
                          className="w-full h-32 object-cover rounded-md"
                        />
                      </div>
                    )}
                    <p className="text-sm font-medium">{todo.text}</p>

                    {/* Tags for todo */}
                    {todo.tag && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                          {todo.tag}
                          <X
                            className="w-3 h-3 ml-1 cursor-pointer"
                            onClick={() => removeTagFromTodo(todo.id)}
                          />
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => updateStatus(todo.id, "planned")}
                        className="bg-purple-500 hover:bg-purple-600"
                      >
                        <ListTodo className="w-3 h-3 mr-1" />
                        Plan
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => deleteTodo(todo.id)}
                        variant="destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </Card>

          {/* Planned Column */}
          <Card className={getStatusColor("planned")}>
            <CardHeader className="bg-purple-200">
              <CardTitle className="text-purple-800 flex items-center gap-2">
                <ListTodo className="w-5 h-5" />
                Planned ({filteredTodos("planned").length})
              </CardTitle>
            </CardHeader>
            <ScrollArea className="h-[550px] rounded-md border">
              <CardContent className="p-4 space-y-3">
                {filteredTodos("planned").map((todo: TodoItem) => (
                  <div
                    key={todo.id}
                    className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm"
                  >
                    {todo.image && (
                      <div
                        className="mb-2 cursor-pointer"
                        onClick={() => setFullscreenImage(todo.image!)}
                      >
                        <Image
                          src={todo.image}
                          alt="Todo image"
                          width={200}
                          height={150}
                          className="w-full h-32 object-cover rounded-md"
                        />
                      </div>
                    )}
                    <p className="text-sm font-medium">{todo.text}</p>

                    {/* Tags for planned */}
                    {todo.tag && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full flex items-center">
                          {todo.tag}
                          <X
                            className="w-3 h-3 ml-1 cursor-pointer"
                            onClick={() => removeTagFromTodo(todo.id)}
                          />
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => updateStatus(todo.id, "ongoing")}
                        className="bg-yellow-500 hover:bg-yellow-600"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Start
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(todo.id, "todo")}
                        variant="outline"
                        className="text-blue-500 border-blue-500 hover:bg-blue-50"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        To Do
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => deleteTodo(todo.id)}
                        variant="destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </Card>

          {/* Ongoing Column */}
          <Card className={getStatusColor("ongoing")}>
            <CardHeader className="bg-yellow-200">
              <CardTitle className="text-yellow-800 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Ongoing ({filteredTodos("ongoing").length})
              </CardTitle>
            </CardHeader>
            <ScrollArea className="h-[550px] rounded-md border">
              <CardContent className="p-4 space-y-3">
                {filteredTodos("ongoing").map((todo: TodoItem) => (
                  <div
                    key={todo.id}
                    className="bg-white p-3 rounded-lg border border-yellow-200 shadow-sm"
                  >
                    {todo.image && (
                      <div
                        className="mb-2 cursor-pointer"
                        onClick={() => setFullscreenImage(todo.image!)}
                      >
                        <Image
                          src={todo.image}
                          alt="Todo image"
                          width={200}
                          height={150}
                          className="w-full h-32 object-cover rounded-md"
                        />
                      </div>
                    )}
                    <p className="text-sm font-medium">{todo.text}</p>

                    {/* Tags for ongoing */}
                    {todo.tag && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center">
                          {todo.tag}
                          <X
                            className="w-3 h-3 ml-1 cursor-pointer"
                            onClick={() => removeTagFromTodo(todo.id)}
                          />
                        </span>
                      </div>
                    )}

                    {todo.ongoingStartTime && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-yellow-600">
                        <Clock className="w-3 h-3" />
                        <span>{getElapsedTime(todo.ongoingStartTime)}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => updateStatus(todo.id, "done")}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(todo.id, "planned")}
                        variant="outline"
                        className="text-purple-500 border-purple-500 hover:bg-purple-50"
                      >
                        <ListTodo className="w-3 h-3 mr-1" />
                        Plan
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => deleteTodo(todo.id)}
                        variant="destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </Card>

          {/* Done Column */}
          <Card className={getStatusColor("done")}>
            <CardHeader className="bg-green-200">
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Done ({filteredTodos("done").length})
              </CardTitle>
            </CardHeader>
            <ScrollArea className="h-[550px] rounded-md border">
              <CardContent className="p-4 space-y-3">
                {filteredTodos("done").map((todo: TodoItem) => (
                  <div
                    key={todo.id}
                    className="bg-white p-3 rounded-lg border border-green-200 shadow-sm"
                  >
                    {todo.image && (
                      <div
                        className="mb-2 cursor-pointer"
                        onClick={() => setFullscreenImage(todo.image!)}
                      >
                        <Image
                          src={todo.image}
                          alt="Todo image"
                          width={200}
                          height={150}
                          className="w-full h-32 object-cover rounded-md"
                        />
                      </div>
                    )}
                    <p className="text-sm font-medium text-green-600">
                      {todo.text}
                    </p>

                    {/* Tags for done */}
                    {todo.tag && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                          {todo.tag}
                          <X
                            className="w-3 h-3 ml-1 cursor-pointer"
                            onClick={() => removeTagFromTodo(todo.id)}
                          />
                        </span>
                      </div>
                    )}

                    {todo.completedAt && (
                      <div className="text-xs text-green-600 mt-1">
                        {getCompletionTime(todo.completedAt)}
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        onClick={() => updateStatus(todo.id, "todo")}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Reopen
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => deleteTodo(todo.id)}
                        variant="destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-all"
              onClick={() => setFullscreenImage(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <Image
              src={fullscreenImage}
              alt="Fullscreen view"
              width={800}
              height={600}
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoApp;

