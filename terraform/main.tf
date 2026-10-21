terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "my_ip_cidr" {
  type = string
}

variable "public_key_path" {
  type    = string
  default = "~/.ssh/library-key.pub"
}

variable "repo_url" {
  type    = string
  default = "https://github.com/yashpanchal24/digital-library-system-devsecops.git"
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

data "aws_vpc" "default" {
  default = true
}

resource "aws_key_pair" "library" {
  key_name   = "library-key"
  public_key = file(pathexpand(var.public_key_path))
}

resource "aws_security_group" "library" {
  name        = "digital-library-sg"
  description = "SSH from my IP, app on 3000"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH from my IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  ingress {
    description = "Digital Library app"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "digital-library-sg" }
}

resource "aws_instance" "library" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = "t3.small"
  key_name               = aws_key_pair.library.key_name
  vpc_security_group_ids = [aws_security_group.library.id]

  metadata_options {
    http_tokens = "required"
  }

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = <<-EOF
    #!/bin/bash
    dnf install -y docker git
    systemctl enable --now docker
    usermod -aG docker ec2-user
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    sudo -u ec2-user git clone ${var.repo_url} /home/ec2-user/app
  EOF

  tags = { Name = "digital-library-server" }
}

output "public_ip" {
  value = aws_instance.library.public_ip
}

output "ssh_command" {
  value = "ssh -i ~/.ssh/library-key ec2-user@${aws_instance.library.public_ip}"
}

output "app_url" {
  value = "http://${aws_instance.library.public_ip}:3000"
}
