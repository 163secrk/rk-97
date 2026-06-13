import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import JobList from './pages/JobList'
import JobDetail from './pages/JobDetail'
import JobCreate from './pages/JobCreate'
import MyReferrals from './pages/MyReferrals'
import HRDashboard from './pages/HRDashboard'
import ReferralCreate from './pages/ReferralCreate'
import InterviewerDashboard from './pages/InterviewerDashboard'
import InterviewDetail from './pages/InterviewDetail'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">加载中...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function HRRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">加载中...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'hr') return <Navigate to="/" replace />
  return children
}

function InterviewerRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">加载中...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'interviewer') return <Navigate to="/" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">加载中...</div>
  if (user) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<JobList />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="jobs/:id/refer" element={<ReferralCreate />} />
        <Route path="jobs/create" element={<HRRoute><JobCreate /></HRRoute>} />
        <Route path="jobs/:id/edit" element={<HRRoute><JobCreate /></HRRoute>} />
        <Route path="my-referrals" element={<ProtectedRoute><MyReferrals /></ProtectedRoute>} />
        <Route path="hr-dashboard" element={<HRRoute><HRDashboard /></HRRoute>} />
        <Route path="interviewer-dashboard" element={<InterviewerRoute><InterviewerDashboard /></InterviewerRoute>} />
        <Route path="interviews/:id" element={<InterviewerRoute><InterviewDetail /></InterviewerRoute>} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
