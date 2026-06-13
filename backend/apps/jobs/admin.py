from django import forms
from django.contrib import admin, messages
from django.contrib.admin import helpers
from django.template.response import TemplateResponse
from .models import Job, Referral, CandidateProgress, Notification, Interview, InterviewEvaluation


class CandidateProgressInline(admin.TabularInline):
    model = CandidateProgress
    extra = 0
    readonly_fields = ['created_at', 'updated_by']
    fields = ['status', 'feedback', 'rating', 'updated_by', 'created_at']
    ordering = ['-created_at']

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class ReferralStatusForm(forms.ModelForm):
    feedback = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={'rows': 3}),
        label='反馈简报',
        help_text='更新状态时必填'
    )
    rating = forms.ChoiceField(
        required=False,
        choices=[(i, f'{i} 星') for i in range(1, 6)],
        label='评分',
        help_text='更新状态时必填'
    )

    class Meta:
        model = Referral
        fields = '__all__'


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['title', 'department', 'location', 'status', 'created_by', 'created_at']
    list_filter = ['status', 'department']
    search_fields = ['title', 'department']


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    form = ReferralStatusForm
    list_display = ['candidate_name', 'candidate_phone', 'candidate_email', 'job', 'referrer', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['candidate_name', 'candidate_email', 'candidate_phone']
    readonly_fields = ['referrer', 'created_at', 'updated_at']
    inlines = [CandidateProgressInline]

    def save_model(self, request, obj, form, change):
        if change and 'status' in form.changed_data:
            feedback = form.cleaned_data.get('feedback')
            rating = form.cleaned_data.get('rating')

            if not feedback or not feedback.strip():
                messages.error(request, '更新状态时必须填写反馈简报')
                return

            if not rating:
                messages.error(request, '更新状态时必须选择评分')
                return

            try:
                obj.update_status(
                    new_status=obj.status,
                    feedback=feedback,
                    rating=int(rating),
                    updated_by=request.user,
                )
            except ValueError as e:
                messages.error(request, str(e))
                return

            messages.success(request, f'状态已更新，进度记录和通知已发送')
        else:
            super().save_model(request, obj, form, change)

            if not change and not obj.progresses.exists():
                CandidateProgress.objects.create(
                    referral=obj,
                    status='pending',
                    feedback='内推已提交，等待HR审核',
                    rating=3,
                    updated_by=request.user,
                )

    def get_fieldsets(self, request, obj=None):
        if obj:
            return [
                ('基本信息', {
                    'fields': ['job', 'referrer', 'created_at', 'updated_at']
                }),
                ('候选人信息', {
                    'fields': ['candidate_name', 'candidate_email', 'candidate_phone', 'resume', 'cover_letter']
                }),
                ('状态更新', {
                    'fields': ['status', 'feedback', 'rating'],
                    'description': '修改状态时必须填写反馈简报和评分'
                }),
            ]
        return super().get_fieldsets(request, obj)


@admin.register(CandidateProgress)
class CandidateProgressAdmin(admin.ModelAdmin):
    list_display = ['referral', 'status', 'rating', 'updated_by', 'created_at']
    list_filter = ['status', 'rating']
    search_fields = ['referral__candidate_name', 'feedback']
    readonly_fields = ['referral', 'status', 'feedback', 'rating', 'updated_by', 'created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'is_read', 'created_at']
    list_filter = ['is_read']
    search_fields = ['title', 'content']
    readonly_fields = ['user', 'title', 'content', 'referral', 'created_at']

    def has_add_permission(self, request):
        return False


class InterviewEvaluationInline(admin.StackedInline):
    model = InterviewEvaluation
    extra = 0
    readonly_fields = ['evaluated_by', 'created_at', 'updated_at', 'total_score']
    fields = [
        'technical_score', 'communication_score', 'teamwork_score',
        'problem_solving_score', 'cultural_fit_score', 'learning_ability_score',
        'overall_comment', 'strengths', 'weaknesses',
        'total_score', 'recommendation', 'evaluated_by', 'created_at',
    ]

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ['referral', 'interviewer', 'round', 'status', 'scheduled_at', 'created_at']
    list_filter = ['status', 'round']
    search_fields = ['referral__candidate_name', 'interviewer__username']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [InterviewEvaluationInline]


@admin.register(InterviewEvaluation)
class InterviewEvaluationAdmin(admin.ModelAdmin):
    list_display = ['interview', 'total_score', 'recommendation', 'evaluated_by', 'created_at']
    list_filter = ['recommendation']
    search_fields = ['interview__referral__candidate_name', 'overall_comment']
    readonly_fields = ['interview', 'total_score', 'evaluated_by', 'created_at', 'updated_at']

    def has_add_permission(self, request):
        return False
