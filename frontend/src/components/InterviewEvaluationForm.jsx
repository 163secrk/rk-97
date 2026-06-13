import { useState, useEffect } from 'react'

const scoreItems = [
  { key: 'technical_score', label: '技术能力', desc: '专业知识、技术深度、问题解决能力' },
  { key: 'communication_score', label: '沟通能力', desc: '表达清晰、倾听理解、沟通效率' },
  { key: 'teamwork_score', label: '团队协作', desc: '合作精神、冲突处理、责任担当' },
  { key: 'problem_solving_score', label: '问题解决', desc: '分析能力、逻辑思维、方案设计' },
  { key: 'cultural_fit_score', label: '文化适配', desc: '价值观匹配、团队融入、工作态度' },
  { key: 'learning_ability_score', label: '学习能力', desc: '求知欲、适应力、成长潜力' },
]

const recommendationOptions = [
  { value: 'pass', label: '推荐进入下一轮', color: 'var(--success)' },
  { value: 'hold', label: '待定', color: 'var(--warning)' },
  { value: 'fail', label: '不推荐', color: 'var(--danger)' },
]

export default function InterviewEvaluationForm({ initialData, onSubmit, onCancel, isEdit }) {
  const [formData, setFormData] = useState({
    technical_score: 0,
    communication_score: 0,
    teamwork_score: 0,
    problem_solving_score: 0,
    cultural_fit_score: 0,
    learning_ability_score: 0,
    overall_comment: '',
    strengths: '',
    weaknesses: '',
    recommendation: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (initialData) {
      setFormData({
        technical_score: initialData.technical_score || 0,
        communication_score: initialData.communication_score || 0,
        teamwork_score: initialData.teamwork_score || 0,
        problem_solving_score: initialData.problem_solving_score || 0,
        cultural_fit_score: initialData.cultural_fit_score || 0,
        learning_ability_score: initialData.learning_ability_score || 0,
        overall_comment: initialData.overall_comment || '',
        strengths: initialData.strengths || '',
        weaknesses: initialData.weaknesses || '',
        recommendation: initialData.recommendation || '',
      })
    }
  }, [initialData])

  const handleScoreChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  const handleTextChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  const validate = () => {
    const newErrors = {}
    for (const item of scoreItems) {
      const score = formData[item.key]
      if (score < 1 || score > 10) {
        newErrors[item.key] = '请选择 1-10 分'
      }
    }
    if (!formData.overall_comment?.trim()) {
      newErrors.overall_comment = '请填写综合评价'
    }
    if (!formData.recommendation) {
      newErrors.recommendation = '请选择推荐建议'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit(formData)
  }

  const calculateAverage = () => {
    const scores = scoreItems.map((item) => formData[item.key])
    const validScores = scores.filter((s) => s >= 1 && s <= 10)
    if (validScores.length === 0) return 0
    return (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2)
  }

  const averageScore = calculateAverage()

  const ScoreSelector = ({ value, onChange, max = 10 }) => (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {Array.from({ length: max }, (_, i) => i + 1).map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(num)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            border: value === num ? '2px solid var(--primary)' : '1px solid var(--gray-300)',
            background: value === num ? 'var(--primary)' : 'white',
            color: value === num ? 'white' : 'var(--gray-700)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {num}
        </button>
      ))}
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 24 }}>
        <div style={{
          background: 'var(--primary-light)',
          padding: 16,
          borderRadius: 8,
          textAlign: 'center',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 4 }}>当前平均分</div>
          <div style={{ fontSize: 48, fontWeight: 700, color: 'var(--primary)' }}>
            {averageScore}
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>满分 10 分</div>
        </div>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--gray-800)' }}>
        能力评分（1-10 分）
      </h3>

      <div style={{ display: 'grid', gap: 16 }}>
        {scoreItems.map((item) => (
          <div key={item.key} className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{item.label}</span>
              {formData[item.key] > 0 && (
                <span style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: formData[item.key] >= 8 ? 'var(--success)' : formData[item.key] >= 6 ? 'var(--warning)' : 'var(--danger)'
                }}>
                  {formData[item.key]}
                </span>
              )}
            </label>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>{item.desc}</div>
            <ScoreSelector
              value={formData[item.key]}
              onChange={(v) => handleScoreChange(item.key, v)}
            />
            {errors[item.key] && <div className="error-text">{errors[item.key]}</div>}
          </div>
        ))}
      </div>

      <div className="form-group" style={{ marginTop: 24 }}>
        <label>优点</label>
        <textarea
          value={formData.strengths}
          onChange={(e) => handleTextChange('strengths', e.target.value)}
          placeholder="请描述候选人的主要优点..."
        />
      </div>

      <div className="form-group">
        <label>待改进点</label>
        <textarea
          value={formData.weaknesses}
          onChange={(e) => handleTextChange('weaknesses', e.target.value)}
          placeholder="请描述候选人需要改进的地方..."
        />
      </div>

      <div className="form-group">
        <label>综合评价 <span style={{ color: 'var(--danger)' }}>*</span></label>
        <textarea
          value={formData.overall_comment}
          onChange={(e) => handleTextChange('overall_comment', e.target.value)}
          placeholder="请填写对候选人的综合评价..."
          style={{ minHeight: 120 }}
        />
        {errors.overall_comment && <div className="error-text">{errors.overall_comment}</div>}
      </div>

      <div className="form-group">
        <label>推荐建议 <span style={{ color: 'var(--danger)' }}>*</span></label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {recommendationOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleTextChange('recommendation', option.value)}
              style={{
                flex: 1,
                minWidth: 140,
                padding: '12px 16px',
                borderRadius: 8,
                border: formData.recommendation === option.value
                  ? `2px solid ${option.color}`
                  : '1px solid var(--gray-300)',
                background: formData.recommendation === option.value
                  ? option.value === 'pass' ? 'var(--success-light)'
                    : option.value === 'hold' ? 'var(--warning-light)'
                    : 'var(--danger-light)'
                  : 'white',
                color: formData.recommendation === option.value ? option.color : 'var(--gray-700)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {errors.recommendation && <div className="error-text" style={{ marginTop: 8 }}>{errors.recommendation}</div>}
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-outline" onClick={onCancel}>取消</button>
        <button type="submit" className="btn btn-primary">
          {isEdit ? '更新评价' : '提交评价'}
        </button>
      </div>
    </form>
  )
}
