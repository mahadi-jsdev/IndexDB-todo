"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  addOrUpdateTodo,
  deleteTodoFromDB,
  exportData,
  getAllTodos,
  importData,
} from "@/lib/indexedDB"; // Mongo-backed todo API helpers
import {
  CheckCircle,
  Clock,
  Download,
  ImageIcon,
  ListTodo,
  Play,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

interface TodoItem {
  id: string;
  text: string;
  status: "todo" | "planned" | "ongoing" | "done";
  createdAt: Date;
  ongoingStartTime?: Date;
  completedAt?: Date;
  image?: string;
}

const toTodoItem = (todo: any): TodoItem => ({
  id: todo.id ?? todo._id ?? crypto.randomUUID(),
  text: todo.text ?? "",
  status: todo.status ?? "todo",
  createdAt: todo.createdAt ? new Date(todo.createdAt) : new Date(),
  ongoingStartTime: todo.ongoingStartTime
    ? new Date(todo.ongoingStartTime)
    : undefined,
  completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
  image: todo.image,
});

const markdownBaseClass =
  "space-y-2 text-sm leading-relaxed break-words font-medium [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_pre]:bg-gray-900 [&_pre]:text-white [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_a]:text-purple-600 [&_a]:underline [&_a]:underline-offset-2";

const TodoApp = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTodo, setNewTodo] = useState("");
  const [isPastingImage, setIsPastingImage] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [expandedTodo, setExpandedTodo] = useState<TodoItem | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const renderMarkdown = (content: string, extraClass = "") => {
    if (!content.trim()) {
      return (
        <p className={`text-sm italic text-gray-400 ${extraClass}`}>
          No description provided.
        </p>
      );
    }

    return (
      <div className={`${markdownBaseClass} ${extraClass}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ node, ...props }) => (
              <a {...props} target="_blank" rel="noreferrer" />
            ),
            img: ({ node, ...props }) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                {...props}
                className={`my-3 max-h-60 w-full rounded-lg object-cover ${
                  props.className || ""
                }`}
                alt={(props.alt as string) || "Todo image"}
              />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const loadTodos = useCallback(async () => {
    setIsLoading(true);
    try {
      const savedTodos = await getAllTodos();
      const parsedTodos = savedTodos.map(toTodoItem);
      setTodos(parsedTodos);
    } catch (error: any) {
      console.error("Error loading data from MongoDB:", error);
      toast.error("Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
        console.log("clicked");
        event.preventDefault();
        setIsAddDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!isAddDialogOpen) return;

    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => clearTimeout(timeout);
  }, [isAddDialogOpen]);

  // No need for a separate useEffect to save todos,
  // as each modification function will directly update MongoDB via the API.

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
          reader.onload = async (event) => {
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

            const todoPayload = {
              text: text.replace(/^(plan|going|done)\s+/i, ""),
              status,
              createdAt: new Date(),
              image: imageDataUrl,
            };

            try {
              const savedTodo = await addOrUpdateTodo(todoPayload);
              const normalizedTodo = toTodoItem(savedTodo);
              setTodos((prevTodos) => [...prevTodos, normalizedTodo]);
              setNewTodo("");
              toast.success("Image todo added!");
            } catch (error) {
              console.error("Error creating image todo:", error);
              toast.error("Failed to add image todo.");
            } finally {
              setIsPastingImage(false);
            }
          };
          reader.readAsDataURL(blob);
        }
        break;
      }
    }
  };

  const addTodo = async () => {
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

    const todoPayload = {
      text: text.replace(/^(plan|going|done)\s+/i, ""),
      status,
      createdAt: new Date(),
    };

    try {
      const savedTodo = await addOrUpdateTodo(todoPayload);
      const normalizedTodo = toTodoItem(savedTodo);
      setTodos((prevTodos) => [...prevTodos, normalizedTodo]);
      setNewTodo("");
      toast.success("Todo added!");
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error creating todo:", error);
      toast.error("Failed to add todo.");
    }
  };

  const handleNewTodoKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      addTodo();
    }
  };

  const handleAddDialogChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setNewTodo("");
      setIsPastingImage(false);
    }
  };

  const openTodoDetails = (todo: TodoItem) => setExpandedTodo(todo);
  const closeTodoDetails = () => setExpandedTodo(null);

  const updateStatus = async (
    id: string,
    newStatus: "todo" | "planned" | "ongoing" | "done"
  ) => {
    const existingTodo = todos.find((todo) => todo.id === id);
    if (!existingTodo) return;

    const updatedTodo: TodoItem = { ...existingTodo, status: newStatus };

    if (newStatus === "ongoing" && !existingTodo.ongoingStartTime) {
      updatedTodo.ongoingStartTime = new Date();
    } else if (newStatus !== "ongoing") {
      updatedTodo.ongoingStartTime = undefined;
    }

    if (newStatus === "done" && !existingTodo.completedAt) {
      updatedTodo.completedAt = new Date();
    } else if (newStatus !== "done") {
      updatedTodo.completedAt = undefined;
    }

    try {
      const savedTodo = await addOrUpdateTodo(updatedTodo);
      const normalizedTodo = toTodoItem(savedTodo);
      setTodos((prevTodos) =>
        prevTodos.map((todo) => (todo.id === id ? normalizedTodo : todo))
      );
      toast.info("Status updated!");
    } catch (error) {
      console.error("Error updating todo status:", error);
      toast.error("Failed to update status.");
      await loadTodos();
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await deleteTodoFromDB(id);
      setTodos((prevTodos) =>
        prevTodos.filter((todo: TodoItem) => todo.id !== id)
      );
      toast.error("Todo deleted!");
    } catch (error) {
      console.error("Error deleting todo:", error);
      toast.error("Failed to delete todo.");
    }
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-blue-100 text-blue-700";
      case "planned":
        return "bg-purple-100 text-purple-700";
      case "ongoing":
        return "bg-yellow-100 text-yellow-800";
      case "done":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
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

  const statusSequence: TodoItem["status"][] = [
    "todo",
    "planned",
    "ongoing",
    "done",
  ];

  const cycleStatus = (currentStatus: TodoItem["status"]) => {
    const currentIndex = statusSequence.indexOf(currentStatus);
    const nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + 1) % statusSequence.length;
    return statusSequence[nextIndex];
  };

  const getStatusBorderClass = (status: TodoItem["status"]) => {
    switch (status) {
      case "todo":
        return "border-blue-200";
      case "planned":
        return "border-purple-200";
      case "ongoing":
        return "border-yellow-200";
      case "done":
        return "border-green-200";
      default:
        return "border-gray-200";
    }
  };

  const getStatusBackgroundClass = (status: TodoItem["status"]) => {
    switch (status) {
      case "todo":
        return "bg-blue-200/80";
      case "planned":
        return "bg-purple-200/80";
      case "ongoing":
        return "bg-yellow-200/80";
      case "done":
        return "bg-green-200/80";
      default:
        return "bg-gray-100/90";
    }
  };

  const [statusFilter, setStatusFilter] = useState<TodoItem["status"] | "all">(
    "all"
  );

  const filteredAndSortedTodos = useMemo(() => {
    if (!todos || !Array.isArray(todos)) {
      return [];
    }

    const statusFiltered =
      statusFilter === "all"
        ? todos
        : todos.filter((todo) => todo.status === statusFilter);

    return [...statusFiltered].sort((a, b) => {
      if (statusFilter === "all") {
        const statusDiff =
          statusSequence.indexOf(a.status) - statusSequence.indexOf(b.status);
        if (statusDiff !== 0) return statusDiff;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [todos, statusFilter]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTodos([...todos]); // Trigger re-render to update elapsed time
    }, 1000);

    return () => clearInterval(interval);
  }, [todos]);

  const getCompletionTime = (completedAt?: Date): string => {
    if (!completedAt) return "";
    return `Completed: ${completedAt.toLocaleString()}`;
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `todo-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data.");
    }
  };

  const handleImport = () => {
    // Show confirmation dialog
    if (todos.length > 0) {
      const confirmed = window.confirm(
        "Importing data will replace all existing todos. This action cannot be undone. Are you sure you want to continue?"
      );
      if (!confirmed) return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const result = await importData(text);

        if (result.success) {
          await loadTodos();
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        console.error("Import error:", error);
        toast.error("Failed to import data.");
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-[100rem] mx-auto">
        <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
          <DialogContent className="max-w-3xl space-y-4">
            <DialogHeader>
              <DialogTitle>Add a new todo</DialogTitle>
              <DialogDescription>
                Supports Markdown, inline images (Ctrl+V), and Ctrl/Cmd+Enter to
                save quickly.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="relative">
                <Textarea
                  ref={inputRef}
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="Write your todo details..."
                  className="min-h-[180px] pr-10"
                  onKeyDown={handleNewTodoKeyDown}
                  onPaste={handlePaste}
                  spellCheck
                  aria-label="New todo description"
                  disabled={isPastingImage}
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => handleAddDialogChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={addTodo}
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isPastingImage || !newTodo.trim()}
              >
                {isPastingImage ? (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add Todo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Data Utilities */}
        <div className="mb-6 flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            className="flex items-center gap-1"
          >
            <Upload className="w-4 h-4" />
            Import
          </Button>
        </div>

        {/* Todo Grid */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg text-white font-semibold">Todos</h2>
              <p className="text-sm text-gray-500">
                Click a status chip to cycle through states.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <button
                type="button"
                className={`flex items-center gap-1 rounded-full border px-3 py-1 transition ${
                  statusFilter === "all"
                    ? "border-purple-400 bg-purple-50 text-purple-700 shadow-sm"
                    : "border-transparent bg-white text-gray-500 hover:border-purple-200 hover:text-purple-600"
                }`}
                onClick={() => setStatusFilter("all")}
              >
                All ({todos.length})
              </button>
              {statusSequence.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 transition ${
                    statusFilter === status
                      ? "border-purple-400 bg-purple-50 text-purple-700 shadow-sm"
                      : "border-transparent bg-white text-gray-500 hover:border-purple-200 hover:text-purple-600"
                  }`}
                >
                  {getStatusIcon(status)}
                  <span className="capitalize">
                    {status} (
                    {todos.filter((todo) => todo.status === status).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-4 rounded-2xl border border-purple-100 bg-white/60 p-4 shadow-sm animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-6 w-20 rounded-full bg-purple-100/80" />
                    <div className="h-3 w-16 rounded-full bg-gray-100" />
                  </div>
                  <div className="h-24 w-full rounded-xl bg-gray-100/80" />
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded-full bg-gray-100" />
                    <div className="h-3 w-5/6 rounded-full bg-gray-100" />
                    <div className="h-3 w-3/4 rounded-full bg-gray-100" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-16 rounded-full bg-gray-100" />
                    <div className="h-6 w-20 rounded-full bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedTodos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-purple-200 bg-white/80 p-10 text-center text-gray-500">
              No todos match this filter yet. Add one above to get started!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
              {filteredAndSortedTodos.map((todo) => (
                <div
                  key={todo.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openTodoDetails(todo)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openTodoDetails(todo);
                    }
                  }}
                  className={`group relative flex flex-col max-h-fit rounded-2xl border ${getStatusBorderClass(
                    todo.status
                  )} ${getStatusBackgroundClass(
                    todo.status
                  )} p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-300`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${getStatusBadgeClass(
                        todo.status
                      )}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextStatus = cycleStatus(todo.status);
                        updateStatus(todo.id, nextStatus);
                      }}
                    >
                      {getStatusIcon(todo.status)}
                      {todo.status}
                    </button>
                    <span className="text-xs text-gray-900">
                      {todo.createdAt.toLocaleDateString()}
                    </span>
                  </div>

                  {todo.image && (
                    <div
                      className="mt-3 overflow-hidden rounded-xl border border-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullscreenImage(todo.image!);
                      }}
                    >
                      <Image
                        src={todo.image}
                        alt="Todo image"
                        width={400}
                        height={250}
                        className="h-40 w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                      />
                    </div>
                  )}

                  <div className="mt-3 text-lg text-black font-medium">
                    {renderMarkdown(todo.text)}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {todo.ongoingStartTime && (
                      <span className="flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1 text-[11px] font-medium text-yellow-700">
                        <Clock className="h-3 w-3" />
                        {getElapsedTime(todo.ongoingStartTime)}
                      </span>
                    )}
                    {todo.completedAt && (
                      <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        {getCompletionTime(todo.completedAt)}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-end justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-700 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTodo(todo.id);
                      }}
                    >
                      <Trash2 className="!h-5 !w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Todo Modal */}
      {expandedTodo && (
        <div
          className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-black/70 p-4"
          onClick={closeTodoDetails}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute right-4 top-4 rounded-full bg-gray-100 p-2 text-gray-600 transition hover:bg-gray-200"
              onClick={closeTodoDetails}
              aria-label="Close todo details"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                  expandedTodo.status
                )}`}
              >
                {expandedTodo.status}
              </span>
              <span className="text-xs text-gray-500">
                Created {expandedTodo.createdAt.toLocaleString()}
              </span>
            </div>
            <div className="mb-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
              {expandedTodo.ongoingStartTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span>
                    In progress for{" "}
                    {getElapsedTime(expandedTodo.ongoingStartTime)}
                  </span>
                </div>
              )}
              {expandedTodo.completedAt && (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>{getCompletionTime(expandedTodo.completedAt)}</span>
                </div>
              )}
            </div>
            <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-2">
              {expandedTodo.image && (
                <Image
                  src={expandedTodo.image}
                  alt="Todo attachment"
                  width={1200}
                  height={800}
                  className="h-auto max-h-[24rem] w-full cursor-pointer rounded-xl object-cover"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenImage(expandedTodo.image!);
                  }}
                />
              )}
              <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4">
                {renderMarkdown(expandedTodo.text, "text-base")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 w-screen h-screen bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
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
              width={1920}
              height={1080}
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoApp;
