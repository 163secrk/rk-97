import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { referralAPI, jobAPI } from '../api'

export default function ReferralCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [form, setForm] = useState({
    job: id,
    candidate_name: '',
    candidate_email: '',
    candidate_phone: '',
    cover_letter: '',
  })
  const [resume, setResume] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    jobAPI.getJob(id).then((res) => {
      if (res.data.status !== 'open') {
        setError('该职位已关闭，无法内推')
      }
      setJob(res.data)
    }).catch(() => navigate('/'))
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!resume) {
      setError('请上传候选人简历')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('job', form.job)
      formData.append('candidate_name', form.candidate_name)
      formData.append('candidate_email', form.candidate_email)
      formData.append('candidate_phone', form.candidate_phone)
      formData.append('cover_letter', form.cover_letter)
      formData.append('resume', resume)
      await referralAPI.createReferral(formData)
      navigate('/my-referrals')
    } catch (err) {
      const data = err.response?.data
      if (typeof data === 'object') {
        const messages = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('; ')
        setError(messages)
      } else {
        setError('提交失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div>
      <Link to={`/jobs/${id}`} className="back-link">← 返回职位详情</Link>
      <div className="referral-form-card">
        <h2>内推候选人</h2>
        {job && <div className="job-info">目标职位：{job.title} - {job.department}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>候选人姓名 *</label>
            <input type="text" value={form.candidate_name} onChange={(e) => handleChange('candidate_name', e.target.value)} required placeholder="请输入候选人姓名" />
          </div>
          <div className="form-group">
            <label>候选人邮箱 *</label>
            <input type="email" value={form.candidate_email} onChange={(e) => handleChange('candidate_email', e.target.value)} required placeholder="请输入候选人邮箱" />
          </div>
          <div className="form-group">
            <label>候选人电话</label>
            <input type="text" value={form.candidate_phone} onChange={(e) => handleChange('candidate_phone', e.target.value)} placeholder="请输入候选人电话（选填）" />
          </div>
          <div className="form-group">
            <label>简历 *</label>
            <div className="file-upload" onClick={() => document.getElementById('resume-input').click()}>
              <input
                id="resume-input"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResume(e.target.files[0])}
              />
              <div className="upload-text">
                <strong>点击上传简历</strong>
                <br />
                支持 PDF、DOC、DOCX 格式
              </div>
              {resume && <div className="file-name">已选择：{resume.name}</div>}
            </div>
          </div>
          <div className="form-group">
            <label>推荐语</label>
            <textarea value={form.cover_letter} onChange={(e) => handleChange('cover_letter', e.target.value)} placeholder="请填写推荐理由（选填）..." />
          </div>
          <button type="submit" className="btn btn-success btn-block" disabled={loading}>
            {loading ? '提交中...' : '提交内推'}
          </button>
        </form>
      </div>
    </div>
  )
}
