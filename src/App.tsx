import { Routes, Route, Link } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Planner from './pages/Planner'
import Calendar from './pages/Calendar'
import Archive from './pages/Archive'
import Settings from './pages/Settings'
import StyleClone from './pages/StyleClone'
import ShadowCheck from './pages/ShadowCheck'
import InstagramPreview from './pages/InstagramPreview'
import HaberServisi from './pages/HaberServisi'
import AlgorithmCheck from './pages/AlgorithmCheck'
import AlgorithmGuide from './pages/AlgorithmGuide'

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="font-display text-8xl text-x-text-primary mb-4">404</div>
      <p className="font-mono text-sm text-x-text-secondary tracking-[2px] uppercase mb-8">Sayfa bulunamadı</p>
      <Link to="/" className="btn btn-primary">PANELE DÖN</Link>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/preview" element={<InstagramPreview />} />
        <Route path="/style" element={<StyleClone />} />
        <Route path="/haberler" element={<HaberServisi />} />
        <Route path="/shadow-check" element={<ShadowCheck />} />
        <Route path="/check" element={<AlgorithmCheck />} />
        <Route path="/algorithm" element={<AlgorithmGuide />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
