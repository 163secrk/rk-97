from django.urls import path
from . import views

urlpatterns = [
    path('jobs/', views.JobListView.as_view(), name='job-list'),
    path('jobs/<int:pk>/', views.JobDetailView.as_view(), name='job-detail'),
    path('referrals/', views.ReferralListView.as_view(), name='referral-list'),
    path('referrals/create/', views.ReferralCreateView.as_view(), name='referral-create'),
    path('referrals/<int:pk>/', views.ReferralDetailView.as_view(), name='referral-detail'),
    path('referrals/<int:pk>/status/', views.update_referral_status_view, name='referral-status'),
    path('referrals/<int:pk>/progress/', views.referral_progress_view, name='referral-progress'),
    path('my-referrals/', views.my_referrals_view, name='my-referrals'),
    path('hr-dashboard/', views.hr_dashboard_view, name='hr-dashboard'),
    path('notifications/', views.list_notifications_view, name='notification-list'),
    path('notifications/<int:pk>/read/', views.mark_notification_read_view, name='notification-read'),
    path('notifications/read-all/', views.mark_all_notifications_read_view, name='notification-read-all'),
]
