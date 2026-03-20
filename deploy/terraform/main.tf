terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
    }
  }
}

# ============================================================================
# Random tokens (generated if not provided)
# ============================================================================

resource "random_password" "extension_token" {
  count   = var.extension_token == "" ? 1 : 0
  length  = 48
  special = false
}

resource "random_password" "gateway_token" {
  length  = 48
  special = false
}

locals {
  extension_token = var.extension_token != "" ? var.extension_token : random_password.extension_token[0].result
  gateway_token   = random_password.gateway_token.result
}

# ============================================================================
# SSM Parameter Store — all secrets
# ============================================================================

resource "aws_ssm_parameter" "anthropic_api_key" {
  name        = "/${var.project_name}/anthropic-api-key"
  description = "Anthropic API key for OpenClaw LLM calls"
  type        = "SecureString"
  value       = var.anthropic_api_key

  tags = { Secret = "true" }
}

resource "aws_ssm_parameter" "extension_token" {
  name        = "/${var.project_name}/extension-token"
  description = "Token for browser extension WebSocket authentication"
  type        = "SecureString"
  value       = local.extension_token

  tags = { Secret = "true" }
}

resource "aws_ssm_parameter" "gateway_token" {
  name        = "/${var.project_name}/gateway-token"
  description = "OpenClaw Gateway internal auth token"
  type        = "SecureString"
  value       = local.gateway_token

  tags = { Secret = "true" }
}

resource "aws_ssm_parameter" "domain" {
  name        = "/${var.project_name}/domain"
  description = "Domain name for the plugin server"
  type        = "String"
  value       = var.domain
}

# ============================================================================
# Networking — Security Group
# ============================================================================

data "aws_vpc" "default" {
  default = true
}

resource "aws_security_group" "plugin" {
  name        = "${var.project_name}-sg"
  description = "OpenClaw Extension Plugin Server"
  vpc_id      = data.aws_vpc.default.id

  # SSH
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_allowed_cidrs
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ============================================================================
# IAM — EC2 role for SSM access
# ============================================================================

resource "aws_iam_role" "ec2" {
  name = "${var.project_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "ssm_read" {
  name = "${var.project_name}-ssm-read"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ]
      Resource = "arn:aws:ssm:${var.region}:*:parameter/${var.project_name}/*"
    }]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ============================================================================
# SSH Key Pair
# ============================================================================

resource "tls_private_key" "ssh" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "ssh" {
  key_name   = "${var.project_name}-key"
  public_key = tls_private_key.ssh.public_key_openssh
}

resource "local_file" "ssh_key" {
  content         = tls_private_key.ssh.private_key_pem
  filename        = "${path.module}/${var.project_name}-key.pem"
  file_permission = "0400"
}

# ============================================================================
# EC2 Instance
# ============================================================================

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "plugin" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.ssh.key_name
  vpc_security_group_ids = [aws_security_group.plugin.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  root_block_device {
    volume_size = var.volume_size
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/userdata.sh.tpl", {
    project_name = var.project_name
    github_repo  = var.github_repo
    domain       = var.domain
  })

  tags = {
    Name = var.project_name
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# Elastic IP
# ============================================================================

resource "aws_eip" "plugin" {
  instance = aws_instance.plugin.id
  domain   = "vpc"
}
