import { useState, useEffect } from "react";
import { formatDuration, getElapsedSeconds } from "../utils";
import type { Task } from "../types";

interface TaskTimerProps {
  task: Task;
  compact?: boolean;
}

export default function TaskTimer({ task, compact = false }: TaskTimerProps) {
  const [elapsed, setElapsed] = useState(() => getElapsedSeconds(task));

  useEffect(() => {
    setElapsed(getElapsedSeconds(task));
    if (task.status !== "in_progress") return;

    const interval = setInterval(() => {
      setElapsed(getElapsedSeconds(task));
    }, 1000);

    return () => clearInterval(interval);
  }, [task]);

  const estimatedSeconds = task.estimatedMinutes * 60;
  const isOver = elapsed > estimatedSeconds;
  const progress = Math.min((elapsed / estimatedSeconds) * 100, 100);

  if (compact) {
    return (
      <span
        className={`font-mono text-xs tabular-nums ${
          task.status === "in_progress"
            ? isOver
              ? "text-red-400"
              : "text-blue-400"
            : "text-slate-500"
        }`}
      >
        {formatDuration(elapsed)}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.status === "in_progress" && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 timer-running" />
          )}
          <span
            className={`font-mono text-sm tabular-nums font-medium ${
              isOver && task.status === "in_progress" ? "text-red-400" : "text-foreground"
            }`}
          >
            {formatDuration(elapsed)}
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          / {formatDuration(estimatedSeconds)}
        </span>
      </div>
      <div className="h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isOver ? "bg-red-400" : task.status === "in_progress" ? "bg-blue-400" : "bg-slate-600"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
