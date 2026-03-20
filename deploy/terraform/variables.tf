variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "domain" {
  description = "Domain for the plugin server (e.g., context.yourdomain.com)"
  type        = string
}

variable "extension_token" {
  description = "Token for browser extension authentication"
  type        = string
  sensitive   = true
  default     = "" # Auto-generated if empty
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "volume_size" {
  description = "EBS volume size in GB"
  type        = number
  default     = 30
}

variable "ssh_allowed_cidrs" {
  description = "CIDRs allowed to SSH (restrict to your IP)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "github_repo" {
  description = "GitHub repo to clone on EC2"
  type        = string
  default     = "YOUR_USERNAME/openclaw-extension"
}

variable "project_name" {
  description = "Project name used for tagging and naming"
  type        = string
  default     = "openclaw-extension"
}
