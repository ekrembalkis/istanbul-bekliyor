import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Planner from './pages/Planner'
import Calendar from './pages/Calendar'
import Archive from './pages/Archive'
import Settings from './pages/Settings'
import StyleClone from './pages/StyleClone'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/style" element={<StyleClone />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
