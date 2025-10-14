#!/bin/bash

echo "========================================="
echo "SSH问题诊断脚本 - 请在阿里云VNC控制台执行"
echo "========================================="

echo -e "\n1. 检查磁盘空间（最常见原因）:"
df -h
echo "⚠️ 如果 / 或 /var 使用率超过90%，需要清理空间"

echo -e "\n2. 检查内存使用:"
free -h
echo "⚠️ 如果可用内存过低，需要重启一些服务"

echo -e "\n3. 检查SSH服务状态:"
systemctl status sshd | head -20

echo -e "\n4. 检查SSH端口配置:"
grep -E "^Port|^PermitRootLogin|^PasswordAuthentication" /etc/ssh/sshd_config

echo -e "\n5. 检查防火墙规则:"
iptables -L INPUT -n | grep -E "22|SSH"

echo -e "\n6. 检查fail2ban状态（如果安装了）:"
if command -v fail2ban-client &> /dev/null; then
    fail2ban-client status sshd 2>/dev/null || echo "fail2ban未配置sshd"
else
    echo "fail2ban未安装"
fi

echo -e "\n7. 检查最近的SSH登录尝试:"
tail -20 /var/log/secure 2>/dev/null || tail -20 /var/log/auth.log

echo -e "\n8. 检查监听端口:"
netstat -tlnp | grep :22

echo -e "\n9. 检查系统日志中的错误:"
journalctl -u sshd -n 20 --no-pager

echo -e "\n10. 检查hosts.deny黑名单:"
cat /etc/hosts.deny 2>/dev/null || echo "hosts.deny不存在"

echo -e "\n========================================="
echo "修复建议:"
echo "========================================="

# 磁盘空间问题
echo -e "\n如果是磁盘空间问题:"
echo "  # 清理日志"
echo "  journalctl --vacuum-size=100M"
echo "  rm -rf /var/log/*.gz"
echo "  # 清理npm缓存"
echo "  npm cache clean --force"
echo "  pnpm store prune"
echo "  # 清理Docker（如果有）"
echo "  docker system prune -a"

# SSH服务问题
echo -e "\n如果是SSH服务问题:"
echo "  # 重启SSH服务"
echo "  systemctl restart sshd"
echo "  # 检查配置文件语法"
echo "  sshd -t"

# 防火墙问题
echo -e "\n如果是防火墙问题:"
echo "  # 临时关闭防火墙测试"
echo "  systemctl stop firewalld"
echo "  # 或添加SSH规则"
echo "  firewall-cmd --permanent --add-service=ssh"
echo "  firewall-cmd --reload"

# fail2ban问题
echo -e "\n如果是fail2ban封锁:"
echo "  # 解封IP"
echo "  fail2ban-client set sshd unbanip YOUR_IP"
echo "  # 或重启fail2ban"
echo "  systemctl restart fail2ban"

echo -e "\n========================================="
echo "完成诊断！"