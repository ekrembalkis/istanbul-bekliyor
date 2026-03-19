import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Planner from './pages/Planner'
import AlgorithmCheck from './pages/AlgorithmCheck'
import Calendar from './pages/Calendar'
import Archive from './pages/Archive'
import AlgorithmGuide from './pages/AlgorithmGuide'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/check" element={<AlgorithmCheck />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/algorithm" element={<AlgorithmGuide />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
