resource "aws_ecr_repository" "app" {
  name         = "${var.project}-app"
  force_delete = true
}

output "ecr_repo_url" {
  value = aws_ecr_repository.app.repository_url
}