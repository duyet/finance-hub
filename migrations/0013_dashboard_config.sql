-- Migration: 0013_dashboard_config.sql
-- Description: Add dashboard customization config to users table
-- Compatibility: Cloudflare D1 (SQLite)

-- Add dashboard_config column for storing card visibility preferences
ALTER TABLE users ADD COLUMN dashboard_config TEXT DEFAULT '{"showFinancialHealth":true,"showFinancialGoals":true,"showIncomeExpenseChart":true,"showExpenseBreakdownChart":true,"showAIInsights":true,"showQuickActions":true}';
