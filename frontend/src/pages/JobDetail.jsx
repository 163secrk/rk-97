import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { jobAPI, referralAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'
import StatusUpdateModal from '../components/StatusUpdateModal'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [job, setJob] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await jobAPI.getJob(id)
        setJob(res.data)
        if (res.data.created_by === user?.id || user?.role === 'hr') {
          const refRes = await referralAPI.getReferrals()
          const jobRefs = (refRes.data.results || refRes.data).filter(
            (r) => r.job === parseInt(id)
          )
          setReferrals(jobRefs)
        }
      } catch {
        navigate('/')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id, user])

  const handleDelete = async () => {
    if (!window.confirm('确定要删除此职位吗？')) return
    try {
      await jobAPI.deleteJob(id)
      navigate('/')
    } catch {}
  }

  const handleUpdateStatus = async (newStatus) => {
    try {
      const res = await jobAPI.updateJob(id, { status: newStatus })
      setJob(res.data)
    } catch {}
  }

  const openStatusModal = (referral) => {
    setSelectedReferral(referral)
    setModalOpen(true)
  }

  const handleReferralStatusUpdate = async (data) => {
    if (!selectedReferral) return
    try {
      await referralAPI.updateReferralStatus(selectedReferral.id, data)
      setReferrals((prev) =>
        prev.map((r) =>
          r.id === selectedReferral.id
            ? { ...r, status: data.status }
            : r
        )
      )
      setModalOpen(false)
      setSelectedReferral(null)
    } catch {}
  }

  if (loading) return <div className="loading" style={{ minHeight: 200 }}>加载中...</div>
  if (!job) return null

  const isCreator = job.created_by === user?.id
  const canViewReferrals = isCreator || user?.role === 'hr'

  const statusLabel = {
    pending: '待审核',
    first_interview: '初试',
    second_interview: '复试',
    accepted: '已通过',
    rejected: '已淘汰',
  }

  return (
    <div>
      <Link to="/" className="back-link">← 返回职位列表</Link>
      <div className="detail-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h2>{job.title}</h2>
          <span className={`status-badge ${job.status}`}>
            {job.status === 'open' ? '招聘中' : '已关闭'}
          </span>
        </div>

        <div className="meta-row">
          <div className="meta-item"><strong>部门：</strong>{job.department}</div>
          {job.location && <div className="meta-item"><strong>地点：</strong>{job.location}</div>}
          {job.salary_range && <div className="meta-item"><strong>薪资：</strong>{job.salary_range}</div>}
          <div className="meta-item"><strong>发布人：</strong>{job.created_by_name}</div>
          <div className="meta-item"><strong>发布时间：</strong>{new Date(job.created_at).toLocaleDateString()}</div>
        </div>

        <div className="section">
          <h3>职位描述</h3>
          <pre>{job.description}</pre>
        </div>

        {job.requirements && (
          <div className="section">
            <h3>任职要求</h3>
            <pre>{job.requirements}</pre>
          </div>
        )}

        <div className="detail-actions">
          {user?.role === 'employee' && job.status === 'open' && (
            <Link to={`/jobs/${id}/refer`} className="btn btn-success">内推候选人</Link>
          )}
          {isCreator && (
            <>
              <Link to={`/jobs/${id}/edit`} className="btn btn-outline">编辑职位</Link>
              {job.status === 'open' ? (
                <button className="btn btn-outline" onClick={() => handleUpdateStatus('closed')}>关闭职位</button>
              ) : (
                <button className="btn btn-outline" onClick={() => handleUpdateStatus('open')}>重新开放</button>
              )}
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>删除</button>
            </>
          )}
        </div>
      </div>

      {canViewReferrals && referrals.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>内推记录</h3>
          <div className="referral-list">
            {referrals.map((ref) => (
              <div key={ref.id} className="referral-item">
                <div className="info">
                  <h4>{ref.candidate_name}</h4>
                  <p>{ref.candidate_email} | 推荐人：{ref.referrer_name} | {new Date(ref.created_at).toLocaleDateString()}</p>
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
                  {isCreator && ref.status !== 'accepted' && ref.status !== 'rejected' && (
                    <button className="btn btn-primary btn-sm" onClick={() => openStatusModal(ref)}>
                      更新状态
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modalOpen && selectedReferral && (
        <StatusUpdateModal
          referral={selectedReferral}
          onClose={() => { setModalOpen(false); setSelectedReferral(null) }}
          onSubmit={handleReferralStatusUpdate}
        />
      )}
    </div>
  )
}
