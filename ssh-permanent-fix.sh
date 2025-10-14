#!/bin/bash

echo "========================================="
echo "SSH永久解决方案 - 在VNC控制台执行"
echo "========================================="

# 1. 创建SSH配置备份
echo -e "\n1. 备份当前SSH配置:"
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d)

# 2. 优化SSH配置
echo -e "\n2. 创建优化的SSH配置:"
cat > /etc/ssh/sshd_config.d/99-custom.conf << 'EOF'
# 自定义SSH配置 - 防止被系统更新覆盖
Port 22
PermitRootLogin yes
PasswordAuthentication yes
PubkeyAuthentication yes
ClientAliveInterval 60
ClientAliveCountMax 3
MaxAuthTries 6
MaxSessions 10
TCPKeepAlive yes
UseDNS no
EOF

# 3. 设置自动清理脚本
echo -e "\n3. 创建自动清理脚本（防止磁盘满）:"
cat > /root/auto-cleanup.sh << 'EOF'
#!/bin/bash
# 自动清理脚本 - 防止磁盘空间满

# 清理7天前的日志
find /var/log -name "*.gz" -mtime +7 -delete
find /var/log -name "*.old" -mtime +7 -delete

# 清理journalctl日志（保留100M）
journalctl --vacuum-size=100M

# 清理npm/pnpm缓存
npm cache clean --force 2>/dev/null
pnpm store prune 2>/dev/null

# 清理临时文件
find /tmp -type f -mtime +7 -delete 2>/dev/null

# 检查磁盘使用率，发送警告
USAGE=$(df / | grep / | awk '{print $5}' | sed 's/%//')
if [ $USAGE -gt 80 ]; then
    echo "警告: 磁盘使用率已达 $USAGE%" >> /var/log/disk-warning.log
fi
EOF
chmod +x /root/auto-cleanup.sh

# 4. 添加定时任务
echo -e "\n4. 设置每日自动清理:"
(crontab -l 2>/dev/null; echo "0 3 * * * /root/auto-cleanup.sh") | crontab -

# 5. 配置防火墙永久规则
echo -e "\n5. 配置防火墙规则:"
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-port=22/tcp
    firewall-cmd --reload
elif command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw reload
else
    iptables -A INPUT -p tcp --dport 22 -j ACCEPT
    service iptables save 2>/dev/null
fi

# 6. 配置fail2ban白名单（如果存在）
echo -e "\n6. 配置fail2ban白名单:"
if [ -d /etc/fail2ban ]; then
    cat > /etc/fail2ban/jail.d/ssh-custom.conf << 'EOF'
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/secure
maxretry = 10
bantime = 3600
# 添加你的IP到白名单（替换下面的IP）
ignoreip = 127.0.0.1/8 ::1
EOF
    systemctl restart fail2ban 2>/dev/null
fi

# 7. 创建SSH监控脚本
echo -e "\n7. 创建SSH服务监控脚本:"
cat > /root/monitor-ssh.sh << 'EOF'
#!/bin/bash
# SSH服务监控 - 自动重启失败的SSH

if ! systemctl is-active --quiet sshd; then
    echo "$(date): SSH服务已停止，正在重启..." >> /var/log/ssh-monitor.log
    systemctl restart sshd

    # 如果还是失败，尝试修复
    if ! systemctl is-active --quiet sshd; then
        sshd -t  # 测试配置
        systemctl start sshd
    fi
fi

# 检查22端口是否监听
if ! netstat -tlnp | grep -q ":22 "; then
    echo "$(date): 22端口未监听，重启SSH..." >> /var/log/ssh-monitor.log
    systemctl restart sshd
fi
EOF
chmod +x /root/monitor-ssh.sh

# 8. 添加SSH监控到crontab
echo -e "\n8. 设置SSH服务监控（每5分钟）:"
(crontab -l 2>/dev/null; echo "*/5 * * * * /root/monitor-ssh.sh") | crontab -

# 9. 设置阿里云安全组提醒
echo -e "\n9. 阿里云安全组配置提醒:"
cat << 'EOF'

⚠️ 重要：请在阿里云控制台检查以下设置：

1. ECS安全组规则:
   - 入方向规则添加：
     协议类型: SSH(22)
     端口范围: 22/22
     授权对象: 0.0.0.0/0 (或指定你的IP)

2. DDoS防护设置:
   - 检查DDoS防护是否误封了22端口
   - 在"安全管控"中查看是否有拦截记录

3. 实例设置:
   - 确保实例没有设置"安全加固"导致SSH受限

EOF

# 10. 立即重启SSH服务
echo -e "\n10. 应用配置并重启SSH:"
sshd -t && systemctl restart sshd

echo "========================================="
echo "✅ SSH永久优化配置完成！"
echo "========================================="
echo ""
echo "已完成的优化："
echo "1. ✅ SSH配置已备份并优化"
echo "2. ✅ 自动磁盘清理已设置（每日凌晨3点）"
echo "3. ✅ SSH服务监控已启用（每5分钟检查）"
echo "4. ✅ 防火墙规则已添加"
echo ""
echo "请手动检查："
echo "1. 阿里云安全组规则是否正确"
echo "2. 实例是否有特殊的安全设置"
echo ""
echo "测试SSH是否正常:"
systemctl status sshd | grep Active