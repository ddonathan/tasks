import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const workouts = await ctx.db.query("workouts").collect();
    workouts.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    if (args.limit) {
      return workouts.slice(0, args.limit);
    }
    return workouts;
  },
});

export const get = query({
  args: { id: v.id("workouts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("workouts")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    workout: v.object({
      mainLift: v.string(),
      topWeight: v.float64(),
      felt: v.string(),
      nextWeight: v.float64(),
      sets: v.array(
        v.object({
          exercise: v.string(),
          reps: v.union(v.float64(), v.string()),
          weight: v.union(v.float64(), v.string()),
        }),
      ),
      accessories: v.optional(
        v.array(
          v.object({
            exercise: v.string(),
            reps: v.union(v.float64(), v.string()),
            weight: v.union(v.float64(), v.string()),
            sets: v.optional(v.float64()),
          }),
        ),
      ),
      finishers: v.optional(
        v.array(
          v.object({
            exercise: v.string(),
            reps: v.union(v.float64(), v.string()),
            weight: v.union(v.float64(), v.string()),
            sets: v.optional(v.float64()),
          }),
        ),
      ),
    }),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("workouts", {
      date: args.date,
      workout: args.workout,
      notes: args.notes,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("workouts"),
    date: v.optional(v.string()),
    workout: v.optional(
      v.object({
        mainLift: v.string(),
        topWeight: v.float64(),
        felt: v.string(),
        nextWeight: v.float64(),
        sets: v.array(
          v.object({
            exercise: v.string(),
            reps: v.union(v.float64(), v.string()),
            weight: v.union(v.float64(), v.string()),
          }),
        ),
        accessories: v.optional(
          v.array(
            v.object({
              exercise: v.string(),
              reps: v.union(v.float64(), v.string()),
              weight: v.union(v.float64(), v.string()),
              sets: v.optional(v.float64()),
            }),
          ),
        ),
        finishers: v.optional(
          v.array(
            v.object({
              exercise: v.string(),
              reps: v.union(v.float64(), v.string()),
              weight: v.union(v.float64(), v.string()),
              sets: v.optional(v.float64()),
            }),
          ),
        ),
      }),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    await ctx.db.patch(id, updates);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("workouts") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const allWorkouts = await ctx.db.query("workouts").collect();
    allWorkouts.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

    const totalWorkouts = allWorkouts.length;

    // currentMaxes: most recent topWeight per mainLift
    const currentMaxes: Record<string, number> = {};
    for (const w of allWorkouts) {
      if (!w.workout) continue;
      const lift = w.workout.mainLift;
      if (lift && !(lift in currentMaxes) && w.workout.topWeight) {
        currentMaxes[lift] = w.workout.topWeight;
      }
    }

    // thisWeek: count workouts this week (Monday-based)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString().split("T")[0];
    const thisWeek = allWorkouts.filter((w) => w.date >= mondayStr).length;

    // daysSinceLast
    const daysSinceLast =
      totalWorkouts > 0
        ? Math.floor((Date.now() - new Date(allWorkouts[0].date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    // totalVolume: sum of (reps * weight) across all sets
    let totalVolume = 0;
    for (const w of allWorkouts) {
      if (!w.workout?.sets) continue;
      for (const set of w.workout.sets) {
        const reps = typeof set.reps === "number" ? set.reps : Number.parseFloat(set.reps) || 0;
        const weight =
          typeof set.weight === "number" ? set.weight : Number.parseFloat(set.weight) || 0;
        totalVolume += reps * weight;
      }
      if (w.workout?.accessories) {
        for (const acc of w.workout.accessories) {
          const reps = typeof acc.reps === "number" ? acc.reps : Number.parseFloat(acc.reps) || 0;
          const weight =
            typeof acc.weight === "number" ? acc.weight : Number.parseFloat(acc.weight) || 0;
          const sets = acc.sets ?? 1;
          totalVolume += reps * weight * sets;
        }
      }
      if (w.workout.finishers) {
        for (const fin of w.workout.finishers) {
          const reps = typeof fin.reps === "number" ? fin.reps : Number.parseFloat(fin.reps) || 0;
          const weight =
            typeof fin.weight === "number" ? fin.weight : Number.parseFloat(fin.weight) || 0;
          const sets = fin.sets ?? 1;
          totalVolume += reps * weight * sets;
        }
      }
    }

    // weekStreak: consecutive weeks with 3+ workouts
    let weekStreak = 0;
    if (totalWorkouts > 0) {
      // Group workouts by ISO week
      const weekMap = new Map<string, number>();
      for (const w of allWorkouts) {
        const d = new Date(w.date);
        const dow = d.getDay();
        const off = dow === 0 ? 6 : dow - 1;
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - off);
        const key = weekStart.toISOString().split("T")[0];
        weekMap.set(key, (weekMap.get(key) || 0) + 1);
      }

      // Sort week keys descending
      const weekKeys = [...weekMap.keys()].sort((a, b) => (b > a ? 1 : b < a ? -1 : 0));

      for (const key of weekKeys) {
        if ((weekMap.get(key) || 0) >= 3) {
          weekStreak++;
        } else {
          break;
        }
      }
    }

    // prHistory: each time a lift hit a new max
    const prHistory: Array<{ date: string; lift: string; weight: number }> = [];
    const maxSoFar: Record<string, number> = {};
    // Process oldest first for PR tracking
    const chronological = [...allWorkouts].reverse();
    for (const w of chronological) {
      if (!w.workout) continue;
      const lift = w.workout.mainLift;
      const weight = w.workout.topWeight;
      if (lift && weight && (!(lift in maxSoFar) || weight > maxSoFar[lift])) {
        maxSoFar[lift] = weight;
        prHistory.push({ date: w.date, lift, weight });
      }
    }

    return {
      currentMaxes,
      totalWorkouts,
      weekStreak,
      thisWeek,
      daysSinceLast,
      totalVolume,
      prHistory,
    };
  },
});

export const recent = query({
  args: {
    n: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const limit = args.n ?? 10;
    const workouts = await ctx.db.query("workouts").collect();
    workouts.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    return workouts.slice(0, limit);
  },
});
