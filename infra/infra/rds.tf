resource "aws_db_instance" "primary" {
  identifier             = "${var.project}-primary"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t4g.micro"
  allocated_storage      = 20
  storage_encrypted      = true

  db_name                = "fleet"
  username               = "fleetadmin"

  password               = var.db_password

  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false

  backup_retention_period = 1
  multi_az               = false
  skip_final_snapshot    = true
}

resource "aws_db_instance" "replica" {
  identifier             = "${var.project}-replica"
  replicate_source_db    = aws_db_instance.primary.identifier
  instance_class         = "db.t4g.micro"

  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  skip_final_snapshot    = true
  depends_on             = [aws_db_instance.primary]
}

output "db_primary_endpoint" {
  value = aws_db_instance.primary.address
}

output "db_replica_endpoint" {
  value = aws_db_instance.replica.address
}