import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'employee',
    department: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm_password) {
      setError('两次密码不一致')
      return
    }
    setLoading(true)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      if (typeof data === 'object') {
        const messages = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('; ')
        setError(messages)
      } else {
        setError('注册失败，请稍后重试')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>企业内推平台</h1>
        <p className="subtitle">创建新账户</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>用户名</label>
            <input type="text" value={form.username} onChange={(e) => handleChange('username', e.target.value)} required placeholder="请输入用户名" />
          </div>
          <div className="form-group">
            <label>邮箱</label>
            <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} required placeholder="请输入邮箱" />
          </div>
          <div className="form-group">
            <label>角色</label>
            <select value={form.role} onChange={(e) => handleChange('role', e.target.value)}>
              <option value="employee">员工</option>
              <option value="hr">HR</option>
              <option value="interviewer">面试官</option>
            </select>
          </div>
          <div className="form-group">
            <label>部门</label>
            <input type="text" value={form.department} onChange={(e) => handleChange('department', e.target.value)} placeholder="请输入部门（选填）" />
          </div>
          <div className="form-group">
            <label>手机号</label>
            <input type="text" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="请输入手机号（选填）" />
          </div>
          <div className="form-group">
            <label>密码</label>
            <input type="password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} required placeholder="请输入密码（至少6位）" />
          </div>
          <div className="form-group">
            <label>确认密码</label>
            <input type="password" value={form.confirm_password} onChange={(e) => handleChange('confirm_password', e.target.value)} required placeholder="请再次输入密码" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? '注册中...' : '注 册'}
          </button>
        </form>
        <div className="auth-footer">
          已有账户？<Link to="/login">立即登录</Link>
        </div>
      </div>
    </div>
  )
}
