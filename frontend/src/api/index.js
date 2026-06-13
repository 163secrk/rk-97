import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth-expired'))
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (data) => api.post('/register/', data),
  login: (data) => api.post('/login/', data),
  logout: () => api.post('/logout/'),
  getProfile: () => api.get('/profile/'),
  updateProfile: (data) => api.patch('/profile/update/', data),
  getSession: () => api.get('/session/'),
}

export const jobAPI = {
  getJobs: (params) => api.get('/jobs/', { params }),
  getJob: (id) => api.get(`/jobs/${id}/`),
  createJob: (data) => api.post('/jobs/', data),
  updateJob: (id, data) => api.patch(`/jobs/${id}/`, data),
  deleteJob: (id) => api.delete(`/jobs/${id}/`),
}

export const referralAPI = {
  getReferrals: () => api.get('/referrals/'),
  createReferral: (data) => api.post('/referrals/create/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getReferral: (id) => api.get(`/referrals/${id}/`),
  updateReferralStatus: (id, data) => api.patch(`/referrals/${id}/status/`, data),
  getReferralProgress: (id) => api.get(`/referrals/${id}/progress/`),
  getMyReferrals: () => api.get('/my-referrals/'),
  getHRDashboard: () => api.get('/hr-dashboard/'),
}

export const notificationAPI = {
  getNotifications: () => api.get('/notifications/'),
  markAsRead: (id) => api.post(`/notifications/${id}/read/`),
  markAllAsRead: () => api.post('/notifications/read-all/'),
}

export default api
