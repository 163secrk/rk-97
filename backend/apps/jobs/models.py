from django.db import models
from django.conf import settings


class Job(models.Model):
    STATUS_CHOICES = [
        ('open', '招聘中'),
        ('closed', '已关闭'),
    ]
    title = models.CharField('职位名称', max_length=200)
    department = models.CharField('所属部门', max_length=100)
    location = models.CharField('工作地点', max_length=200, blank=True, default='')
    salary_range = models.CharField('薪资范围', max_length=100, blank=True, default='')
    description = models.TextField('职位描述')
    requirements = models.TextField('任职要求', blank=True, default='')
    status = models.CharField('状态', max_length=10, choices=STATUS_CHOICES, default='open')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_jobs',
        verbose_name='发布人',
    )
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '职位'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Referral(models.Model):
    STATUS_CHOICES = [
        ('pending', '待审核'),
        ('reviewing', '审核中'),
        ('accepted', '已通过'),
        ('rejected', '已拒绝'),
    ]
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name='referrals',
        verbose_name='职位',
    )
    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='referrals',
        verbose_name='推荐人',
    )
    candidate_name = models.CharField('候选人姓名', max_length=100)
    candidate_email = models.EmailField('候选人邮箱')
    candidate_phone = models.CharField('候选人电话', max_length=20, blank=True, default='')
    resume = models.FileField('简历', upload_to='resumes/')
    cover_letter = models.TextField('推荐语', blank=True, default='')
    status = models.CharField('状态', max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField('提交时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '内推'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.referrer.username} -> {self.candidate_name}({self.job.title})'
