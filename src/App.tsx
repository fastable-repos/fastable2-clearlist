import { useState, useEffect, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

interface Todo {
  id: string
  text: string
  completed: boolean
  archived: boolean
  createdAt: string
}

interface CategoryData {
  todos: Todo[]
}

type CategoryKey = 'work' | 'personal' | 'shopping'

interface AppData {
  categories: Record<CategoryKey, CategoryData>
}

// ── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'clearlist_data'

const CATEGORIES: { key: CategoryKey; label: string; emoji: string }[] = [
  { key: 'work', label: 'Work', emoji: '💼' },
  { key: 'personal', label: 'Personal', emoji: '🙂' },
  { key: 'shopping', label: 'Shopping', emoji: '🛒' },
]

const DEFAULT_DATA: AppData = {
  categories: {
    work: { todos: [] },
    personal: { todos: [] },
    shopping: { todos: [] },
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DATA
    const parsed = JSON.parse(raw) as AppData
    return parsed
  } catch (err) {
    console.error('Failed to load data from localStorage:', err)
    return DEFAULT_DATA
  }
}

function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save data to localStorage:', err)
  }
}

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [data, setData] = useState<AppData>(loadData)
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('work')
  const [inputText, setInputText] = useState('')
  const [inputError, setInputError] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  // Persist on every change
  useEffect(() => {
    saveData(data)
  }, [data])

  // Reset archived view when switching category
  const handleCategoryChange = useCallback((cat: CategoryKey) => {
    setActiveCategory(cat)
    setShowArchived(false)
    setInputText('')
    setInputError(false)
  }, [])

  const currentTodos = data.categories[activeCategory].todos
  const activeTodos = currentTodos.filter((t) => !t.archived)
  const archivedTodos = currentTodos.filter((t) => t.archived)

  // ── Actions ──────────────────────────────────────────────────────────────

  const updateCategory = useCallback(
    (cat: CategoryKey, updater: (todos: Todo[]) => Todo[]) => {
      setData((prev) => ({
        ...prev,
        categories: {
          ...prev.categories,
          [cat]: {
            todos: updater(prev.categories[cat].todos),
          },
        },
      }))
    },
    []
  )

  const addTodo = useCallback(() => {
    const text = inputText.trim()
    if (!text) {
      setInputError(true)
      return
    }
    setInputError(false)
    const newTodo: Todo = {
      id: generateId(),
      text,
      completed: false,
      archived: false,
      createdAt: new Date().toISOString(),
    }
    updateCategory(activeCategory, (todos) => [newTodo, ...todos])
    setInputText('')
  }, [inputText, activeCategory, updateCategory])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') addTodo()
    },
    [addTodo]
  )

  const toggleComplete = useCallback(
    (id: string) => {
      updateCategory(activeCategory, (todos) =>
        todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      )
    },
    [activeCategory, updateCategory]
  )

  const archiveTodo = useCallback(
    (id: string) => {
      updateCategory(activeCategory, (todos) =>
        todos.map((t) => (t.id === id ? { ...t, archived: true } : t))
      )
    },
    [activeCategory, updateCategory]
  )

  const deleteTodo = useCallback(
    (id: string) => {
      updateCategory(activeCategory, (todos) => todos.filter((t) => t.id !== id))
    },
    [activeCategory, updateCategory]
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-lg mb-6 text-center">
        <h1 className="text-3xl font-bold text-indigo-600 tracking-tight">ClearList</h1>
        <p className="text-sm text-gray-500 mt-1">Your personal task organizer</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-md overflow-hidden">
        {/* Category Tabs */}
        <div className="flex border-b border-gray-200 px-4 pt-4 gap-2" role="tablist">
          {CATEGORIES.map(({ key, label, emoji }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeCategory === key}
              data-testid={`tab-${key}`}
              onClick={() => handleCategoryChange(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors focus:outline-none ${
                activeCategory === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Active Todos */}
        <div className="px-4 pt-4 pb-2">
          {activeTodos.length === 0 ? (
            <div
              data-testid="empty-state"
              className="text-center py-10 text-gray-400"
            >
              <p className="text-4xl mb-3">✅</p>
              <p className="font-medium">No tasks here!</p>
              <p className="text-sm mt-1">Add a task below to get started.</p>
            </div>
          ) : (
            <ul className="space-y-2" data-testid="active-list">
              {activeTodos.map((todo) => (
                <li
                  key={todo.id}
                  data-testid="todo-item"
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-colors group"
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleComplete(todo.id)}
                    data-testid="todo-checkbox"
                    aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 accent-indigo-600 cursor-pointer flex-shrink-0"
                  />

                  {/* Text */}
                  <span
                    data-testid="todo-text"
                    className={`flex-1 text-sm ${
                      todo.completed
                        ? 'line-through text-gray-400'
                        : 'text-gray-700'
                    }`}
                  >
                    {todo.text}
                  </span>

                  {/* Archive button — only visible when completed */}
                  {todo.completed && (
                    <button
                      onClick={() => archiveTodo(todo.id)}
                      data-testid="archive-btn"
                      aria-label={`Archive "${todo.text}"`}
                      title="Archive"
                      className="text-xs text-gray-400 hover:text-indigo-500 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      Archive
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add Todo Input */}
        <div className="px-4 pb-4 pt-2">
          <div
            className={`flex items-center gap-2 border rounded-xl px-3 py-2 transition-colors ${
              inputError
                ? 'border-red-400 bg-red-50'
                : 'border-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100'
            }`}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value)
                if (e.target.value.trim()) setInputError(false)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Add a new task..."
              data-testid="todo-input"
              aria-label="New task input"
              className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
            />
            <button
              onClick={addTodo}
              data-testid="add-btn"
              aria-label="Add task"
              className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors font-bold text-lg leading-none"
            >
              +
            </button>
          </div>
          {inputError && (
            <p
              data-testid="input-error"
              className="text-xs text-red-500 mt-1 ml-1"
            >
              Please enter a task before adding.
            </p>
          )}
        </div>

        {/* Show Archived Toggle */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowArchived((prev) => !prev)}
            data-testid="toggle-archived"
            className="text-xs text-gray-400 hover:text-indigo-500 flex items-center gap-1 transition-colors"
          >
            <span>{showArchived ? '▲' : '▼'}</span>
            <span>{showArchived ? 'Hide Archived' : 'Show Archived'}</span>
            {archivedTodos.length > 0 && (
              <span className="ml-1 bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 text-xs font-medium">
                {archivedTodos.length}
              </span>
            )}
          </button>

          {/* Archived List */}
          {showArchived && (
            <div
              data-testid="archived-section"
              className="mt-3 border-t border-dashed border-gray-200 pt-3"
            >
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Archived
              </p>
              {archivedTodos.length === 0 ? (
                <p className="text-sm text-gray-400 py-3 text-center">
                  No archived tasks in this category.
                </p>
              ) : (
                <ul className="space-y-2" data-testid="archived-list">
                  {archivedTodos.map((todo) => (
                    <li
                      key={todo.id}
                      data-testid="archived-item"
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                    >
                      <span
                        data-testid="archived-text"
                        className="flex-1 text-sm line-through text-gray-400"
                      >
                        {todo.text}
                      </span>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        data-testid="delete-btn"
                        aria-label={`Delete "${todo.text}"`}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors font-medium"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
