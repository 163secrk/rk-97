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
        ('first_interview', '初试'),
        ('second_interview', '复试'),
        ('accepted', '已通过'),
        ('rejected', '已淘汰'),
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
    status = models.CharField('状态', max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField('提交时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '内推'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.referrer.username} -> {self.candidate_name}({self.job.title})'

    def get_status_step(self):
        status_order = ['pending', 'first_interview', 'second_interview', 'accepted', 'rejected']
        try:
            return status_order.index(self.status)
        except ValueError:
            return 0

    def update_status(self, new_status, feedback, rating, updated_by):
        if not feedback or not feedback.strip():
            raise ValueError('反馈简报不能为空')
        if rating < 1 or rating > 5:
            raise ValueError('评分必须在 1-5 星之间')

        old_status = self.status
        self.status = new_status
        self.save()

        progress = CandidateProgress.objects.create(
            referral=self,
            status=new_status,
            feedback=feedback.strip(),
            rating=rating,
            updated_by=updated_by,
        )

        old_status_display = dict(self.STATUS_CHOICES)[old_status]
        new_status_display = self.get_status_display()
        Notification.objects.create(
            user=self.referrer,
            title=f'候选人「{self.candidate_name}」状态更新',
            content=(
                f'您推荐的候选人「{self.candidate_name}」（职位：{self.job.title}）'
                f'状态已从「{old_status_display}」更新为「{new_status_display}」。\n'
                f'HR反馈：{feedback.strip()}\n'
                f'评分：{rating} 星'
            ),
            referral=self,
        )

        return progress


class CandidateProgress(models.Model):
    STATUS_CHOICES = Referral.STATUS_CHOICES
    RATING_CHOICES = [(i, f'{i} 星') for i in range(1, 6)]

    referral = models.ForeignKey(
        Referral,
        on_delete=models.CASCADE,
        related_name='progresses',
        verbose_name='内推记录',
    )
    status = models.CharField('阶段状态', max_length=20, choices=STATUS_CHOICES)
    feedback = models.TextField('反馈简报')
    rating = models.PositiveSmallIntegerField('评分', choices=RATING_CHOICES)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='progress_updates',
        verbose_name='操作人',
    )
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        verbose_name = '候选人进度'
        verbose_name_plural = verbose_name
        ordering = ['created_at']

    def __str__(self):
        return f'{self.referral.candidate_name} - {self.get_status_display()}'


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='接收用户',
    )
    title = models.CharField('标题', max_length=200)
    content = models.TextField('内容')
    referral = models.ForeignKey(
        Referral,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='关联内推',
        null=True,
        blank=True,
    )
    is_read = models.BooleanField('已读', default=False)
    created_at = models.DateTimeField('创建时间', auto_now_add=True)

    class Meta:
        verbose_name = '通知'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} - {self.title}'


class Interview(models.Model):
    STATUS_CHOICES = [
        ('pending', '待面试'),
        ('completed', '已完成'),
        ('cancelled', '已取消'),
    ]
    ROUND_CHOICES = [
        ('first', '初试'),
        ('second', '复试'),
        ('third', '终试'),
    ]
    referral = models.ForeignKey(
        Referral,
        on_delete=models.CASCADE,
        related_name='interviews',
        verbose_name='内推记录',
    )
    interviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='interviews',
        verbose_name='面试官',
    )
    round = models.CharField('面试轮次', max_length=20, choices=ROUND_CHOICES, default='first')
    scheduled_at = models.DateTimeField('面试时间', null=True, blank=True)
    status = models.CharField('状态', max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField('备注', blank=True, default='')
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '面试'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.referral.candidate_name} - {self.get_round_display()} - {self.interviewer.username}'


class InterviewEvaluation(models.Model):
    RECOMMENDATION_CHOICES = [
        ('pass', '推荐进入下一轮'),
        ('fail', '不推荐'),
        ('hold', '待定'),
    ]
    interview = models.OneToOneField(
        Interview,
        on_delete=models.CASCADE,
        related_name='evaluation',
        verbose_name='面试',
    )
    technical_score = models.PositiveSmallIntegerField('技术能力', default=0, help_text='1-10分')
    communication_score = models.PositiveSmallIntegerField('沟通能力', default=0, help_text='1-10分')
    teamwork_score = models.PositiveSmallIntegerField('团队协作', default=0, help_text='1-10分')
    problem_solving_score = models.PositiveSmallIntegerField('问题解决能力', default=0, help_text='1-10分')
    cultural_fit_score = models.PositiveSmallIntegerField('文化适配', default=0, help_text='1-10分')
    learning_ability_score = models.PositiveSmallIntegerField('学习能力', default=0, help_text='1-10分')
    overall_comment = models.TextField('综合评价', blank=True, default='')
    strengths = models.TextField('优点', blank=True, default='')
    weaknesses = models.TextField('待改进点', blank=True, default='')
    total_score = models.DecimalField('总分', max_digits=5, decimal_places=2, default=0)
    recommendation = models.CharField(
        '建议',
        max_length=20,
        choices=RECOMMENDATION_CHOICES,
        blank=True,
        default='',
    )
    evaluated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='evaluations',
        verbose_name='评价人',
    )
    created_at = models.DateTimeField('提交时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)

    class Meta:
        verbose_name = '面试评价'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.interview.referral.candidate_name} - 评价'

    def calculate_total_score(self):
        scores = [
            self.technical_score,
            self.communication_score,
            self.teamwork_score,
            self.problem_solving_score,
            self.cultural_fit_score,
            self.learning_ability_score,
        ]
        valid_scores = [s for s in scores if 1 <= s <= 10]
        if not valid_scores:
            return 0
        return round(sum(valid_scores) / len(valid_scores), 2)

    def generate_recommendation(self):
        total = self.calculate_total_score()
        if total >= 8:
            return 'pass'
        elif total >= 6:
            return 'hold'
        else:
            return 'fail'

    def save(self, *args, **kwargs):
        self.total_score = self.calculate_total_score()
        if not self.recommendation:
            self.recommendation = self.generate_recommendation()
        super().save(*args, **kwargs)

