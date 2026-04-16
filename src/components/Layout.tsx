import { Outlet } from 'react-router-dom'
import TopNavbar from './TopNavbar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-x-bg text-x-text-primary">
      <TopNavbar />
      <main className="max-w-[1280px] mx-auto px-4 lg:px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
