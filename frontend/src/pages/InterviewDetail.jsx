import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { interviewAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'
import InterviewEvaluationForm from '../components/InterviewEvaluationForm'

export default function InterviewDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [interview, setInterview] = useState(null)
  const [evaluation, setEvaluation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEvaluationForm, setShowEvaluationForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const fetchData = async () => {
    try {
      const interviewRes = await interviewAPI.getInterview(id)
      setInterview(interviewRes.data)

      try {
        const evalRes = await interviewAPI.getInterviewEvaluation(id)
        setEvaluation(evalRes.data)
      } catch {
        setEvaluation(null)
      }
    } catch {
      navigate('/interviewer-dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleSubmitEvaluation = async (data) => {
    setSubmitError('')
    try {
      if (isEditing) {
        await interviewAPI.updateEvaluation(id, data)
      } else {
        await interviewAPI.submitEvaluation(id, data)
      }
      setShowEvaluationForm(false)
      setIsEditing(false)
      fetchData()
    } catch (err) {
      setSubmitError(err.response?.data?.detail || '提交失败，请重试')
    }
  }

  const handleEditEvaluation = () => {
    setIsEditing(true)
    setShowEvaluationForm(true)
  }

  if (loading) return <div className="loading" style={{ minHeight: 200 }}>加载中...</div>
  if (!interview) return null

  const isInterviewer = interview.interviewer === user?.id
  const canEvaluate = isInterviewer && interview.status === 'pending' && !evaluation

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

  const recommendationLabel = {
    pass: '推荐进入下一轮',
    hold: '待定',
    fail: '不推荐',
  }

  const ScoreDisplay = ({ label, score }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ color: 'var(--gray-600)' }}>{label}</span>
      <span style={{
        fontWeight: 600,
        color: score >= 8 ? 'var(--success)' : score >= 6 ? 'var(--warning)' : 'var(--danger)'
      }}>
        {score} 分
      </span>
    </div>
  )

  return (
    <div>
      <Link to="/interviewer-dashboard" className="back-link">← 返回面试官看板</Link>

      <div className="detail-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2>{interview.candidate_name}</h2>
          <span className={`status-badge ${interview.status}`}>
            {statusLabel[interview.status]}
          </span>
          <span className={`status-badge ${interview.round}`} style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            {roundLabel[interview.round]}
          </span>
        </div>

        <div className="meta-row">
          <div className="meta-item"><strong>应聘职位：</strong>{interview.job_title}</div>
          <div className="meta-item"><strong>面试官：</strong>{interview.interviewer_name}</div>
          {interview.scheduled_at && (
            <div className="meta-item">
              <strong>面试时间：</strong>{new Date(interview.scheduled_at).toLocaleString('zh-CN')}
            </div>
          )}
          <div className="meta-item">
            <strong>候选人状态：</strong>
            <span className={`status-badge ${interview.referral_status || 'pending'}`} style={{ marginLeft: 8 }}>
              {referralStatusLabel[interview.referral_status] || '待审核'}
            </span>
          </div>
        </div>

        {interview.notes && (
          <div className="section">
            <h3>面试备注</h3>
            <p>{interview.notes}</p>
          </div>
        )}

        <div className="detail-actions">
          {canEvaluate && (
            <button className="btn btn-primary" onClick={() => setShowEvaluationForm(true)}>
              填写面试评价
            </button>
          )}
          {evaluation && isInterviewer && (
            <button className="btn btn-outline" onClick={handleEditEvaluation}>
              修改评价
            </button>
          )}
        </div>
      </div>

      {evaluation && (
        <div style={{ marginTop: 32 }}>
          <div className="detail-card">
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>面试评价</h3>

            <div style={{
              background: 'var(--primary-light)',
              padding: 20,
              borderRadius: 8,
              textAlign: 'center',
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 4 }}>综合评分</div>
              <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--primary)' }}>
                {evaluation.total_score}
              </div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>满分 10 分</div>
              <div style={{
                marginTop: 12,
                padding: '6px 16px',
                borderRadius: 20,
                display: 'inline-block',
                fontWeight: 600,
                background: evaluation.recommendation === 'pass' ? 'var(--success-light)'
                  : evaluation.recommendation === 'hold' ? 'var(--warning-light)'
                  : 'var(--danger-light)',
                color: evaluation.recommendation === 'pass' ? 'var(--success)'
                  : evaluation.recommendation === 'hold' ? 'var(--warning)'
                  : 'var(--danger)',
              }}>
                {recommendationLabel[evaluation.recommendation]}
              </div>
            </div>

            <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: 'var(--gray-800)' }}>
              能力评分
            </h4>
            <div style={{ background: 'var(--gray-50)', padding: 16, borderRadius: 8 }}>
              <ScoreDisplay label="技术能力" score={evaluation.technical_score} />
              <ScoreDisplay label="沟通能力" score={evaluation.communication_score} />
              <ScoreDisplay label="团队协作" score={evaluation.teamwork_score} />
              <ScoreDisplay label="问题解决" score={evaluation.problem_solving_score} />
              <ScoreDisplay label="文化适配" score={evaluation.cultural_fit_score} />
              <ScoreDisplay label="学习能力" score={evaluation.learning_ability_score} />
            </div>

            {evaluation.strengths && (
              <div className="section">
                <h3>优点</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{evaluation.strengths}</p>
              </div>
            )}

            {evaluation.weaknesses && (
              <div className="section">
                <h3>待改进点</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{evaluation.weaknesses}</p>
              </div>
            )}

            {evaluation.overall_comment && (
              <div className="section">
                <h3>综合评价</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{evaluation.overall_comment}</p>
              </div>
            )}

            <div style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid var(--gray-100)',
              fontSize: 13,
              color: 'var(--gray-500)',
            }}>
              评价人：{evaluation.evaluated_by_name} | 提交时间：{new Date(evaluation.created_at).toLocaleString('zh-CN')}
            </div>
          </div>
        </div>
      )}

      {showEvaluationForm && (
        <div className="modal-overlay" onClick={() => { setShowEvaluationForm(false); setIsEditing(false); setSubmitError('') }}>
          <div className="modal-content" style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isEditing ? '修改面试评价' : '填写面试评价'}</h3>
              <button className="modal-close" onClick={() => { setShowEvaluationForm(false); setIsEditing(false); setSubmitError('') }}>×</button>
            </div>
            {submitError && <div className="alert alert-error">{submitError}</div>}
            <InterviewEvaluationForm
              initialData={isEditing ? evaluation : null}
              onSubmit={handleSubmitEvaluation}
              onCancel={() => { setShowEvaluationForm(false); setIsEditing(false); setSubmitError('') }}
              isEdit={isEditing}
            />
          </div>
        </div>
      )}
    </div>
  )
}
