output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.plugin.id
}

output "ssm_command" {
  description = "Connect via SSM Session Manager (no SSH needed)"
  value       = "aws ssm start-session --target ${aws_instance.plugin.id} --region ${var.region}"
}

output "public_ip" {
  description = "Elastic IP address"
  value       = aws_eip.plugin.public_ip
}

output "domain" {
  description = "Domain name"
  value       = var.domain
}

output "extension_token" {
  description = "Token for browser extension (use in extension popup)"
  value       = local.extension_token
  sensitive   = true
}

output "ssh_command" {
  description = "SSH command to connect"
  value       = "ssh -i ${path.module}/${var.project_name}-key.pem ubuntu@${aws_eip.plugin.public_ip}"
}

output "setup_log_command" {
  description = "Command to watch bootstrap progress"
  value       = "ssh -i ${path.module}/${var.project_name}-key.pem ubuntu@${aws_eip.plugin.public_ip} 'tail -f /var/log/openclaw-setup.log'"
}

output "ssl_command" {
  description = "Run this after DNS propagates"
  value       = "ssh -i ${path.module}/${var.project_name}-key.pem ubuntu@${aws_eip.plugin.public_ip} 'sudo certbot --nginx -d ${var.domain}'"
}

output "dashboard_url" {
  description = "Plugin dashboard URL (HTTP until SSL is set up)"
  value       = "http://${var.domain}/"
}

output "websocket_url" {
  description = "WebSocket URL for extension (use wss:// after SSL)"
  value       = "wss://${var.domain}/ws/extension"
}

output "dns_instructions" {
  description = "DNS setup instructions"
  value       = "Create A record: ${var.domain} → ${aws_eip.plugin.public_ip}"
}
