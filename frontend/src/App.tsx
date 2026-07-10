import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@frontend/components/Layout";
import { DashboardPage } from "@frontend/pages/DashboardPage";
import { ReminderEditorPage } from "@frontend/pages/ReminderEditorPage";
import { SettingsPage } from "@frontend/pages/SettingsPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/reminders/new" element={<ReminderEditorPage mode="new" />} />
        <Route path="/reminders/:id/edit" element={<ReminderEditorPage mode="edit" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
