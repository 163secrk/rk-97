import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { jobAPI } from '../api'

export default function JobCreate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    department: '',
    location: '',
    salary_range: '',
    description: '',
    requirements: '',
    status: 'open',
  })

  useEffect(() => {
    if (isEdit) {
      jobAPI.getJob(id).then((res) => {
        const j = res.data
        setForm({
          title: j.title,
          department: j.department,
          location: j.location,
          salary_range: j.salary_range,
          description: j.description,
          requirements: j.requirements,
          status: j.status,
        })
      }).catch(() => navigate('/'))
    }
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isEdit) {
        await jobAPI.updateJob(id, form)
      } else {
        await jobAPI.createJob(form)
      }
      navigate('/')
    } catch (err) {
      setError('操作失败，请检查表单内容')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div>
      <a href="/" className="back-link" onClick={(e) => { e.preventDefault(); navigate('/') }}>← 返回</a>
      <div className="referral-form-card">
        <h2>{isEdit ? '编辑职位' : '发布新职位'}</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>职位名称 *</label>
            <input type="text" value={form.title} onChange={(e) => handleChange('title', e.target.value)} required placeholder="如：高级前端工程师" />
          </div>
          <div className="form-group">
            <label>所属部门 *</label>
            <input type="text" value={form.department} onChange={(e) => handleChange('department', e.target.value)} required placeholder="如：技术部" />
          </div>
          <div className="form-group">
            <label>工作地点</label>
            <input type="text" value={form.location} onChange={(e) => handleChange('location', e.target.value)} placeholder="如：北京/上海" />
          </div>
          <div className="form-group">
            <label>薪资范围</label>
            <input type="text" value={form.salary_range} onChange={(e) => handleChange('salary_range', e.target.value)} placeholder="如：25K-40K" />
          </div>
          <div className="form-group">
            <label>职位描述 *</label>
            <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} required placeholder="请详细描述该职位的工作内容..." />
          </div>
          <div className="form-group">
            <label>任职要求</label>
            <textarea value={form.requirements} onChange={(e) => handleChange('requirements', e.target.value)} placeholder="请描述该职位的任职要求..." />
          </div>
          {isEdit && (
            <div className="form-group">
              <label>状态</label>
              <select value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                <option value="open">招聘中</option>
                <option value="closed">已关闭</option>
              </select>
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? '提交中...' : isEdit ? '保存修改' : '发布职位'}
          </button>
        </form>
      </div>
    </div>
  )
}
