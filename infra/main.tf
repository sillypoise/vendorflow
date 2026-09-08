terraform {
  required_version = "~> 1.11.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "= 5.24.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "= 1.11.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "= 3.7.2"
    }
  }

  encryption {
    key_provider "pbkdf2" "state" {
      passphrase = var.state_passphrase
    }
    method "aes_gcm" "state" {
      keys = key_provider.pbkdf2.state
    }
    state {
      method   = method.aes_gcm.state
      enforced = true
    }
    plan {
      method   = method.aes_gcm.state
      enforced = true
    }
  }
}

variable "state_passphrase" {
  description = "Operator-owned recovery secret, supplied only through TF_VAR_state_passphrase."
  type        = string
  sensitive   = true
  ephemeral   = true
  validation {
    condition     = length(var.state_passphrase) >= 32
    error_message = "The state passphrase must contain at least 32 characters."
  }
}

# Tokens are read by providers directly from their supported environment variables.
provider "cloudflare" {}
provider "supabase" {}
provider "random" {}

locals {
  cloudflare_account_id = "176e1961f8f5e3f986bbe13a009cfcd4"
  supabase_organization = "gglmxswgrsmlllxdayln"
}

resource "cloudflare_pages_project" "vendorflow" {
  account_id        = local.cloudflare_account_id
  name              = "vendorflow-demo"
  production_branch = "main"
  # No Git integration: deployment is explicit and cannot precede release checks.
}

resource "cloudflare_turnstile_widget" "vendorflow" {
  account_id      = local.cloudflare_account_id
  name            = "VendorFlow private demo signup"
  domains         = [cloudflare_pages_project.vendorflow.subdomain]
  mode            = "managed"
  clearance_level = "no_clearance"
  region          = "world"
  bot_fight_mode  = false
  ephemeral_id    = false
  offlabel        = false
}

resource "random_password" "database" {
  length  = 48
  special = false
}

resource "supabase_project" "vendorflow" {
  organization_id   = local.supabase_organization
  name              = "VendorFlow"
  region            = "us-east-1"
  database_password = random_password.database.result
  # Omit instance_size: specifying micro would request paid compute rather than Free defaults.
  lifecycle {
    prevent_destroy = true
  }
}

resource "supabase_settings" "vendorflow" {
  project_ref     = supabase_project.vendorflow.id
  ssl_enforcement = true
  api = jsonencode({
    db_schema            = "public"
    db_extra_search_path = "public,extensions"
    max_rows             = 100
  })
  auth = jsonencode({
    site_url                         = "https://${cloudflare_pages_project.vendorflow.subdomain}"
    uri_allow_list                   = ""
    disable_signup                   = false
    external_anonymous_users_enabled = true
    external_email_enabled           = false
    external_phone_enabled           = false
    security_captcha_enabled         = true
    security_captcha_provider        = "turnstile"
    security_captcha_secret          = cloudflare_turnstile_widget.vendorflow.secret
    rate_limit_anonymous_users       = 5
    rate_limit_token_refresh         = 30
    jwt_exp                          = 3600
  })
}

output "project_reference" {
  value = supabase_project.vendorflow.id
}
output "frontend_url" {
  value = "https://${cloudflare_pages_project.vendorflow.subdomain}"
}
output "turnstile_site_key" {
  value = cloudflare_turnstile_widget.vendorflow.sitekey
}
