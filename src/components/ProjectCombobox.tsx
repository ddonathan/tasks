import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

interface ProjectComboboxProps {
  value: string;
  onChange: (projectId: string) => void;
  id?: string;
}

export default function ProjectCombobox({ value, onChange, id }: ProjectComboboxProps) {
  const projects = useQuery(api.projects.list, {});
  const createProject = useMutation(api.projects.create);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const currentProject = projects?.find((p) => p._id === value);

  const filtered = (projects ?? []).filter((p) =>
    p.name.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const exactMatch = (projects ?? []).some(
    (p) => p.name.toLowerCase() === inputValue.toLowerCase(),
  );

  const handleSelect = (projectId: string) => {
    onChange(projectId);
    setInputValue("");
    setIsOpen(false);
  };

  const handleCreate = async () => {
    if (!inputValue.trim()) return;
    const newId = await createProject({
      name: inputValue.trim(),
      status: "active",
    });
    onChange(newId);
    setInputValue("");
    setIsOpen(false);
  };

  if (!projects) return null;

  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
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
          width: "100%",
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
          {value && (
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
              ✕ No project
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
                background: p._id === value ? "var(--border)" : "none",
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
