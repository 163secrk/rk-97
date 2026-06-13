from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Job, Referral, CandidateProgress, Notification, Interview, InterviewEvaluation
from .serializers import (
    JobSerializer, JobListSerializer,
    ReferralSerializer, ReferralCreateSerializer,
    UpdateStatusSerializer, CandidateProgressSerializer,
    NotificationSerializer,
    InterviewSerializer, InterviewListSerializer,
    InterviewCreateSerializer, InterviewEvaluationSerializer,
    InterviewEvaluationCreateSerializer, InterviewerSerializer,
)


class IsHR(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'hr'


class JobListView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return JobSerializer
        return JobListSerializer

    def get_queryset(self):
        queryset = Job.objects.all()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department=department)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class JobDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Job.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return JobSerializer

    def check_object_permissions(self, request, obj):
        super().check_object_permissions(request, obj)
        if request.method in ['PUT', 'PATCH', 'DELETE'] and obj.created_by != request.user:
            self.permission_denied(request, message='只能修改自己发布的职位')


class ReferralListView(generics.ListAPIView):
    serializer_class = ReferralSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'hr':
            return Referral.objects.filter(job__created_by=user)
        return Referral.objects.filter(referrer=user)


class ReferralCreateView(generics.CreateAPIView):
    serializer_class = ReferralCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        referral = serializer.save(referrer=self.request.user)
        CandidateProgress.objects.create(
            referral=referral,
            status='pending',
            feedback='内推已提交，等待HR审核',
            rating=3,
            updated_by=self.request.user,
        )


class ReferralDetailView(generics.RetrieveAPIView):
    queryset = Referral.objects.all()
    serializer_class = ReferralSerializer
    permission_classes = [IsAuthenticated]


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_referral_status_view(request, pk):
    try:
        referral = Referral.objects.get(pk=pk)
    except Referral.DoesNotExist:
        return Response({'detail': '内推记录不存在'}, status=status.HTTP_404_NOT_FOUND)

    if referral.job.created_by != request.user:
        return Response({'detail': '只有该职位的HR可以更新状态'}, status=status.HTTP_403_FORBIDDEN)

    serializer = UpdateStatusSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    validated_data = serializer.validated_data
    new_status = validated_data['status']
    feedback = validated_data['feedback']
    rating = validated_data['rating']

    try:
        referral.update_status(new_status, feedback, rating, request.user)
    except ValueError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(ReferralSerializer(referral).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_referrals_view(request):
    referrals = Referral.objects.filter(referrer=request.user)
    serializer = ReferralSerializer(referrals, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hr_dashboard_view(request):
    if request.user.role != 'hr':
        return Response({'detail': '仅HR可访问'}, status=status.HTTP_403_FORBIDDEN)
    jobs = Job.objects.filter(created_by=request.user)
    total_jobs = jobs.count()
    open_jobs = jobs.filter(status='open').count()
    total_referrals = Referral.objects.filter(job__created_by=request.user).count()
    pending_referrals = Referral.objects.filter(
        job__created_by=request.user, status='pending'
    ).count()
    return Response({
        'total_jobs': total_jobs,
        'open_jobs': open_jobs,
        'total_referrals': total_referrals,
        'pending_referrals': pending_referrals,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_notifications_view(request):
    notifications = Notification.objects.filter(user=request.user)
    unread_count = notifications.filter(is_read=False).count()
    serializer = NotificationSerializer(notifications, many=True)
    return Response({
        'results': serializer.data,
        'unread_count': unread_count,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read_view(request, pk):
    try:
        notification = Notification.objects.get(pk=pk, user=request.user)
    except Notification.DoesNotExist:
        return Response({'detail': '通知不存在'}, status=status.HTTP_404_NOT_FOUND)

    notification.is_read = True
    notification.save()
    return Response(NotificationSerializer(notification).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read_view(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'detail': '已全部标记为已读'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def referral_progress_view(request, pk):
    try:
        referral = Referral.objects.get(pk=pk)
    except Referral.DoesNotExist:
        return Response({'detail': '内推记录不存在'}, status=status.HTTP_404_NOT_FOUND)

    if referral.referrer != request.user and referral.job.created_by != request.user:
        return Response({'detail': '无权查看'}, status=status.HTTP_403_FORBIDDEN)

    progresses = referral.progresses.all()
    serializer = CandidateProgressSerializer(progresses, many=True)
    return Response(serializer.data)


class IsInterviewer(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'interviewer'


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsHR])
def list_interviewers_view(request):
    from apps.accounts.models import User
    interviewers = User.objects.filter(role='interviewer')
    serializer = InterviewerSerializer(interviewers, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsHR])
def assign_interviewer_view(request):
    serializer = InterviewCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    referral = serializer.validated_data['referral']
    if referral.job.created_by != request.user:
        return Response(
            {'detail': '只能为自己发布的职位指派面试官'},
            status=status.HTTP_403_FORBIDDEN,
        )

    interview = serializer.save()

    Notification.objects.create(
        user=interview.interviewer,
        title=f'新的面试指派',
        content=(
            f'您被指派为候选人「{referral.candidate_name}」'
            f'（职位：{referral.job.title}）的{interview.get_round_display()}面试官。\n'
            f'请及时安排面试并填写评价。'
        ),
        referral=referral,
    )

    return Response(
        InterviewSerializer(interview).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def referral_interviews_view(request, pk):
    try:
        referral = Referral.objects.get(pk=pk)
    except Referral.DoesNotExist:
        return Response({'detail': '内推记录不存在'}, status=status.HTTP_404_NOT_FOUND)

    if (
        referral.referrer != request.user
        and referral.job.created_by != request.user
        and request.user.role != 'interviewer'
    ):
        return Response({'detail': '无权查看'}, status=status.HTTP_403_FORBIDDEN)

    interviews = referral.interviews.all()
    serializer = InterviewSerializer(interviews, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsInterviewer])
def my_interviews_view(request):
    status_filter = request.query_params.get('status')
    interviews = Interview.objects.filter(interviewer=request.user)
    if status_filter:
        interviews = interviews.filter(status=status_filter)

    serializer = InterviewListSerializer(interviews, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def interview_detail_view(request, pk):
    try:
        interview = Interview.objects.get(pk=pk)
    except Interview.DoesNotExist:
        return Response({'detail': '面试记录不存在'}, status=status.HTTP_404_NOT_FOUND)

    if (
        interview.interviewer != request.user
        and interview.referral.job.created_by != request.user
    ):
        return Response({'detail': '无权查看'}, status=status.HTTP_403_FORBIDDEN)

    serializer = InterviewSerializer(interview)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsInterviewer])
def submit_evaluation_view(request, pk):
    try:
        interview = Interview.objects.get(pk=pk)
    except Interview.DoesNotExist:
        return Response({'detail': '面试记录不存在'}, status=status.HTTP_404_NOT_FOUND)

    if interview.interviewer != request.user:
        return Response(
            {'detail': '只能评价自己负责的面试'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if interview.status == 'completed' and hasattr(interview, 'evaluation'):
        return Response(
            {'detail': '该面试已提交过评价，如需修改请使用更新接口'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = InterviewEvaluationCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    evaluation = serializer.save(
        interview=interview,
        evaluated_by=request.user,
    )

    interview.status = 'completed'
    interview.save()

    referral = interview.referral
    Notification.objects.create(
        user=referral.job.created_by,
        title=f'面试评价已提交',
        content=(
            f'候选人「{referral.candidate_name}」'
            f'（职位：{referral.job.title}）的{interview.get_round_display()}'
            f'面试评价已由 {request.user.username} 提交。\n'
            f'总分：{evaluation.total_score} 分\n'
            f'建议：{evaluation.get_recommendation_display()}'
        ),
        referral=referral,
    )

    return Response(
        InterviewEvaluationSerializer(evaluation).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, IsInterviewer])
def update_evaluation_view(request, pk):
    try:
        interview = Interview.objects.get(pk=pk)
    except Interview.DoesNotExist:
        return Response({'detail': '面试记录不存在'}, status=status.HTTP_404_NOT_FOUND)

    if interview.interviewer != request.user:
        return Response(
            {'detail': '只能修改自己负责的面试评价'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not hasattr(interview, 'evaluation'):
        return Response(
            {'detail': '该面试尚未提交评价，请先提交'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    serializer = InterviewEvaluationCreateSerializer(
        interview.evaluation,
        data=request.data,
        partial=True,
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    evaluation = serializer.save()

    return Response(InterviewEvaluationSerializer(evaluation).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def interview_evaluation_view(request, pk):
    try:
        interview = Interview.objects.get(pk=pk)
    except Interview.DoesNotExist:
        return Response({'detail': '面试记录不存在'}, status=status.HTTP_404_NOT_FOUND)

    if (
        interview.interviewer != request.user
        and interview.referral.job.created_by != request.user
    ):
        return Response({'detail': '无权查看'}, status=status.HTTP_403_FORBIDDEN)

    if not hasattr(interview, 'evaluation'):
        return Response({'detail': '该面试暂无评价'}, status=status.HTTP_404_NOT_FOUND)

    serializer = InterviewEvaluationSerializer(interview.evaluation)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsInterviewer])
def interviewer_dashboard_view(request):
    interviews = Interview.objects.filter(interviewer=request.user)
    total = interviews.count()
    pending = interviews.filter(status='pending').count()
    completed = interviews.filter(status='completed').count()

    return Response({
        'total_interviews': total,
        'pending_interviews': pending,
        'completed_interviews': completed,
    })
