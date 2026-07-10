import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { sendSettingsTestEmail } from "@frontend/api/client";
import { Button } from "@frontend/components/Button";

const testEmailKey = "mail-reminder.testEmail";

export function SettingsPage() {
  const [testEmail, setTestEmail] = useState(() => localStorage.getItem(testEmailKey) ?? "");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  async function handleSendTestEmail() {
    setEmailStatus(null);
    localStorage.setItem(testEmailKey, testEmail.trim());

    try {
      const result = await sendSettingsTestEmail(testEmail.trim());
      const sender = result.data.sendEmail ? ` from ${result.data.sendEmail}` : "";
      const id = result.data.emailId ? ` (#${result.data.emailId})` : "";
      setEmailStatus(`Test email sent with ${result.data.provider}${sender}${id}`);
    } catch (err) {
      setEmailStatus(err instanceof Error ? err.message : "Failed to send test email");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <section className="space-y-5 rounded-md border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-ink-900">
        <Field label="Test Recipient">
          <input
            type="email"
            value={testEmail}
            onChange={(event) => setTestEmail(event.target.value)}
            placeholder="test@aimid.shop"
            className={inputClass}
          />
        </Field>
        {emailStatus ? (
          <p className="flex min-h-10 items-center gap-2 rounded-md bg-slate-100 px-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-300" />
            {emailStatus}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button type="button" variant="primary" onClick={handleSendTestEmail} icon={<Send className="h-4 w-4" />}>
            Send Test Email
          </Button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "min-h-11 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700";
