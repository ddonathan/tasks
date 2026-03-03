import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { api } from "../../convex/_generated/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

const LIFTS = ["Bench Press", "Squat", "Overhead Press", "Deadlift"] as const;
type Lift = (typeof LIFTS)[number];

const LIFT_COLORS: Record<Lift, string> = {
  "Bench Press": "#6366f1",
  Squat: "#22c55e",
  "Overhead Press": "#f97316",
  Deadlift: "#ef4444",
};

const LIFT_SHORT: Record<Lift, string> = {
  "Bench Press": "Bench",
  Squat: "Squat",
  "Overhead Press": "OHP",
  Deadlift: "Dead",
};

const FELT_OPTIONS = ["+2", "0", "miss"] as const;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

const styles = {
  container: {
    padding: "16px 20px",
    maxWidth: 1200,
    margin: "0 auto",
  } as React.CSSProperties,
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginBottom: 20,
  } as React.CSSProperties,
  statCard: {
    background: "#1a1d27",
    border: "1px solid #2a2d3a",
    borderRadius: 12,
    padding: "16px 20px",
    textAlign: "center" as const,
  } as React.CSSProperties,
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: "#e4e4e7",
    lineHeight: 1.2,
  } as React.CSSProperties,
  statLabel: {
    fontSize: 12,
    color: "#71717a",
    marginTop: 4,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#e4e4e7",
    marginBottom: 12,
    marginTop: 24,
  } as React.CSSProperties,
  card: {
    background: "#1a1d27",
    border: "1px solid #2a2d3a",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  } as React.CSSProperties,
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 12,
  } as React.CSSProperties,
  chartCard: {
    background: "#1a1d27",
    border: "1px solid #2a2d3a",
    borderRadius: 12,
    padding: 16,
  } as React.CSSProperties,
  chartLabel: {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 8,
  } as React.CSSProperties,
  chartWrap: {
    height: 200,
  } as React.CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: 14,
  } as React.CSSProperties,
  th: {
    textAlign: "left" as const,
    padding: "8px 12px",
    color: "#71717a",
    fontSize: 12,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    borderBottom: "1px solid #2a2d3a",
  } as React.CSSProperties,
  td: {
    padding: "8px 12px",
    color: "#e4e4e7",
    borderBottom: "1px solid #2a2d3a",
  } as React.CSSProperties,
  badge: (color: string) =>
    ({
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      color: "#fff",
      background: color,
    }) as React.CSSProperties,
  progressBarBg: {
    height: 24,
    borderRadius: 12,
    background: "#2a2d3a",
    overflow: "hidden",
    position: "relative" as const,
  } as React.CSSProperties,
  progressBarFill: (pct: number) =>
    ({
      height: "100%",
      borderRadius: 12,
      background: "linear-gradient(90deg, #6366f1, #22d3ee)",
      width: `${Math.min(pct, 100)}%`,
      transition: "width 0.4s ease",
    }) as React.CSSProperties,
  clubRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  } as React.CSSProperties,
  clubTotal: {
    fontSize: 24,
    fontWeight: 700,
    color: "#e4e4e7",
  } as React.CSSProperties,
  clubGoal: {
    fontSize: 13,
    color: "#71717a",
  } as React.CSSProperties,
  clubLifts: {
    display: "flex",
    gap: 16,
    marginTop: 12,
    flexWrap: "wrap" as const,
  } as React.CSSProperties,
  clubLift: (color: string) =>
    ({
      fontSize: 13,
      color,
      fontWeight: 600,
    }) as React.CSSProperties,
  formToggle: {
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 24,
    marginBottom: 8,
  } as React.CSSProperties,
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 12,
    marginBottom: 16,
  } as React.CSSProperties,
  formLabel: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    fontSize: 13,
    color: "#71717a",
  } as React.CSSProperties,
  formInput: {
    background: "#0f1117",
    border: "1px solid #2a2d3a",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#e4e4e7",
    fontSize: 14,
    outline: "none",
  } as React.CSSProperties,
  formSelect: {
    background: "#0f1117",
    border: "1px solid #2a2d3a",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#e4e4e7",
    fontSize: 14,
    outline: "none",
  } as React.CSSProperties,
  submitBtn: {
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  loadingWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "50vh",
  } as React.CSSProperties,
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #2a2d3a",
    borderTop: "3px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  } as React.CSSProperties,
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? 0} lbs`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "#71717a", maxTicksLimit: 8, font: { size: 11 } },
      grid: { color: "rgba(42, 45, 58, 0.5)" },
    },
    y: {
      ticks: {
        color: "#71717a",
        font: { size: 11 },
        callback: (v: string | number) => v + " lbs",
      },
      grid: { color: "rgba(42, 45, 58, 0.5)" },
    },
  },
};

export default function FitnessDashboard() {
  const stats = useQuery(api.workouts.stats);
  const workouts = useQuery(api.workouts.list, {});
  const recentWorkouts = useQuery(api.workouts.recent, { n: 10 });
  const createWorkout = useMutation(api.workouts.create);

  const [formOpen, setFormOpen] = useState(false);
  const [formDate, setFormDate] = useState(todayStr());
  const [formLift, setFormLift] = useState<Lift>("Bench Press");
  const [formWeight, setFormWeight] = useState("");
  const [formFelt, setFormFelt] = useState<(typeof FELT_OPTIONS)[number]>("0");
  const [formNextWeight, setFormNextWeight] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-calc next weight based on felt
  const calcNextWeight = (topWeight: number, felt: string, lift: Lift): number => {
    const isUpper = lift === "Bench Press" || lift === "Overhead Press";
    const increment = isUpper ? 2.5 : 5;
    if (felt === "+2") return topWeight + increment;
    if (felt === "0") return topWeight;
    return topWeight - increment; // miss
  };

  // When felt or weight changes, auto-calc next weight
  const handleFeltChange = (felt: (typeof FELT_OPTIONS)[number]) => {
    setFormFelt(felt);
    const w = Number.parseFloat(formWeight);
    if (!Number.isNaN(w) && w > 0) {
      setFormNextWeight(String(calcNextWeight(w, felt, formLift)));
    }
  };

  const handleWeightChange = (val: string) => {
    setFormWeight(val);
    const w = Number.parseFloat(val);
    if (!Number.isNaN(w) && w > 0) {
      setFormNextWeight(String(calcNextWeight(w, formFelt, formLift)));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const topWeight = Number.parseFloat(formWeight);
    const nextWeight = Number.parseFloat(formNextWeight);
    if (Number.isNaN(topWeight) || topWeight <= 0) return;
    if (Number.isNaN(nextWeight)) return;

    setSubmitting(true);
    try {
      const backoffWeight = Math.round(topWeight * 0.8 * 2) / 2; // round to nearest 0.5
      await createWorkout({
        date: formDate,
        workout: {
          mainLift: formLift,
          topWeight,
          felt: formFelt,
          nextWeight,
          sets: [
            { exercise: formLift, reps: 1, weight: topWeight },
            { exercise: formLift, reps: 5, weight: backoffWeight },
            { exercise: formLift, reps: 5, weight: backoffWeight },
          ],
        },
      });
      setFormWeight("");
      setFormNextWeight("");
      setFormFelt("0");
      setFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Chart data per lift
  const liftChartData = useMemo(() => {
    if (!workouts) return null;
    const sorted = [...workouts].sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

    return LIFTS.map((lift) => {
      const filtered = sorted.filter((w) => w.workout?.mainLift === lift);
      return {
        lift,
        labels: filtered.map((w) => formatDate(w.date)),
        data: filtered.map((w) => w.workout?.topWeight ?? 0),
        color: LIFT_COLORS[lift],
      };
    });
  }, [workouts]);

  // 1000 lb club
  const clubTotal = useMemo(() => {
    if (!stats?.currentMaxes) return 0;
    const bench = stats.currentMaxes["Bench Press"] ?? 0;
    const squat = stats.currentMaxes["Squat"] ?? 0;
    const dead = stats.currentMaxes["Deadlift"] ?? 0;
    return bench + squat + dead;
  }, [stats]);

  if (!stats || !workouts || !recentWorkouts) {
    return (
      <div style={styles.loadingWrap}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Stats cards */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.totalWorkouts}</div>
          <div style={styles.statLabel}>Total Workouts</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.thisWeek}</div>
          <div style={styles.statLabel}>This Week</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.weekStreak}</div>
          <div style={styles.statLabel}>Week Streak</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.daysSinceLast}</div>
          <div style={styles.statLabel}>Days Since Last</div>
        </div>
      </div>

      {/* 1000 lb Club */}
      <div style={styles.sectionTitle}>1000 lb Club</div>
      <div style={styles.card}>
        <div style={styles.clubRow}>
          <span style={styles.clubTotal}>{clubTotal} lbs</span>
          <span style={styles.clubGoal}>Goal: 1,000 lbs</span>
        </div>
        <div style={styles.progressBarBg}>
          <div style={styles.progressBarFill((clubTotal / 1000) * 100)} />
        </div>
        <div style={styles.clubLifts}>
          {(["Bench Press", "Squat", "Deadlift"] as const).map((lift) => (
            <span key={lift} style={styles.clubLift(LIFT_COLORS[lift])}>
              {LIFT_SHORT[lift]}: {stats.currentMaxes[lift] ?? 0} lbs
            </span>
          ))}
        </div>
      </div>

      {/* Lift Charts */}
      <div style={styles.sectionTitle}>Lift Progression</div>
      <div style={styles.chartsGrid}>
        {liftChartData?.map(({ lift, labels, data, color }) => (
          <div key={lift} style={styles.chartCard}>
            <div style={{ ...styles.chartLabel, color }}>{lift}</div>
            <div style={styles.chartWrap}>
              {data.length > 0 ? (
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        label: lift,
                        data,
                        borderColor: color,
                        backgroundColor: `${color}20`,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 3,
                        pointBackgroundColor: color,
                        borderWidth: 2,
                      },
                    ],
                  }}
                  options={chartOptions}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "#71717a",
                    fontSize: 13,
                  }}
                >
                  No data yet
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Workouts */}
      <div style={styles.sectionTitle}>Recent Workouts</div>
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Lift</th>
              <th style={styles.th}>Top Weight</th>
              <th style={styles.th}>Felt</th>
            </tr>
          </thead>
          <tbody>
            {recentWorkouts.map((w) => {
              if (!w.workout) return null;
              const liftName = w.workout.mainLift as Lift;
              const color = LIFT_COLORS[liftName] ?? "#6366f1";
              return (
                <tr key={w._id}>
                  <td style={styles.td}>{formatDate(w.date)}</td>
                  <td style={styles.td}>
                    <span style={styles.badge(color)}>{LIFT_SHORT[liftName] ?? liftName}</span>
                  </td>
                  <td style={styles.td}>{w.workout?.topWeight} lbs</td>
                  <td style={styles.td}>{w.workout?.felt}</td>
                </tr>
              );
            })}
            {recentWorkouts.length === 0 && (
              <tr>
                <td style={{ ...styles.td, color: "#71717a", textAlign: "center" }} colSpan={4}>
                  No workouts logged yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Log Form */}
      <button type="button" style={styles.formToggle} onClick={() => setFormOpen(!formOpen)}>
        {formOpen ? "Cancel" : "+ Log Workout"}
      </button>

      {formOpen && (
        <div style={styles.card}>
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div style={styles.formGrid}>
              <label style={styles.formLabel}>
                Date
                <input
                  type="date"
                  style={styles.formInput}
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </label>
              <label style={styles.formLabel}>
                Main Lift
                <select
                  style={styles.formSelect}
                  value={formLift}
                  onChange={(e) => setFormLift(e.target.value as Lift)}
                >
                  {LIFTS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.formLabel}>
                Top Weight (lbs)
                <input
                  type="number"
                  style={styles.formInput}
                  value={formWeight}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  placeholder="e.g. 225"
                  step="2.5"
                />
              </label>
              <label style={styles.formLabel}>
                Felt
                <select
                  style={styles.formSelect}
                  value={formFelt}
                  onChange={(e) =>
                    handleFeltChange(e.target.value as (typeof FELT_OPTIONS)[number])
                  }
                >
                  {FELT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.formLabel}>
                Next Weight (lbs)
                <input
                  type="number"
                  style={styles.formInput}
                  value={formNextWeight}
                  onChange={(e) => setFormNextWeight(e.target.value)}
                  step="2.5"
                />
              </label>
            </div>
            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              {submitting ? "Saving..." : "Log Workout"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
