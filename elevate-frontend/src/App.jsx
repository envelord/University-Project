import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import { ToastProvider } from './hooks/useToast';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="layout">
          <Sidebar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
          </Routes>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
