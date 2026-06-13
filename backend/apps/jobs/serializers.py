import re
from datetime import timedelta
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers
from .models import Job, Referral, CandidateProgress, Notification, Interview, InterviewEvaluation


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

    def validate(self, attrs):
        referral = self.context.get('referral')
        if not referral:
            return attrs

        old_status = referral.status
        new_status = attrs['status']

        if old_status == new_status:
            raise serializers.ValidationError({'status': '状态未发生变化'})

        if old_status == 'rejected':
            raise serializers.ValidationError({'status': '已淘汰的候选人不能再变更状态'})

        if old_status == 'accepted':
            raise serializers.ValidationError({'status': '已通过的候选人不能再变更状态'})

        if new_status == 'pending':
            raise serializers.ValidationError({'status': '不能将状态变更回待审核'})

        if new_status == 'rejected':
            return attrs

        status_flow = {
            'pending': ['first_interview'],
            'first_interview': ['second_interview'],
            'second_interview': ['accepted'],
        }
        allowed_next = status_flow.get(old_status, [])
        if new_status not in allowed_next:
            status_names = dict(Referral.STATUS_CHOICES)
            old_name = status_names.get(old_status, old_status)
            new_name = status_names.get(new_status, new_status)
            allowed_names = [status_names.get(s, s) for s in allowed_next]
            if allowed_next:
                raise serializers.ValidationError({
                    'status': (
                        f'无法从「{old_name}」直接变更为「{new_name}」。'
                        f'允许的下一状态：{", ".join(allowed_names)}、已淘汰'
                    )
                })
            else:
                raise serializers.ValidationError({
                    'status': f'「{old_name}」状态不允许再变更为「{new_name}」'
                })

        return attrs


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'content', 'referral', 'is_read', 'created_at',
        ]
        read_only_fields = ['id', 'title', 'content', 'referral', 'created_at']


class InterviewEvaluationSerializer(serializers.ModelSerializer):
    recommendation_display = serializers.CharField(
        source='get_recommendation_display', read_only=True
    )
    evaluated_by_name = serializers.CharField(
        source='evaluated_by.username', read_only=True
    )

    class Meta:
        model = InterviewEvaluation
        fields = [
            'id', 'interview',
            'technical_score', 'communication_score', 'teamwork_score',
            'problem_solving_score', 'cultural_fit_score', 'learning_ability_score',
            'overall_comment', 'strengths', 'weaknesses',
            'total_score', 'recommendation', 'recommendation_display',
            'evaluated_by', 'evaluated_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'interview', 'total_score', 'recommendation',
            'evaluated_by', 'created_at', 'updated_at',
        ]


class InterviewEvaluationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewEvaluation
        fields = [
            'technical_score', 'communication_score', 'teamwork_score',
            'problem_solving_score', 'cultural_fit_score', 'learning_ability_score',
            'overall_comment', 'strengths', 'weaknesses', 'recommendation',
        ]

    def validate_scores(self, value):
        if value < 1 or value > 10:
            raise serializers.ValidationError('评分必须在 1-10 分之间')
        return value

    def validate_technical_score(self, value):
        return self.validate_scores(value)

    def validate_communication_score(self, value):
        return self.validate_scores(value)

    def validate_teamwork_score(self, value):
        return self.validate_scores(value)

    def validate_problem_solving_score(self, value):
        return self.validate_scores(value)

    def validate_cultural_fit_score(self, value):
        return self.validate_scores(value)

    def validate_learning_ability_score(self, value):
        return self.validate_scores(value)


class InterviewSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    round_display = serializers.CharField(source='get_round_display', read_only=True)
    interviewer_name = serializers.CharField(
        source='interviewer.username', read_only=True
    )
    candidate_name = serializers.CharField(
        source='referral.candidate_name', read_only=True
    )
    job_title = serializers.CharField(
        source='referral.job.title', read_only=True
    )
    referral_status = serializers.CharField(
        source='referral.status', read_only=True
    )
    evaluation = InterviewEvaluationSerializer(read_only=True)

    class Meta:
        model = Interview
        fields = [
            'id', 'referral', 'referral_status',
            'candidate_name', 'job_title',
            'interviewer', 'interviewer_name',
            'round', 'round_display',
            'scheduled_at', 'status', 'status_display',
            'notes', 'evaluation',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'status',
        ]


class InterviewListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    round_display = serializers.CharField(source='get_round_display', read_only=True)
    interviewer_name = serializers.CharField(
        source='interviewer.username', read_only=True
    )
    candidate_name = serializers.CharField(
        source='referral.candidate_name', read_only=True
    )
    job_title = serializers.CharField(
        source='referral.job.title', read_only=True
    )
    has_evaluation = serializers.SerializerMethodField()

    class Meta:
        model = Interview
        fields = [
            'id', 'candidate_name', 'job_title',
            'interviewer_name', 'round', 'round_display',
            'scheduled_at', 'status', 'status_display',
            'has_evaluation', 'created_at',
        ]

    def get_has_evaluation(self, obj):
        return hasattr(obj, 'evaluation')


class InterviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interview
        fields = [
            'referral', 'interviewer', 'round', 'scheduled_at', 'notes',
        ]

    def validate_interviewer(self, value):
        if value.role != 'interviewer':
            raise serializers.ValidationError('只能指派面试官角色的用户')
        return value

    def validate(self, attrs):
        referral = attrs.get('referral')
        interview_round = attrs.get('round')
        interviewer = attrs.get('interviewer')

        if referral and interview_round and interviewer:
            existing = Interview.objects.filter(
                referral=referral,
                round=interview_round,
                interviewer=interviewer,
                status__in=['pending', 'completed'],
            ).exists()
            if existing:
                raise serializers.ValidationError(
                    '该面试官已被指派过此轮面试'
                )
        return attrs


class InterviewerSerializer(serializers.ModelSerializer):
    class Meta:
        from apps.accounts.models import User
        model = User
        fields = ['id', 'username', 'department', 'avatar']
        extra_kwargs = {'avatar': {'required': False}}
