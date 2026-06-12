from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('hr', 'HR'),
        ('employee', '员工'),
    ]
    role = models.CharField('角色', max_length=10, choices=ROLE_CHOICES, default='employee')
    department = models.CharField('部门', max_length=100, blank=True, default='')
    phone = models.CharField('手机号', max_length=20, blank=True, default='')
    avatar = models.ImageField('头像', upload_to='avatars/', blank=True, null=True)

    class Meta:
        verbose_name = '用户'
        verbose_name_plural = verbose_name

    def __str__(self):
        return f'{self.username}({self.get_role_display()})'
