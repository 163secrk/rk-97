import { useState, useEffect } from 'react'
import { referralAPI, jobAPI } from '../api'

export default function HRDashboard() {
  const [stats, setStats] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const [dashRes, refRes] = await Promise.all([
          referralAPI.getHRDashboard(),
          referralAPI.getReferrals(),
        ])
        setStats(dashRes.data)
        setReferrals(refRes.data.results || refRes.data)
      } catch {
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const handleReferralStatus = async (refId, newStatus) => {
    try {
      await referralAPI.updateReferralStatus(refId, newStatus)
      setReferrals((prev) =>
        prev.map((r) => (r.id === refId ? { ...r, status: newStatus } : r))
      )
      setStats((prev) => prev ? { ...prev, pending_referrals: Math.max(0, prev.pending_referrals - 1) } : prev)
    } catch {}
  }

  const statusLabel = {
    pending: '待审核',
    reviewing: '审核中',
    accepted: '已通过',
    rejected: '已拒绝',
  }

  if (loading) return <div className="loading" style={{ minHeight: 200 }}>加载中...</div>

  return (
    <div>
      <div className="page-header">
        <h2>HR 管理看板</h2>
      </div>

      {stats && (
        <div className="dashboard-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total_jobs}</div>
            <div className="stat-label">发布职位总数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.open_jobs}</div>
            <div className="stat-label">招聘中职位</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.total_referrals}</div>
            <div className="stat-label">内推总数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{stats.pending_referrals}</div>
            <div className="stat-label">待处理内推</div>
          </div>
        </div>
      )}

      <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>内推审核</h3>
      {referrals.length === 0 ? (
        <div className="empty-state">
          <p>暂无内推记录</p>
        </div>
      ) : (
        <div className="referral-list">
          {referrals.map((ref) => (
            <div key={ref.id} className="referral-item">
              <div className="info">
                <h4>{ref.candidate_name}</h4>
                <p>
                  推荐至：{ref.job_title} | 推荐人：{ref.referrer_name}
                  | 提交时间：{new Date(ref.created_at).toLocaleDateString()}
                </p>
                <div className="candidate-details" style={{ marginTop: 8, fontSize: 14, color: '#555', lineHeight: 1.8 }}>
                  <div>📧 邮箱：<a href={`mailto:${ref.candidate_email}`}>{ref.candidate_email}</a></div>
                  <div>📱 电话：{ref.candidate_phone || '未填写'}</div>
                  {ref.resume && (
                    <div>📄 简历：<a href={ref.resume} target="_blank" rel="noopener noreferrer">下载查看简历</a></div>
                  )}
                  {ref.cover_letter && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>💬 推荐语：</div>
                      <div style={{
                        background: '#f8f9fa',
                        padding: '10px 12px',
                        borderRadius: 6,
                        whiteSpace: 'pre-wrap',
                        borderLeft: '3px solid var(--primary)'
                      }}>
                        {ref.cover_letter}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="actions">
                <span className={`status-badge ${ref.status}`}>{statusLabel[ref.status]}</span>
                {ref.status === 'pending' && (
                  <>
                    <button className="btn btn-success btn-sm" onClick={() => handleReferralStatus(ref.id, 'reviewing')}>审核</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReferralStatus(ref.id, 'rejected')}>拒绝</button>
                  </>
                )}
                {ref.status === 'reviewing' && (
                  <button className="btn btn-success btn-sm" onClick={() => handleReferralStatus(ref.id, 'accepted')}>通过</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
