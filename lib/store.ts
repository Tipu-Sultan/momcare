import { create } from "zustand";
import { 
  SugarReadingType, 
  BPReadingType, 
  InsulinType, 
  InsulinLogType, 
  ThyroidReadingType, 
  MedicineType, 
  MedicineLogType, 
  WaterLogType 
} from "./mongodb";

interface HealthStore {
  // Sugar Readings Cache
  sugarReadings: SugarReadingType[];
  sugarLoaded: boolean;
  sugarLoading: boolean;
  recentInsulinLogs: InsulinLogType[];
  recentInsulinLogsLoaded: boolean;
  fetchSugarReadings: (force?: boolean) => Promise<void>;
  fetchRecentInsulinLogs: (force?: boolean) => Promise<void>;
  addSugarReading: (reading: Omit<SugarReadingType, "_id" | "createdAt">) => Promise<void>;
  deleteSugarReading: (id: string) => Promise<void>;

  // BP Readings Cache
  bpReadings: BPReadingType[];
  bpLoaded: boolean;
  bpLoading: boolean;
  fetchBpReadings: (force?: boolean) => Promise<void>;
  addBpReading: (reading: Omit<BPReadingType, "_id" | "createdAt">) => Promise<void>;
  deleteBpReading: (id: string) => Promise<void>;

  // Thyroid Cache
  thyroidReadings: ThyroidReadingType[];
  thyroidLoaded: boolean;
  thyroidLoading: boolean;
  fetchThyroidReadings: (force?: boolean) => Promise<void>;
  addThyroidReading: (reading: Omit<ThyroidReadingType, "_id" | "createdAt">) => Promise<void>;
  deleteThyroidReading: (id: string) => Promise<void>;

  // Insulin Cache
  insulinTypes: InsulinType[];
  insulinLogs: InsulinLogType[];
  insulinTypesLoaded: boolean;
  insulinLogsLoaded: boolean;
  insulinLoading: boolean;
  fetchInsulinTypes: (force?: boolean) => Promise<void>;
  fetchInsulinLogs: (force?: boolean) => Promise<void>;
  addInsulinType: (type: Omit<InsulinType, "_id" | "createdAt" | "active">) => Promise<void>;
  addInsulinLog: (log: Omit<InsulinLogType, "_id" | "createdAt">) => Promise<void>;
  deleteInsulinType: (id: string) => Promise<void>;
  deleteInsulinLog: (id: string) => Promise<void>;
  toggleInsulinType: (id: string, active: boolean) => Promise<void>;

  // Medicines Cache
  medicines: MedicineType[];
  medicineLogs: MedicineLogType[];
  medicinesLoaded: boolean;
  medicineLogsLoaded: boolean;
  medicinesLoading: boolean;
  fetchMedicines: (force?: boolean) => Promise<void>;
  fetchMedicineLogs: (force?: boolean) => Promise<void>;
  addMedicine: (med: Omit<MedicineType, "_id" | "createdAt" | "active">) => Promise<void>;
  addMedicineLog: (log: Omit<MedicineLogType, "_id" | "createdAt">) => Promise<void>;
  deleteMedicine: (id: string) => Promise<void>;
  deleteMedicineLog: (id: string) => Promise<void>;
  toggleMedicine: (id: string, active: boolean) => Promise<void>;

  // Water Logs Cache
  waterLogs: WaterLogType[];
  waterLoaded: boolean;
  waterLoading: boolean;
  fetchWaterLogs: (force?: boolean) => Promise<void>;
  addWaterLog: (log: Omit<WaterLogType, "_id" | "createdAt">) => Promise<void>;
  deleteWaterLog: (id: string) => Promise<void>;
}

export const useHealthStore = create<HealthStore>((set, get) => ({
  // Sugar
  sugarReadings: [],
  sugarLoaded: false,
  sugarLoading: false,
  recentInsulinLogs: [],
  recentInsulinLogsLoaded: false,

  fetchSugarReadings: async (force = false) => {
    if (get().sugarLoaded && !force && !get().sugarLoading) return;
    set({ sugarLoading: true });
    try {
      const res = await fetch("/api/readings");
      if (res.ok) {
        set({ sugarReadings: await res.json(), sugarLoaded: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ sugarLoading: false });
    }
  },

  fetchRecentInsulinLogs: async (force = false) => {
    if (get().recentInsulinLogsLoaded && !force) return;
    try {
      const res = await fetch("/api/insulin?type=logs&hours=24&limit=20");
      if (res.ok) {
        set({ recentInsulinLogs: await res.json(), recentInsulinLogsLoaded: true });
      }
    } catch (e) {
      console.error(e);
    }
  },

  addSugarReading: async (reading) => {
    try {
      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reading),
      });
      if (res.ok) {
        // Force refresh
        await get().fetchSugarReadings(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteSugarReading: async (id) => {
    try {
      const res = await fetch("/api/readings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        // Force refresh
        await get().fetchSugarReadings(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  // BP
  bpReadings: [],
  bpLoaded: false,
  bpLoading: false,

  fetchBpReadings: async (force = false) => {
    if (get().bpLoaded && !force && !get().bpLoading) return;
    set({ bpLoading: true });
    try {
      const res = await fetch("/api/bp");
      if (res.ok) {
        set({ bpReadings: await res.json(), bpLoaded: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ bpLoading: false });
    }
  },

  addBpReading: async (reading) => {
    try {
      const res = await fetch("/api/bp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reading),
      });
      if (res.ok) {
        await get().fetchBpReadings(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteBpReading: async (id) => {
    try {
      const res = await fetch("/api/bp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await get().fetchBpReadings(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  // Thyroid
  thyroidReadings: [],
  thyroidLoaded: false,
  thyroidLoading: false,

  fetchThyroidReadings: async (force = false) => {
    if (get().thyroidLoaded && !force && !get().thyroidLoading) return;
    set({ thyroidLoading: true });
    try {
      const res = await fetch("/api/thyroid");
      if (res.ok) {
        set({ thyroidReadings: await res.json(), thyroidLoaded: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ thyroidLoading: false });
    }
  },

  addThyroidReading: async (reading) => {
    try {
      const res = await fetch("/api/thyroid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reading),
      });
      if (res.ok) {
        await get().fetchThyroidReadings(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteThyroidReading: async (id) => {
    try {
      const res = await fetch("/api/thyroid", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await get().fetchThyroidReadings(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  // Insulin
  insulinTypes: [],
  insulinLogs: [],
  insulinTypesLoaded: false,
  insulinLogsLoaded: false,
  insulinLoading: false,

  fetchInsulinTypes: async (force = false) => {
    if (get().insulinTypesLoaded && !force) return;
    try {
      const res = await fetch("/api/insulin?type=types");
      if (res.ok) {
        set({ insulinTypes: await res.json(), insulinTypesLoaded: true });
      }
    } catch (e) {
      console.error(e);
    }
  },

  fetchInsulinLogs: async (force = false) => {
    if (get().insulinLogsLoaded && !force && !get().insulinLoading) return;
    set({ insulinLoading: true });
    try {
      const res = await fetch("/api/insulin?type=logs");
      if (res.ok) {
        set({ insulinLogs: await res.json(), insulinLogsLoaded: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ insulinLoading: false });
    }
  },

  addInsulinType: async (type) => {
    try {
      const res = await fetch("/api/insulin?type=types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(type),
      });
      if (res.ok) {
        await get().fetchInsulinTypes(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  addInsulinLog: async (log) => {
    try {
      const res = await fetch("/api/insulin?type=logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
      if (res.ok) {
        await get().fetchInsulinLogs(true);
        // Also force-refresh the 24-hour log cache used by the Sugar tab dropdown
        await get().fetchRecentInsulinLogs(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteInsulinType: async (id) => {
    try {
      const res = await fetch("/api/insulin?type=types", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await get().fetchInsulinTypes(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteInsulinLog: async (id) => {
    try {
      const res = await fetch("/api/insulin?type=logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await get().fetchInsulinLogs(true);
        await get().fetchRecentInsulinLogs(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  toggleInsulinType: async (id, active) => {
    try {
      const res = await fetch("/api/insulin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
      if (res.ok) {
        await get().fetchInsulinTypes(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  // Medicines
  medicines: [],
  medicineLogs: [],
  medicinesLoaded: false,
  medicineLogsLoaded: false,
  medicinesLoading: false,

  fetchMedicines: async (force = false) => {
    if (get().medicinesLoaded && !force) return;
    try {
      const res = await fetch("/api/medicine?type=types");
      if (res.ok) {
        set({ medicines: await res.json(), medicinesLoaded: true });
      }
    } catch (e) {
      console.error(e);
    }
  },

  fetchMedicineLogs: async (force = false) => {
    if (get().medicineLogsLoaded && !force && !get().medicinesLoading) return;
    set({ medicinesLoading: true });
    try {
      const res = await fetch("/api/medicine?type=logs");
      if (res.ok) {
        set({ medicineLogs: await res.json(), medicineLogsLoaded: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ medicinesLoading: false });
    }
  },

  addMedicine: async (med) => {
    try {
      const res = await fetch("/api/medicine?type=types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(med),
      });
      if (res.ok) {
        await get().fetchMedicines(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  addMedicineLog: async (log) => {
    try {
      const res = await fetch("/api/medicine?type=logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
      if (res.ok) {
        await get().fetchMedicineLogs(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteMedicine: async (id) => {
    try {
      const res = await fetch("/api/medicine?type=types", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await get().fetchMedicines(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteMedicineLog: async (id) => {
    try {
      const res = await fetch("/api/medicine?type=logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await get().fetchMedicineLogs(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  toggleMedicine: async (id, active) => {
    try {
      const res = await fetch("/api/medicine", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active }),
      });
      if (res.ok) {
        await get().fetchMedicines(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  // Water Logs
  waterLogs: [],
  waterLoaded: false,
  waterLoading: false,

  fetchWaterLogs: async (force = false) => {
    if (get().waterLoaded && !force && !get().waterLoading) return;
    set({ waterLoading: true });
    try {
      const res = await fetch("/api/water");
      if (res.ok) {
        set({ waterLogs: await res.json(), waterLoaded: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ waterLoading: false });
    }
  },

  addWaterLog: async (log) => {
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
      if (res.ok) {
        await get().fetchWaterLogs(true);
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteWaterLog: async (id) => {
    try {
      const res = await fetch("/api/water", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await get().fetchWaterLogs(true);
      }
    } catch (e) {
      console.error(e);
    }
  },
}));
