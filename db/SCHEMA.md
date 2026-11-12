# Schema inventory

Generated from the SQL files in `supabase-setup/` and `db/migrations/`. Update this file whenever a table, column or index changes.

Total tables: **58**.

| Table | File | Columns | Indexes | RLS |
| --- | --- | --- | --- | --- |
| `app_users` | `db/migrations/001-core.sql` | id, email, full_name, created_at | 0 | no |
| `backup_runs` | `supabase-setup/11-backup-patch.sql` | id, user_id, kind, format, status, size_bytes, row_count, error_message, started_at, finished_at | 1 | yes |
| `backups` | `supabase-setup/11-backup-patch.sql` | id, user_id, label, kind, format, size_bytes, row_count, storage_kind, storage_path, payload, metadata, source, created_at | 3 | yes |
| `billing_webhook_events` | `supabase-setup/18-billing-idempotency.sql` | id, provider, event_id, event_type, processed_at | 0 | yes |
| `companies` | `supabase-setup/10-operations-module.sql` | id, owner_id, name, slug, type, address, phone, website, logo_url, created_at | 1 | yes |
| `contact_submissions` | `db/migrations/004-marketing-forms.sql` | id, kind, first_name, last_name, email, company, topic, message, reference, created_at | 2 | no |
| `contacts` | `supabase-setup/10-operations-module.sql` | id, user_id, name, role, email, phone, company, notes, properties, tags, last_contact_at, created_at, updated_at | 3 | yes |
| `customer_request_votes` | `db/migrations/004-marketing-forms.sql` | id, slug, voter_hash, created_at | 0 | no |
| `customer_requests` | `db/migrations/004-marketing-forms.sql` | id, slug, title, body, email, reference, votes, created_at, updated_at | 1 | no |
| `damages` | `supabase-setup/10-operations-module.sql` | id, user_id, property_id, tenant_id, maintenance_id, title, description, location, severity, status, cost, estimated_cost, photos, inspection_id, reported_at, resolved_at, created_at, updated_at | 4 | yes |
| `documents` | `db/migrations/001-core.sql` | id, user_id, name, type, file_url, file_size, mime_type, property_id, tenant_id, category, notes, expiry_date, reminder_days_before, created_at, updated_at | 5 | yes |
| `documents` | `supabase-setup/01-create-tables.sql` | id, user_id, property_id, tenant_id, name, type, file_url, file_size, mime_type, notes, created_at | 5 | yes |
| `esign_events` | `supabase-setup/23-esignature.sql` | id, request_id, event, name, email, ip, user_agent, created_at | 1 | yes |
| `esign_requests` | `supabase-setup/23-esignature.sql` | id, user_id, tenant_id, template_id, fields, status, token_hash, expires_at, signer_name, signer_email, signer_ip, signer_agent, document_hash, signed_docx, viewed_at, signed_at, voided_at, created_at | 2 | yes |
| `expenses` | `db/migrations/001-core.sql` | id, user_id, property_id, category, amount, description, expense_date, receipt_url, vendor, is_recurring, recurring_frequency, next_occurrence, parent_recurring_id, notes, created_at, updated_at | 9 | yes |
| `expenses` | `supabase-setup/01-create-tables.sql` | id, user_id, property_id, category, amount, description, expense_date, vendor, is_recurring, recurring_frequency, receipt_url, notes, created_at | 9 | yes |
| `late_fee_charges` | `supabase-setup/24-late-fees.sql` | id, user_id, tenant_id, payment_id, amount, waived, applied_at | 1 | yes |
| `late_fee_policies` | `supabase-setup/24-late-fees.sql` | user_id, enabled, grace_days, fee_type, amount, percent, cap, created_at, updated_at | 0 | yes |
| `maintenance_requests` | `db/migrations/001-core.sql` | id, user_id, property_id, tenant_id, title, description, category, priority, status, contractor_name, contractor_phone, estimated_cost, actual_cost, scheduled_date, completed_date, notes, created_at, updated_at | 5 | yes |
| `maintenance_requests` | `supabase-setup/01-create-tables.sql` | id, user_id, property_id, tenant_id, title, description, category, priority, status, contractor_name, contractor_phone, estimated_cost, actual_cost, scheduled_date, completed_date, notes, created_at, updated_at | 5 | yes |
| `managed_landlords` | `supabase-setup/10-operations-module.sql` | id, company_id, user_id, name, slug, units, contact_email, contact_phone, manager, revenue_share, notes, status, onboarded_at | 2 | yes |
| `mpesa_transactions` | `db/migrations/002-support.sql` | id, user_id, tenant_id, payment_id, phone, amount, merchant_request_id, checkout_request_id, status, result_code, result_desc, mpesa_receipt, transaction_date, raw_response, raw_callback, created_at, completed_at | 9 | yes |
| `mpesa_transactions` | `supabase-setup/09-mpesa.sql` | id, user_id, tenant_id, payment_id, phone, amount, merchant_request_id, checkout_request_id, status, result_code, result_desc, mpesa_receipt, transaction_date, raw_response, raw_callback, created_at, completed_at | 9 | yes |
| `newsletter_subscribers` | `db/migrations/004-marketing-forms.sql` | id, email, source, referrer, user_agent, created_at | 0 | no |
| `notes` | `db/migrations/001-core.sql` | id, user_id, title, content, category, property_id, tenant_id, priority, is_pinned, created_at, updated_at | 4 | yes |
| `notes` | `supabase-setup/01-create-tables.sql` | id, user_id, property_id, tenant_id, title, content, category, priority, is_pinned, created_at, updated_at | 4 | yes |
| `notifications` | `db/migrations/002-support.sql` | id, user_id, type, title, message, severity, link, is_read, metadata, created_at | 4 | yes |
| `notifications` | `supabase-setup/03-notifications.sql` | id, user_id, type, title, message, severity, link, is_read, metadata, created_at | 4 | yes |
| `patches` | `supabase-setup/11-backup-patch.sql` | id, applied_at, description, kind, sql, reversible, rollback_sql, applied_by, metadata | 1 | yes |
| `paybill_properties` | `supabase-setup/19-paybill-property-linkage.sql` | paybill_id, property_id, user_id, created_at | 1 | yes |
| `paybills` | `supabase-setup/10-operations-module.sql` | id, user_id, company_id, label, number, type, c2b_validation_url, c2b_confirmation_url, active, matched_count, unmatched_count, last_payment_at, created_at, updated_at | 3 | yes |
| `payment_test_attempts` | `supabase-setup/16-payment-reconciliation-hardening.sql` | id, user_id, paybill_id, amount, phone, provider_reference, status, error_code, created_at, updated_at | 1 | yes |
| `plans` | `supabase-setup/14-subscriptions.sql` | code, name, description, price_kes, max_properties, max_tenants, max_team_members, features, active, sort_order, created_at | 0 | yes |
| `properties` | `db/migrations/001-core.sql` | id, user_id, name, address, city, county, type, bedrooms, bathrooms, rent_amount, monthly_rent, deposit_amount, size_sqft, square_feet, status, description, amenities, created_at, updated_at | 6 | yes |
| `properties` | `supabase-setup/01-create-tables.sql` | id, user_id, name, address, city, county, type, bedrooms, bathrooms, rent_amount, monthly_rent, deposit_amount, size_sqft, status, description, amenities, created_at, updated_at | 6 | yes |
| `property_photos` | `db/migrations/002-support.sql` | id, user_id, property_id, file_url, caption, display_order, is_cover, uploaded_at | 5 | yes |
| `property_photos` | `supabase-setup/04-property-photos.sql` | id, user_id, property_id, file_url, caption, display_order, is_cover, uploaded_at | 5 | yes |
| `quotations` | `supabase-setup/10-operations-module.sql` | id, user_id, property_id, maintenance_id, contact_id, title, description, status, amount, notes, requested_at, responded_at, approved_at, expires_at, created_at, updated_at | 3 | yes |
| `reconciliation_audit` | `supabase-setup/10-operations-module.sql` | id, user_id, c2b_transaction_id, rule_id, decision, matched_tenant_id, matched_payment_id, confidence, notes, decided_at | 2 | yes |
| `reconciliation_rules` | `supabase-setup/10-operations-module.sql` | id, user_id, paybill_id, name, match_by, priority, active, config, created_at, updated_at | 2 | yes |
| `rent_payments` | `db/migrations/001-core.sql` | id, user_id, tenant_id, property_id, amount, due_date, paid_date, payment_method, status, late_fee, reference_number, notes, created_at, updated_at | 7 | yes |
| `rent_payments` | `supabase-setup/01-create-tables.sql` | id, user_id, tenant_id, property_id, amount, due_date, paid_date, payment_date, payment_method, status, late_fee, reference_number, notes, created_at | 7 | yes |
| `restore_runs` | `supabase-setup/11-backup-patch.sql` | id, user_id, backup_id, status, before_counts, after_counts, tables_restored, error_message, started_at, finished_at | 1 | yes |
| `sms_messages` | `supabase-setup/25-sms-reminders.sql` | id, user_id, tenant_id, phone, body, status, provider, provider_ref, error, created_at, sent_at | 2 | yes |
| `sms_settings` | `supabase-setup/25-sms-reminders.sql` | user_id, enabled, days_before, sender_id, updated_at | 0 | yes |
| `subscription_events` | `supabase-setup/14-subscriptions.sql` | id, user_id, event, from_plan, to_plan, from_status, to_status, days_granted, reason, actor, metadata, created_at | 1 | yes |
| `subscription_payments` | `supabase-setup/15-subscription-payments.sql` | id, user_id, plan_code, amount, phone, checkout_request_id, merchant_request_id, stripe_session_id, stripe_payment_intent_id, status, result_code, result_desc, mpesa_receipt, created_at, completed_at | 3 | yes |
| `subscriptions` | `supabase-setup/14-subscriptions.sql` | id, user_id, plan_code, status, trial_ends_at, current_period_start, current_period_end, cancel_at, canceled_at, last_payment_id, last_payment_method, notes, properties_count, tenants_count, created_at, updated_at | 4 | yes |
| `support_tickets` | `db/migrations/004-marketing-forms.sql` | id, user_id, reference, subject, category, priority, message, status, created_at, updated_at | 1 | no |
| `system_version` | `supabase-setup/11-backup-patch.sql` | id, schema_version, last_patch_id, installed_at | 0 | yes |
| `team_members` | `supabase-setup/10-operations-module.sql` | id, company_id, user_id, name, email, role, invited_at, accepted_at | 1 | yes |
| `tenant_portal_tokens` | `supabase-setup/22-tenant-portal.sql` | id, user_id, tenant_id, token_hash, expires_at, revoked_at, last_used_at, created_at | 2 | yes |
| `tenant_users` | `db/migrations/002-support.sql` | id, user_id, tenant_id, invited_by, invited_at, accepted_at | 4 | yes |
| `tenant_users` | `supabase-setup/08-tenant-portal.sql` | id, user_id, tenant_id, invited_by, invited_at, accepted_at | 4 | yes |
| `tenants` | `db/migrations/001-core.sql` | id, user_id, full_name, first_name, last_name, email, phone, national_id, property_id, lease_start_date, lease_end_date, monthly_rent, deposit_amount, status, notes, created_at, updated_at | 7 | yes |
| `tenants` | `supabase-setup/01-create-tables.sql` | id, user_id, property_id, full_name, first_name, last_name, email, phone, national_id, emergency_contact_name, emergency_contact_phone, lease_start_date, lease_end_date, monthly_rent, deposit_amount, status, notes, created_at, updated_at | 7 | yes |
| `user_profiles` | `db/migrations/001-core.sql` | user_id, full_name, first_name, last_name, company_name, phone, address, city, county, timezone, currency, date_format, avatar_url, notification_preferences, created_at, updated_at | 3 | yes |
| `user_profiles` | `supabase-setup/00-signup-bootstrap.sql` | id, user_id, full_name, first_name, last_name, company_name, phone, address, city, county, timezone, currency, date_format, notification_preferences, created_at, updated_at | 3 | yes |
