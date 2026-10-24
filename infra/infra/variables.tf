variable "region" {
  default = "us-east-2"
}
variable "project" {
  default = "fleetstream"
}

variable "db_password" {
  type      = string
  sensitive = true
}
variable "acm_cert_arn" {
  type    = string
  default = "arn:aws:acm:us-east-2:061166140701:certificate/73179d04-7173-4a70-877f-f0ae63ab6ff2"
}