from rest_framework import serializers
from .models import Job, Referral


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


class ReferralSerializer(serializers.ModelSerializer):
    referrer_name = serializers.CharField(source='referrer.username', read_only=True)
    job_title = serializers.CharField(source='job.title', read_only=True)

    class Meta:
        model = Referral
        fields = [
            'id', 'job', 'job_title', 'referrer', 'referrer_name',
            'candidate_name', 'candidate_email', 'candidate_phone',
            'resume', 'cover_letter', 'status', 'created_at', 'updated_at',
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
