import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { CreateReminderInput, Reminder } from "@shared/types/reminder";
import { createReminder, getReminder, updateReminder } from "@frontend/api/client";
import { ReminderForm } from "@frontend/components/ReminderForm";

export function ReminderEditorPage({ mode }: { mode: "new" | "edit" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    setLoading(true);
    getReminder(id)
      .then((result) => setReminder(result.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load reminder"))
      .finally(() => setLoading(false));
  }, [id, mode]);

  async function handleSubmit(value: CreateReminderInput) {
    setSaving(true);
    setError(null);
    try {
      if (mode === "edit" && id) {
        await updateReminder(id, value);
      } else {
        await createReminder(value);
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save reminder");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="py-10 text-sm text-slate-500 dark:text-slate-400">Loading reminder...</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="max-w-4xl rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">{error}</p> : null}
      <ReminderForm initialReminder={reminder} saving={saving} onSubmit={handleSubmit} onCancel={() => navigate("/")} />
    </div>
  );
}
