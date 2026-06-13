const STATUS_LABELS = {
  pending: '待审核',
  first_interview: '初试',
  second_interview: '复试',
  accepted: '已通过',
  rejected: '已淘汰',
}

export default function Timeline({ progresses }) {
  if (!progresses || progresses.length === 0) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
        暂无进度记录
      </div>
    )
  }

  return (
    <div className="timeline">
      {progresses.map((item, index) => {
        const isLast = index === progresses.length - 1
        const itemClass = getItemClass(item.status, isLast)
        return (
          <div key={item.id || index} className={`timeline-item ${itemClass}`}>
            <div className="timeline-content">
              <h4>
                <span>{STATUS_LABELS[item.status] || item.status_display}</span>
                <span className="rating-display">
                  {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                </span>
              </h4>
              <div className="feedback-text">{item.feedback}</div>
              <div className="timeline-meta">
                <span>操作人：{item.updated_by_name}</span>
                <span>{new Date(item.created_at).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getItemClass(status, isLast) {
  if (!isLast) {
    if (status === 'rejected') return 'rejected'
    return 'done'
  }
  if (status === 'pending') return 'pending'
  if (status === 'rejected') return 'rejected'
  if (status === 'accepted') return 'done'
  return ''
}
