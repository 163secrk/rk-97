from django.urls import path
from . import views

urlpatterns = [
    path('jobs/', views.JobListView.as_view(), name='job-list'),
    path('jobs/<int:pk>/', views.JobDetailView.as_view(), name='job-detail'),
    path('referrals/', views.ReferralListView.as_view(), name='referral-list'),
    path('referrals/create/', views.ReferralCreateView.as_view(), name='referral-create'),
    path('referrals/<int:pk>/', views.ReferralDetailView.as_view(), name='referral-detail'),
    path('referrals/<int:pk>/status/', views.update_referral_status_view, name='referral-status'),
    path('my-referrals/', views.my_referrals_view, name='my-referrals'),
    path('hr-dashboard/', views.hr_dashboard_view, name='hr-dashboard'),
]
