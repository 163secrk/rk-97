import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { jobAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'

export default function JobList() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [department, setDepartment] = useState('')

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (department) params.department = department
      const res = await jobAPI.getJobs(params)
      setJobs(res.data.results || res.data)
    } catch {
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [search, statusFilter, department])

  return (
    <div>
      <div className="page-header">
        <h2>职位列表</h2>
        {user?.role === 'hr' && (
          <Link to="/jobs/create" className="btn btn-primary">+ 发布职位</Link>
        )}
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索职位名称..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">全部状态</option>
          <option value="open">招聘中</option>
          <option value="closed">已关闭</option>
        </select>
        <input
          type="text"
          placeholder="按部门筛选..."
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading" style={{ minHeight: 200 }}>加载中...</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <p>暂无职位信息</p>
        </div>
      ) : (
        <div className="job-grid">
          {jobs.map((job) => (
            <Link to={`/jobs/${job.id}`} key={job.id} className="job-card">
              <h3>{job.title}</h3>
              <div className="job-meta">
                <span>📍 {job.department}</span>
                {job.location && <span>🏢 {job.location}</span>}
              </div>
              {job.salary_range && <div className="job-salary">{job.salary_range}</div>}
              <div className="job-footer">
                <span className={`status-badge ${job.status}`}>
                  {job.status === 'open' ? '招聘中' : '已关闭'}
                </span>
                <span>内推 {job.referral_count || 0} 人</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
