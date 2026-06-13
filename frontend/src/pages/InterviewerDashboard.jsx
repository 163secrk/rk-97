import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { interviewAPI } from '../api'

export default function InterviewerDashboard() {
  const [stats, setStats] = useState(null)
  const [interviews, setInterviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchData = async () => {
    try {
      const [dashRes, intRes] = await Promise.all([
        interviewAPI.getInterviewerDashboard(),
        interviewAPI.getMyInterviews({ status: statusFilter }),
      ])
      setStats(dashRes.data)
      setInterviews(intRes.data.results || intRes.data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [statusFilter])

  const statusLabel = {
    pending: '待面试',
    completed: '已完成',
    cancelled: '已取消',
  }

  const roundLabel = {
    first: '初试',
    second: '复试',
    third: '终试',
  }

  const referralStatusLabel = {
    pending: '待审核',
    first_interview: '初试',
    second_interview: '复试',
    accepted: '已通过',
    rejected: '已淘汰',
  }

  if (loading) return <div className="loading" style={{ minHeight: 200 }}>加载中...</div>

  return (
    <div>
      <div className="page-header">
        <h2>面试官看板</h2>
      </div>

      {stats && (
        <div className="dashboard-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total_interviews}</div>
            <div className="stat-label">面试总数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.pending_interviews}</div>
            <div className="stat-label">待面试</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--success)' }}>{stats.completed_interviews}</div>
            <div className="stat-label">已完成</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>我的面试</h3>
        <div className="search-bar" style={{ marginBottom: 0 }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">全部状态</option>
            <option value="pending">待面试</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
      </div>

      {interviews.length === 0 ? (
        <div className="empty-state">
          <p>暂无面试记录</p>
        </div>
      ) : (
        <div className="referral-list">
          {interviews.map((interview) => (
            <div key={interview.id} className="referral-item">
              <div className="info">
                <h4>{interview.candidate_name}</h4>
                <p>
                  应聘职位：{interview.job_title} | 面试轮次：{roundLabel[interview.round]}
                  {interview.scheduled_at && ` | 面试时间：${new Date(interview.scheduled_at).toLocaleString('zh-CN')}`}
                </p>
                <div className="candidate-details" style={{ marginTop: 8, fontSize: 14, color: '#555', lineHeight: 1.8 }}>
                  <div>
                    📊 候选人当前状态：
                    <span className={`status-badge ${interview.referral_status || 'pending'}`} style={{ marginLeft: 8 }}>
                      {referralStatusLabel[interview.referral_status] || '待审核'}
                    </span>
                  </div>
                  {interview.notes && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>📝 备注：</div>
                      <div style={{
                        background: '#f8f9fa',
                        padding: '10px 12px',
                        borderRadius: 6,
                        whiteSpace: 'pre-wrap',
                        borderLeft: '3px solid var(--primary)'
                      }}>
                        {interview.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="actions">
                <span className={`status-badge ${interview.status}`}>{statusLabel[interview.status]}</span>
                {interview.has_evaluation && (
                  <span className="status-badge accepted" style={{ marginLeft: 8 }}>已评价</span>
                )}
                <Link to={`/interviews/${interview.id}`} className="btn btn-primary btn-sm">
                  {interview.status === 'pending' && !interview.has_evaluation ? '填写评价' : '查看详情'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
