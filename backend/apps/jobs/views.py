from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Job, Referral
from .serializers import (
    JobSerializer, JobListSerializer,
    ReferralSerializer, ReferralCreateSerializer,
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
        serializer.save(referrer=self.request.user)


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

    new_status = request.data.get('status')
    valid_statuses = [s[0] for s in Referral.STATUS_CHOICES]
    if new_status not in valid_statuses:
        return Response({'detail': '无效的状态'}, status=status.HTTP_400_BAD_REQUEST)

    referral.status = new_status
    referral.save()
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
