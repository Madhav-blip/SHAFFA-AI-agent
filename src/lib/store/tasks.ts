import { create } from "zustand";
import type { Category, Task, TaskStatus } from "@/lib/types";
import { seedTasks } from "@/lib/data/seed";

export type TaskView = "kanban" | "list";

interface TaskState {
  tasks: Task[];
  view: TaskView;
  filter: Category | "All";
  addTask: (task: Task) => void;
  moveTask: (id: string, status: TaskStatus) => void;
  removeTask: (id: string) => void;
  setView: (view: TaskView) => void;
  setFilter: (filter: Category | "All") => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: seedTasks,
  view: "kanban",
  filter: "All",
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  moveTask: (id, status) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id
          ? { ...t, status, completedAt: status === "done" ? new Date().toISOString() : undefined }
          : t,
      ),
    })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  setView: (view) => set({ view }),
  setFilter: (filter) => set({ filter }),
}));
