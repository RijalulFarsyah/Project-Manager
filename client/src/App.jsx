import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ConfirmDialogProvider } from './hooks/useConfirm.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import ProjectsListPage from './pages/ProjectsListPage';
import NewProjectPage from './pages/NewProjectPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProjectSettingsPage from './pages/ProjectSettingsPage';
import TasksPage from './pages/TasksPage';
import CalendarPage from './pages/CalendarPage';
import TeamPage from './pages/TeamPage';
import GanttPage from './pages/GanttPage';
import PertPage from './pages/PertPage';
import CriticalPathPage from './pages/CriticalPathPage';
import DashboardPage from './pages/DashboardPage';
import TaskDetailPage from './pages/TaskDetailPage';

const PlaceholderPage = ({ title }) => (
  <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
    <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="mt-1 text-xs text-text-secondary">Halaman ini sedang dikerjakan.</p>
    </div>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
     <ConfirmDialogProvider>
      <Routes>
        {/* Halaman publik */}
        <Route path="/login" element={<LoginPage />} />

        {/* Area privat dengan layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsListPage />} />
          <Route path="projects/new" element={<NewProjectPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route
            path="projects/:projectId/calendar"
            element={<CalendarPage />}
          />
          <Route
            path="projects/:projectId/tasks"
            element={<TasksPage />}
          />
          <Route
            path="projects/:projectId/tasks/new"
            element={<PlaceholderPage title="Tugas Baru" />}
          />
          <Route
            path="projects/:projectId/tasks/:taskId"
            element={<TaskDetailPage />}
          />
          <Route
            path="projects/:projectId/team"
            element={<TeamPage />}
          />
          <Route
            path="projects/:projectId/team/new"
            element={<PlaceholderPage title="Anggota Baru" />}
          />
          <Route
            path="projects/:projectId/gantt"
            element={<GanttPage />}
          />
          <Route
            path="projects/:projectId/pert"
            element={<PertPage />}
          />
          <Route
            path="projects/:projectId/critical"
            element={<CriticalPathPage />}
          />
          <Route
            path="projects/:projectId/settings"
            element={<ProjectSettingsPage />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
     </ConfirmDialogProvider>
    </AuthProvider>
  );
}
