import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand">
          🏢 内推平台
        </NavLink>
        <ul className="navbar-nav">
          <li><NavLink to="/" end>职位列表</NavLink></li>
          <li><NavLink to="/my-referrals">我的内推</NavLink></li>
          {user?.role === 'hr' && (
            <>
              <li><NavLink to="/jobs/create">发布职位</NavLink></li>
              <li><NavLink to="/hr-dashboard">管理看板</NavLink></li>
            </>
          )}
        </ul>
        <div className="navbar-user">
          <span className={`role-badge ${user?.role}`}>{user?.role === 'hr' ? 'HR' : '员工'}</span>
          <span>{user?.username}</span>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>退出</button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
