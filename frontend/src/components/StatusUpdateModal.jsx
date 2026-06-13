import { useState } from 'react'

const STATUS_OPTIONS = [
  { value: 'first_interview', label: '初试' },
  { value: 'second_interview', label: '复试' },
  { value: 'accepted', label: '已通过' },
  { value: 'rejected', label: '已淘汰' },
]

export default function StatusUpdateModal({ referral, onClose, onSubmit }) {
  const [status, setStatus] = useState('first_interview')
  const [feedback, setFeedback] = useState('')
  const [rating, setRating] = useState(3)
  const [hoverRating, setHoverRating] = useState(0)
  const [errors, setErrors] = useState({})

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}
    if (!feedback.trim()) {
      newErrors.feedback = '反馈简报不能为空'
    }
    if (rating < 1 || rating > 5) {
      newErrors.rating = '请选择评分'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    onSubmit({ status, feedback, rating })
  }

  const availableStatuses = STATUS_OPTIONS.filter(opt => opt.value !== referral.status)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>更新候选人状态</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div style={{ marginBottom: 20, padding: 12, background: 'var(--gray-50)', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{referral.candidate_name}</div>
          <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            职位：{referral.job_title} | 当前状态：{getCurrentStatusLabel(referral.status)}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>新状态</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {availableStatuses.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>反馈简报</label>
            <textarea
              value={feedback}
              onChange={(e) => { setFeedback(e.target.value); setErrors({ ...errors, feedback: '' }) }}
              placeholder="请输入本次状态更新的反馈意见..."
              rows={4}
            />
            {errors.feedback && <div className="error-text">{errors.feedback}</div>}
          </div>

          <div className="form-group">
            <label>评分</label>
            <div className="rating-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`rating-star ${(hoverRating || rating) >= star ? 'active' : ''}`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => { setRating(star); setErrors({ ...errors, rating: '' }) }}
                >
                  ★
                </span>
              ))}
              <span style={{ marginLeft: 8, color: 'var(--gray-500)', fontSize: 14 }}>
                {rating} 星
              </span>
            </div>
            {errors.rating && <div className="error-text">{errors.rating}</div>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary">确认更新</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getCurrentStatusLabel(status) {
  const labels = {
    pending: '待审核',
    first_interview: '初试',
    second_interview: '复试',
    accepted: '已通过',
    rejected: '已淘汰',
  }
  return labels[status] || status
}
