import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import RightSidebar from './RightSidebar'
import BottomTabBar from './BottomTabBar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-x-bg text-x-text-primary">
      <div className="mx-auto flex max-w-[1265px]">
        {/* Left Sidebar */}
        <aside className="sticky top-0 h-screen hidden sm:flex flex-col w-[88px] lg:w-[275px] border-r-3 border-x-border px-2 lg:px-3 shrink-0 bg-[#0A0A0A]">
          <Sidebar />
        </aside>

        {/* Center Content */}
        <main className="flex-1 min-w-0 max-w-[600px] border-r-3 border-x-border min-h-screen pb-16 sm:pb-0">
          <Outlet />
        </main>

        {/* Right Sidebar */}
        <aside className="hidden md:block w-[350px] shrink-0 px-4">
          <RightSidebar />
        </aside>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  )
}
