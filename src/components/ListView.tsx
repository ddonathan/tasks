import { useQuery } from "convex/react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

type SortField = "title" | "status" | "dueDate" | "tags";
type SortDir = "asc" | "desc";
type TaskStatus = "inbox" | "active" | "backlog" | "done" | "someday";

const TAG_PREFIXES = ["@", "p-", "c-", "#", "!"];

function matchesFilter(task: Doc<"tasks">, filterText: string): boolean {
  if (!filterText.trim()) return true;
  const terms = filterText.trim().split(/\s+/);
  return terms.every((term) => {
    const isTagTerm = TAG_PREFIXES.some((p) => term.startsWith(p));
    if (isTagTerm) {
      return task.tags.some((tag) => tag.toLowerCase() === term.toLowerCase());
    }
    const lower = term.toLowerCase();
    return (
      task.title.toLowerCase().includes(lower) || (task.notes ?? "").toLowerCase().includes(lower)
    );
  });
}

interface ListViewProps {
  onSelectTask: (id: Id<"tasks">) => void;
  showAll: boolean;
  filterText: string;
  onTagClick: (tag: string) => void;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "inbox", label: "Inbox" },
  { value: "active", label: "Active" },
  { value: "backlog", label: "Backlog" },
  { value: "done", label: "Done" },
  { value: "someday", label: "Someday" },
];

export default function ListView({ onSelectTask, showAll, filterText, onTagClick }: ListViewProps) {
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const queryArgs = filterStatus ? { status: filterStatus as TaskStatus } : {};
  const tasks = useQuery(api.tasks.list, queryArgs);

  const today = new Date().toISOString().split("T")[0];

  const filteredAndSorted = useMemo(() => {
    if (!tasks) return [];

    let result = tasks;

    // Hide done tasks unless showAll
    if (!showAll) {
      result = result.filter((t) => t.status !== "done");
    }

    // Hide future startDate tasks unless showAll
    if (!showAll) {
      result = result.filter((t) => !t.startDate || t.startDate <= today);
    }

    // Apply filterText
    if (filterText) {
      result = result.filter((t) => matchesFilter(t, filterText));
    }

    result = [...result].sort((a, b) => {
      const valA = getFieldValue(a, sortField);
      const valB = getFieldValue(b, sortField);
      const cmp = valA.localeCompare(valB);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [tasks, filterText, sortField, sortDir, showAll, today]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
      <span className="sort-arrow">
        {sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      </span>
    );
  };

  if (!tasks) {
    return (
      <div className="list-view-wrapper">
        <div className="empty-state">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="list-view-wrapper">
      <div className="list-filters">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="empty-state">No tasks match your filters.</div>
      ) : (
        <table className="list-table">
          <thead>
            <tr>
              <th
                onClick={() => handleSort("title")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleSort("title");
                }}
                tabIndex={0}
              >
                Title <SortArrow field="title" />
              </th>
              <th
                onClick={() => handleSort("status")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleSort("status");
                }}
                tabIndex={0}
              >
                Status <SortArrow field="status" />
              </th>
              <th
                onClick={() => handleSort("dueDate")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleSort("dueDate");
                }}
                tabIndex={0}
              >
                Due Date <SortArrow field="dueDate" />
              </th>
              <th
                onClick={() => handleSort("tags")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleSort("tags");
                }}
                tabIndex={0}
              >
                Tags <SortArrow field="tags" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((task) => (
              <tr
                key={task._id}
                onClick={() => onSelectTask(task._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelectTask(task._id);
                }}
                tabIndex={0}
              >
                <td>{task.title}</td>
                <td>
                  <span className={`status-badge ${task.status}`}>{task.status}</span>
                </td>
                <td style={{ color: task.dueDate ? "var(--text)" : "var(--text-muted)" }}>
                  {task.dueDate || "--"}
                </td>
                <td>
                  {task.tags.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      className="tag-chip clickable"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTagClick(tag);
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function getFieldValue(task: Doc<"tasks">, field: SortField): string {
  switch (field) {
    case "title":
      return task.title;
    case "status":
      return task.status;
    case "dueDate":
      return task.dueDate ?? "";
    case "tags":
      return task.tags.join(", ");
  }
}
