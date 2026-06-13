import re
from datetime import timedelta
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers
from .models import Job, Referral, CandidateProgress, Notification


class JobSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Job
        fields = [
            'id', 'title', 'department', 'location', 'salary_range',
            'description', 'requirements', 'status',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class JobListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    referral_count = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = [
            'id', 'title', 'department', 'location', 'salary_range',
            'status', 'created_by_name', 'referral_count', 'created_at',
        ]

    def get_referral_count(self, obj):
        return obj.referrals.count()


class CandidateProgressSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    rating_display = serializers.CharField(source='get_rating_display', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True)

    class Meta:
        model = CandidateProgress
        fields = [
            'id', 'status', 'status_display', 'feedback', 'rating',
            'rating_display', 'updated_by', 'updated_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'updated_by', 'created_at']


class CandidateProgressCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidateProgress
        fields = ['status', 'feedback', 'rating']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('评分必须在 1-5 星之间')
        return value

    def validate_feedback(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('反馈简报不能为空')
        return value


class ReferralSerializer(serializers.ModelSerializer):
    referrer_name = serializers.CharField(source='referrer.username', read_only=True)
    job_title = serializers.CharField(source='job.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    progresses = CandidateProgressSerializer(many=True, read_only=True)

    class Meta:
        model = Referral
        fields = [
            'id', 'job', 'job_title', 'referrer', 'referrer_name',
            'candidate_name', 'candidate_email', 'candidate_phone',
            'resume', 'cover_letter', 'status', 'status_display',
            'progresses', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'referrer', 'status', 'created_at', 'updated_at']


class ReferralListSerializer(serializers.ModelSerializer):
    referrer_name = serializers.CharField(source='referrer.username', read_only=True)
    job_title = serializers.CharField(source='job.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Referral
        fields = [
            'id', 'job', 'job_title', 'referrer', 'referrer_name',
            'candidate_name', 'candidate_email', 'candidate_phone',
            'resume', 'cover_letter', 'status', 'status_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'referrer', 'status', 'created_at', 'updated_at']


class ReferralCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Referral
        fields = [
            'job', 'candidate_name', 'candidate_email',
            'candidate_phone', 'resume', 'cover_letter',
        ]

    def validate_job(self, value):
        if value.status != 'open':
            raise serializers.ValidationError('该职位已关闭，无法内推')
        return value

    def validate_candidate_phone(self, value):
        if value:
            if not re.match(r'^1[3-9]\d{9}$', value):
                raise serializers.ValidationError('请输入有效的11位手机号码')
        return value

    def validate_resume(self, value):
        allowed_extensions = ['.pdf', '.doc', '.docx']
        file_name = value.name.lower()
        if not any(file_name.endswith(ext) for ext in allowed_extensions):
            raise serializers.ValidationError('简历只支持 PDF、DOC、DOCX 格式')
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError('简历文件大小不能超过 10MB')
        return value

    def validate(self, attrs):
        candidate_email = attrs.get('candidate_email')
        candidate_phone = attrs.get('candidate_phone')
        six_months_ago = timezone.now() - timedelta(days=180)

        query = Q(created_at__gte=six_months_ago)
        conditions = Q()
        if candidate_email:
            conditions |= Q(candidate_email=candidate_email)
        if candidate_phone:
            conditions |= Q(candidate_phone=candidate_phone)

        if conditions:
            query &= conditions
            existing = Referral.objects.filter(query).first()
            if existing:
                raise serializers.ValidationError('该候选人在6个月内已被内推过，不能重复内推')
        return attrs


class UpdateStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Referral.STATUS_CHOICES)
    feedback = serializers.CharField()
    rating = serializers.IntegerField(min_value=1, max_value=5)

    def validate_feedback(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('反馈简报不能为空')
        return value


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'content', 'referral', 'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'title', 'content', 'referral', 'created_at']
