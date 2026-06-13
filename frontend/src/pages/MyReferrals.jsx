import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { referralAPI } from '../api'
import Timeline from '../components/Timeline'

export default function MyReferrals() {
  const [referrals, setReferrals] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await referralAPI.getMyReferrals()
        setReferrals(res.data.results || res.data)
      } catch {
        setReferrals([])
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    try {
      const res = await referralAPI.getReferralProgress(id)
      setReferrals((prev) =>
        prev.map((r) => (r.id === id ? { ...r, _progresses: res.data } : r))
      )
      setExpandedId(id)
    } catch {}
  }

  const statusLabel = {
    pending: '待审核',
    first_interview: '初试',
    second_interview: '复试',
    accepted: '已通过',
    rejected: '已淘汰',
  }

  const getStepInfo = (status) => {
    const steps = ['pending', 'first_interview', 'second_interview', 'accepted', 'rejected']
    const currentIndex = steps.indexOf(status)
    const totalSteps = status === 'rejected' ? currentIndex + 1 : 4
    return { current: currentIndex + 1, total: totalSteps }
  }

  return (
    <div>
      <div className="page-header">
        <h2>我的内推</h2>
      </div>

      {loading ? (
        <div className="loading" style={{ minHeight: 200 }}>加载中...</div>
      ) : referrals.length === 0 ? (
        <div className="empty-state">
          <p>您还没有内推记录</p>
          <Link to="/" className="btn btn-primary">浏览职位</Link>
        </div>
      ) : (
        <div className="referral-list">
          {referrals.map((ref) => {
            const stepInfo = getStepInfo(ref.status)
            const isExpanded = expandedId === ref.id
            return (
              <div
                key={ref.id}
                className={`referral-item ${isExpanded ? 'expanded' : ''}`}
              >
                <div className="item-header">
                  <div className="info">
                    <h4>{ref.candidate_name}</h4>
                    <p>
                      推荐至：{ref.job_title} | {ref.candidate_email}
                      | 提交时间：{new Date(ref.created_at).toLocaleDateString()}
                      | 当前进度：第 {stepInfo.current} / {stepInfo.total} 步
                    </p>
                  </div>
                  <div className="actions">
                    <span className={`status-badge ${ref.status}`}>{statusLabel[ref.status]}</span>
                    <button
                      className="referral-progress-btn"
                      onClick={() => toggleExpand(ref.id)}
                    >
                      {isExpanded ? '收起进度 ▲' : '查看进度 ▼'}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="expanded-content">
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>
                      📊 进度追踪时间轴
                    </div>
                    {ref._progresses ? (
                      <Timeline progresses={ref._progresses} />
                    ) : (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--gray-400)' }}>
                        加载中...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
