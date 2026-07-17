import dayjs from "dayjs";

export const toNumber = (val: string): number => {
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
};

export const toInt = (val: string): number => {
  const n = parseInt(val.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
};

export const toDate = (val: string): Date => {
  const d = dayjs(val);
  return d.isValid() ? d.toDate() : new Date();
};

export const formatDisplay = (date: Date | string): string =>
  dayjs(date).format("DD MMM YYYY, hh:mm A");

export const formatInputDefault = (): string =>
  dayjs().format("YYYY-MM-DDTHH:mm");

// Timing options with clear meal context
export const SUGAR_TIMINGS = [
  { value: "fasting_morning",    label: "Fasting – Morning (before breakfast)" },
  { value: "pre_meal_morning",   label: "Pre Meal – Morning (before breakfast)" },
  { value: "post_meal_morning",  label: "Post Meal – Morning (2hr after breakfast)" },
  { value: "pre_meal_noon",      label: "Pre Meal – Noon (before lunch)" },
  { value: "post_meal_noon",     label: "Post Meal – Noon (2hr after lunch)" },
  { value: "pre_meal_evening",   label: "Pre Meal – Evening (before dinner)" },
  { value: "post_meal_evening",  label: "Post Meal – Evening (2hr after dinner)" },
  { value: "bedtime",            label: "Bedtime" },
  { value: "random",             label: "Random / Any time" },
];

export const isFastingTiming = (timing: string) =>
  timing === "fasting_morning" || timing === "random";

export const sugarStatus = (value: number, timing: string): { label: string; color: string } => {
  const fasting = isFastingTiming(timing);
  if (fasting) {
    if (value < 70)   return { label: "Low",          color: "#e74c3c" };
    if (value <= 100) return { label: "Normal",       color: "#27ae60" };
    if (value <= 125) return { label: "Pre-diabetic", color: "#f39c12" };
    return              { label: "High",          color: "#e74c3c" };
  } else {
    if (value < 70)   return { label: "Low",          color: "#e74c3c" };
    if (value <= 140) return { label: "Normal",       color: "#27ae60" };
    if (value <= 199) return { label: "Pre-diabetic", color: "#f39c12" };
    return              { label: "High",          color: "#e74c3c" };
  }
};

export const bpStatus = (sys: number, dia: number): { label: string; color: string } => {
  if (sys < 120 && dia < 80) return { label: "Normal",       color: "#27ae60" };
  if (sys < 130 && dia < 80) return { label: "Elevated",     color: "#f39c12" };
  if (sys < 140 || dia < 90) return { label: "High Stage 1", color: "#e67e22" };
  return                       { label: "High Stage 2", color: "#e74c3c" };
};

export const thyroidStatus = (tsh: number): { label: string; color: string } => {
  if (tsh < 0.4)  return { label: "Low (Hyper)",  color: "#e74c3c" };
  if (tsh <= 4.0) return { label: "Normal",       color: "#27ae60" };
  if (tsh <= 10)  return { label: "Mildly High",  color: "#f39c12" };
  return            { label: "High (Hypo)", color: "#e74c3c" };
};
