from django.contrib import admin
from .models import Job, Referral


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['title', 'department', 'location', 'status', 'created_by', 'created_at']
    list_filter = ['status', 'department']
    search_fields = ['title', 'department']


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ['candidate_name', 'job', 'referrer', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['candidate_name', 'candidate_email']
