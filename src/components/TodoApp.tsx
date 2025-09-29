"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Play, CheckCircle, Clock, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface TodoItem {
  id: string;
  text: string;
  status: 'todo' | 'ongoing' | 'done';
  createdAt: Date;
  ongoingStartTime?: Date;
  image?: string;
}

const TodoApp = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [isPastingImage, setIsPastingImage] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      const parsedTodos = JSON.parse(savedTodos).map((todo: any) => ({
        ...todo,
        createdAt: new Date(todo.createdAt),
        ongoingStartTime: todo.ongoingStartTime ? new Date(todo.ongoingStartTime) : undefined
      }));
      setTodos(parsedTodos);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        setIsPastingImage(true);
        
        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageDataUrl = event.target?.result as string;
            
            // Add todo with image
            const text = newTodo.trim() || 'Image todo';
            let status: 'todo' | 'ongoing' | 'done' = 'todo';

            if (text.toLowerCase().startsWith('going ')) {
              status = 'ongoing';
            } else if (text.toLowerCase().startsWith('done ')) {
              status = 'done';
            }

            const todo: TodoItem = {
              id: Date.now().toString(),
              text: text.replace(/^(going|done)\s+/i, ''),
              status,
              createdAt: new Date(),
              image: imageDataUrl
            };

            setTodos([...todos, todo]);
            setNewTodo('');
            setIsPastingImage(false);
            toast.success('Image todo added!');
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
    let status: 'todo' | 'ongoing' | 'done' = 'todo';

    if (text.toLowerCase().startsWith('going ')) {
      status = 'ongoing';
    } else if (text.toLowerCase().startsWith('done ')) {
      status = 'done';
    }

    const todo: TodoItem = {
      id: Date.now().toString(),
      text: text.replace(/^(going|done)\s+/i, ''),
      status,
      createdAt: new Date()
    };

    setTodos([...todos, todo]);
    setNewTodo('');
    toast.success('Todo added!');
  };

  const updateStatus = (id: string, newStatus: 'todo' | 'ongoing' | 'done') => {
    setTodos(todos.map(todo => {
      if (todo.id === id) {
        const updatedTodo = { ...todo, status: newStatus };
        
        // Set ongoing start time when moving to ongoing
        if (newStatus === 'ongoing' && !todo.ongoingStartTime) {
          updatedTodo.ongoingStartTime = new Date();
        }
        
        // Clear ongoing start time when moving away from ongoing
        if (newStatus !== 'ongoing' && todo.ongoingStartTime) {
          updatedTodo.ongoingStartTime = undefined;
        }
        
        return updatedTodo;
      }
      return todo;
    }));
    toast.info('Status updated!');
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
    toast.error('Todo deleted!');
  };

  const getElapsedTime = (startTime?: Date): string => {
    if (!startTime) return '';
    
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
      case 'todo': return 'bg-blue-100 border-blue-300';
      case 'ongoing': return 'bg-yellow-100 border-yellow-300';
      case 'done': return 'bg-green-100 border-green-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return <Plus className="w-4 h-4" />;
      case 'ongoing': return <Play className="w-4 h-4" />;
      case 'done': return <CheckCircle className="w-4 h-4" />;
      default: return <Plus className="w-4 h-4" />;
    }
  };

  const filteredTodos = (status: 'todo' | 'ongoing' | 'done') => {
    return todos.filter(todo => todo.status === status);
  };

  // Update elapsed time display every second for ongoing tasks
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update elapsed time
      setTodos([...todos]);
    }, 1000);

    return () => clearInterval(interval);
  }, [todos]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-purple-600">
          Todo List
        </h1>

        {/* Add Todo Input */}
        <div className="flex gap-2 mb-8">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Type your todo or paste an image (Ctrl+V)..."
              className="pr-10"
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
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

        {/* Todo Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Todo Column */}
          <Card className={getStatusColor('todo')}>
            <CardHeader className="bg-blue-200">
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                To Do ({filteredTodos('todo').length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {filteredTodos('todo').map(todo => (
                <div key={todo.id} className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm">
                  {todo.image && (
                    <div className="mb-2">
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
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => updateStatus(todo.id, 'ongoing')} className="bg-yellow-500 hover:bg-yellow-600">
                      <Play className="w-3 h-3 mr-1" />
                      Start
                    </Button>
                    <Button size="sm" onClick={() => deleteTodo(todo.id)} variant="destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Ongoing Column */}
          <Card className={getStatusColor('ongoing')}>
            <CardHeader className="bg-yellow-200">
              <CardTitle className="text-yellow-800 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Ongoing ({filteredTodos('ongoing').length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {filteredTodos('ongoing').map(todo => (
                <div key={todo.id} className="bg-white p-3 rounded-lg border border-yellow-200 shadow-sm">
                  {todo.image && (
                    <div className="mb-2">
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
                  {todo.ongoingStartTime && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-yellow-600">
                      <Clock className="w-3 h-3" />
                      <span>{getElapsedTime(todo.ongoingStartTime)}</span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => updateStatus(todo.id, 'done')} className="bg-green-500 hover:bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complete
                    </Button>
                    <Button size="sm" onClick={() => deleteTodo(todo.id)} variant="destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Done Column */}
          <Card className={getStatusColor('done')}>
            <CardHeader className="bg-green-200">
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Done ({filteredTodos('done').length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {filteredTodos('done').map(todo => (
                <div key={todo.id} className="bg-white p-3 rounded-lg border border-green-200 shadow-sm">
                  {todo.image && (
                    <div className="mb-2">
                      <Image
                        src={todo.image}
                        alt="Todo image"
                        width={200}
                        height={150}
                        className="w-full h-32 object-cover rounded-md"
                      />
                    </div>
                  )}
                  <p className="text-sm font-medium text-green-600">{todo.text}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => updateStatus(todo.id, 'todo')} className="bg-blue-500 hover:bg-blue-600">
                      <Plus className="w-3 h-3 mr-1" />
                      Reopen
                    </Button>
                    <Button size="sm" onClick={() => deleteTodo(todo.id)} variant="destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TodoApp;