import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { notificationAPI } from '../api'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getNotifications()
      setNotifications(res.data.results || res.data)
      setUnreadCount(res.data.unread_count || 0)
    } catch {}
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {}
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {}
  }

  const handleNotificationClick = (notification) => {
    handleMarkAsRead(notification.id)
    setShowDropdown(false)
    if (notification.referral) {
      if (user?.role === 'interviewer') {
        navigate('/interviewer-dashboard')
      } else if (user?.role === 'hr') {
        navigate('/hr-dashboard')
      } else {
        navigate('/my-referrals')
      }
    }
  }

  return (
    <div className="layout">
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand">
          🏢 内推平台
        </NavLink>
        <ul className="navbar-nav">
          <li><NavLink to="/" end>职位列表</NavLink></li>
          {user?.role !== 'hr' && user?.role !== 'interviewer' && (
            <li><NavLink to="/my-referrals">我的内推</NavLink></li>
          )}
          {user?.role === 'hr' && (
            <>
              <li><NavLink to="/jobs/create">发布职位</NavLink></li>
              <li><NavLink to="/hr-dashboard">管理看板</NavLink></li>
            </>
          )}
          {user?.role === 'interviewer' && (
            <li><NavLink to="/interviewer-dashboard">面试官看板</NavLink></li>
          )}
        </ul>
        <div className="navbar-user">
          {user && (
            <div className="notification-wrapper" ref={dropdownRef}>
              <div
                className="notification-bell"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </div>
              {showDropdown && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <h4>通知</h4>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllAsRead}>全部已读</button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="notification-empty">暂无通知</div>
                  ) : (
                    notifications.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        className={`notification-item ${item.is_read ? '' : 'unread'}`}
                        onClick={() => handleNotificationClick(item)}
                      >
                        <div className="notification-title">{item.title}</div>
                        <div className="notification-content">{item.content}</div>
                        <div className="notification-time">
                          {new Date(item.created_at).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          <span className={`role-badge ${user?.role}`}>
            {user?.role === 'hr' ? 'HR' : user?.role === 'interviewer' ? '面试官' : '员工'}
          </span>
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
