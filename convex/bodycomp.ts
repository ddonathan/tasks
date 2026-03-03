import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db.query("bodycomp").collect();
    entries.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    if (args.limit) {
      return entries.slice(0, args.limit);
    }
    return entries;
  },
});

export const get = query({
  args: { id: v.id("bodycomp") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bodycomp")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    weight: v.optional(v.float64()),
    bf: v.optional(v.float64()),
    smm: v.optional(v.float64()),
    lbm: v.optional(v.float64()),
    bfm: v.optional(v.float64()),
    bmi: v.optional(v.float64()),
    score: v.optional(v.float64()),
    measurements: v.optional(
      v.object({
        waist: v.optional(v.float64()),
        chest: v.optional(v.float64()),
        arms: v.optional(v.float64()),
        thighs: v.optional(v.float64()),
      }),
    ),
    photos: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    time: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Upsert by date: check if entry exists for this date
    const existing = await ctx.db
      .query("bodycomp")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    if (existing) {
      // Patch existing entry with provided fields
      const { date: _, ...fields } = args;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    // Insert new entry
    const id = await ctx.db.insert("bodycomp", {
      date: args.date,
      weight: args.weight,
      bf: args.bf,
      smm: args.smm,
      lbm: args.lbm,
      bfm: args.bfm,
      bmi: args.bmi,
      score: args.score,
      measurements: args.measurements,
      photos: args.photos,
      notes: args.notes,
      time: args.time,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("bodycomp"),
    date: v.optional(v.string()),
    weight: v.optional(v.float64()),
    bf: v.optional(v.float64()),
    smm: v.optional(v.float64()),
    lbm: v.optional(v.float64()),
    bfm: v.optional(v.float64()),
    bmi: v.optional(v.float64()),
    score: v.optional(v.float64()),
    measurements: v.optional(
      v.object({
        waist: v.optional(v.float64()),
        chest: v.optional(v.float64()),
        arms: v.optional(v.float64()),
        thighs: v.optional(v.float64()),
      }),
    ),
    photos: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    time: v.optional(v.string()),
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
  args: { id: v.id("bodycomp") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const allEntries = await ctx.db.query("bodycomp").collect();
    allEntries.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

    const daysTracked = allEntries.length;

    // Baseline (hardcoded)
    const baseline = { weight: 203.9, bf: 25.7, date: "2026-01-02" };

    // Current: most recent entry
    const latest = allEntries[0];
    const current = latest
      ? {
          weight: latest.weight,
          bf: latest.bf,
          smm: latest.smm,
          lbm: latest.lbm,
          bfm: latest.bfm,
        }
      : { weight: undefined, bf: undefined, smm: undefined, lbm: undefined, bfm: undefined };

    // Change from baseline
    const change = {
      weight: current.weight !== undefined ? current.weight - baseline.weight : undefined,
      bf: current.bf !== undefined ? current.bf - baseline.bf : undefined,
    };

    // Trend: last 7 entries' weight and bf
    const trendEntries = allEntries.slice(0, 7);
    const trend = trendEntries.map((e) => ({
      date: e.date,
      weight: e.weight,
      bf: e.bf,
    }));

    // Goal
    const goalBf = 14;

    // Projected goal date: linear projection based on bf% rate of change
    let projectedGoalDate: string | null = null;
    if (current.bf !== undefined && latest) {
      const baselineDate = new Date(baseline.date).getTime();
      const currentDate = new Date(latest.date).getTime();
      const daysPassed = (currentDate - baselineDate) / (1000 * 60 * 60 * 24);

      if (daysPassed > 0) {
        const bfChange = current.bf - baseline.bf;
        const ratePerDay = bfChange / daysPassed;

        if (ratePerDay < 0) {
          // Only project if bf is decreasing
          const bfRemaining = current.bf - goalBf;
          const daysToGoal = bfRemaining / Math.abs(ratePerDay);
          const goalDate = new Date(currentDate + daysToGoal * 1000 * 60 * 60 * 24);
          projectedGoalDate = goalDate.toISOString().split("T")[0];
        }
      }
    }

    return {
      current,
      baseline,
      change,
      trend,
      daysTracked,
      goalBf,
      projectedGoalDate,
    };
  },
});

export const recent = query({
  args: {
    n: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const limit = args.n ?? 10;
    const entries = await ctx.db.query("bodycomp").collect();
    entries.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    return entries.slice(0, limit);
  },
});
