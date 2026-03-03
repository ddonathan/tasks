import { useMutation, useQuery } from "convex/react";
import { Clock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type TaskStatus = "inbox" | "active" | "backlog" | "done" | "someday";

interface TaskDetailProps {
  taskId: Id<"tasks">;
  onClose: () => void;
}

function ProjectSelector({
  taskId,
  currentProjectId,
}: {
  taskId: Id<"tasks">;
  currentProjectId?: Id<"projects">;
}) {
  const projects = useQuery(api.projects.list, {});
  const updateTask = useMutation(api.tasks.update);
  const createProject = useMutation(api.projects.create);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const currentProject = projects?.find((p) => p._id === currentProjectId);

  const filtered = (projects ?? []).filter((p) =>
    p.name.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const exactMatch = (projects ?? []).some(
    (p) => p.name.toLowerCase() === inputValue.toLowerCase(),
  );

  const handleSelect = (projectId: string) => {
    updateTask({
      id: taskId,
      projectId: projectId ? (projectId as Id<"projects">) : undefined,
    });
    setInputValue("");
    setIsOpen(false);
  };

  const handleCreate = async () => {
    if (!inputValue.trim()) return;
    const newId = await createProject({
      name: inputValue.trim(),
      status: "active",
    });
    updateTask({ id: taskId, projectId: newId });
    setInputValue("");
    setIsOpen(false);
  };

  if (!projects) return null;

  return (
    <div className="detail-field" style={{ position: "relative" }}>
      <label htmlFor="detail-project">Project</label>
      <input
        id="detail-project"
        type="text"
        placeholder={currentProject ? currentProject.name : "Search or create project..."}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          setIsFocused(true);
          setIsOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => {
            setIsFocused(false);
            setIsOpen(false);
          }, 200);
        }}
        style={{
          color: inputValue ? "var(--text)" : "var(--text-muted)",
        }}
      />
      {isOpen && isFocused && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            maxHeight: 200,
            overflowY: "auto",
            zIndex: 100,
            marginTop: 4,
          }}
        >
          {currentProjectId && (
            <button
              type="button"
              onClick={() => handleSelect("")}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "none",
                border: "none",
                borderBottom: "1px solid var(--border)",
                color: "var(--text-muted)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13,
              }}
            >
              ✕ Remove from project
            </button>
          )}
          {filtered.map((p) => (
            <button
              key={p._id}
              type="button"
              onClick={() => handleSelect(p._id)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: p._id === currentProjectId ? "var(--border)" : "none",
                border: "none",
                borderBottom: "1px solid var(--border)",
                color: "var(--text)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {p.color && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: p.color,
                    flexShrink: 0,
                  }}
                />
              )}
              {p.name}
            </button>
          ))}
          {inputValue.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleCreate}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              + Create "{inputValue.trim()}"
            </button>
          )}
          {filtered.length === 0 && !inputValue.trim() && (
            <div style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: 13 }}>
              No projects yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_OPTIONS: TaskStatus[] = ["inbox", "active", "backlog", "done", "someday"];

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function computeEtaGap(
  promised: string | undefined,
  realistic: string | undefined,
): { label: string; className: string } | null {
  if (!promised || !realistic) return null;
  const p = new Date(promised).getTime();
  const r = new Date(realistic).getTime();
  const diffDays = Math.round((r - p) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { label: "On track", className: "green" };
  } else if (diffDays <= 7) {
    return { label: `${diffDays}d gap`, className: "yellow" };
  } else {
    return { label: `${diffDays}d gap`, className: "red" };
  }
}

export default function TaskDetail({ taskId, onClose }: TaskDetailProps) {
  const task = useQuery(api.tasks.get, { id: taskId });
  const updateTask = useMutation(api.tasks.update);
  const moveTask = useMutation(api.tasks.move);
  const addLog = useMutation(api.tasks.addLog);

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [promisedEta, setPromisedEta] = useState("");
  const [realisticEta, setRealisticEta] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [logEntry, setLogEntry] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStartDate(task.startDate ?? "");
      setDueDate(task.dueDate ?? "");
      setFollowUpDate(task.followUpDate ?? "");
      setPromisedEta(task.promisedEta ?? "");
      setRealisticEta(task.realisticEta ?? "");
      setNotes(task.notes);
      setTags([...task.tags]);
    }
  }, [task]);

  if (!task) {
    return (
      <>
        <div
          className="detail-overlay"
          role="none"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        />
        <div className="detail-panel">
          <div className="detail-panel-header">
            <h2>Loading...</h2>
            <button type="button" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>
      </>
    );
  }

  // Live editing: blur handler for text fields
  const handleBlur = (field: string, value: string) => {
    const taskValue = field === "title" ? task.title : field === "notes" ? task.notes : undefined;
    if (value !== taskValue) {
      updateTask({ id: taskId, [field]: value || undefined });
    }
  };

  // Live editing: date fields fire on change
  const handleDateChange = (field: string, value: string) => {
    updateTask({ id: taskId, [field]: value || undefined });
  };

  const handleMove = async (status: TaskStatus) => {
    await moveTask({ id: taskId, status });
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logEntry.trim()) return;
    await addLog({ id: taskId, entry: logEntry.trim() });
    setLogEntry("");
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        const newTags = [...tags, newTag];
        setTags(newTags);
        updateTask({ id: taskId, tags: newTags });
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    updateTask({ id: taskId, tags: newTags });
  };

  const etaGap = computeEtaGap(promisedEta, realisticEta);

  const moveTargets = STATUS_OPTIONS.filter((s) => s !== task.status);

  return (
    <>
      <div
        className="detail-overlay"
        role="none"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      />
      <div className="detail-panel">
        <div className="detail-panel-header">
          <h2>Task Detail</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none" }}>
            <X size={18} />
          </button>
        </div>
        <div className="detail-panel-body">
          {/* Title */}
          <div className="detail-field">
            <label htmlFor="detail-title">Title</label>
            <input
              id="detail-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleBlur("title", title)}
            />
          </div>

          {/* Status + Move actions */}
          <div className="detail-field">
            <span className="detail-label">
              Status: <span className={`status-badge ${task.status}`}>{task.status}</span>
            </span>
            <div className="detail-actions">
              {moveTargets.map((s) => (
                <button type="button" key={s} onClick={() => handleMove(s)}>
                  Move to {s}
                </button>
              ))}
            </div>
          </div>

          {/* Project */}
          <ProjectSelector taskId={taskId} currentProjectId={task.projectId} />

          {/* Dates */}
          <div className="detail-field-row">
            <div className="detail-field">
              <label htmlFor="detail-start-date">Start Date</label>
              <input
                id="detail-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  handleDateChange("startDate", e.target.value);
                }}
              />
            </div>
            <div className="detail-field">
              <label htmlFor="detail-due-date">Due Date</label>
              <input
                id="detail-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleDateChange("dueDate", e.target.value);
                }}
              />
            </div>
          </div>

          <div className="detail-field-row">
            <div className="detail-field">
              <label htmlFor="detail-follow-up-date">Follow-up Date</label>
              <input
                id="detail-follow-up-date"
                type="date"
                value={followUpDate}
                onChange={(e) => {
                  setFollowUpDate(e.target.value);
                  handleDateChange("followUpDate", e.target.value);
                }}
              />
            </div>
            <div className="detail-field" />
          </div>

          {/* ETA */}
          <div className="detail-field-row">
            <div className="detail-field">
              <label htmlFor="detail-promised-eta">Promised ETA</label>
              <input
                id="detail-promised-eta"
                type="date"
                value={promisedEta}
                onChange={(e) => {
                  setPromisedEta(e.target.value);
                  handleDateChange("promisedEta", e.target.value);
                }}
              />
            </div>
            <div className="detail-field">
              <label htmlFor="detail-realistic-eta">Realistic ETA</label>
              <input
                id="detail-realistic-eta"
                type="date"
                value={realisticEta}
                onChange={(e) => {
                  setRealisticEta(e.target.value);
                  handleDateChange("realisticEta", e.target.value);
                }}
              />
            </div>
          </div>

          {etaGap && (
            <div className={`eta-gap ${etaGap.className}`}>
              <Clock size={14} />
              ETA Gap: {etaGap.label}
            </div>
          )}

          {/* Tags */}
          <div className="detail-field">
            <label htmlFor="detail-tag-input">Tags</label>
            <div className="tags-input-wrapper">
              {tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)}>
                    &times;
                  </button>
                </span>
              ))}
              <input
                id="detail-tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="Add tag..."
              />
            </div>
          </div>

          {/* Notes */}
          <div className="detail-field">
            <label htmlFor="detail-notes">Notes</label>
            <textarea
              id="detail-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => handleBlur("notes", notes)}
            />
          </div>

          {/* Log */}
          <div className="detail-field">
            <span className="detail-label">Activity Log</span>
            <div className="log-timeline">
              {task.log.length === 0 && (
                <div style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                  No log entries yet.
                </div>
              )}
              {task.log
                .slice()
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((entry) => (
                  <div key={`${entry.timestamp}-${entry.entry}`} className="log-entry">
                    <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
                    <span className="log-text">{entry.entry}</span>
                  </div>
                ))}
            </div>
            <form className="log-add-form" onSubmit={handleAddLog}>
              <input
                value={logEntry}
                onChange={(e) => setLogEntry(e.target.value)}
                placeholder="Add log entry..."
              />
              <button type="submit">Add</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
