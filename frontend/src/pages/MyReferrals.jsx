import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { referralAPI } from '../api'

export default function MyReferrals() {
  const [referrals, setReferrals] = useState([])
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

  const statusLabel = {
    pending: '待审核',
    reviewing: '审核中',
    accepted: '已通过',
    rejected: '已拒绝',
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
          {referrals.map((ref) => (
            <div key={ref.id} className="referral-item">
              <div className="info">
                <h4>{ref.candidate_name}</h4>
                <p>
                  推荐至：{ref.job_title} | {ref.candidate_email}
                  | 提交时间：{new Date(ref.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="actions">
                <span className={`status-badge ${ref.status}`}>{statusLabel[ref.status]}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
