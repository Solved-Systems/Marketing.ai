-- MRKTCMD Billing System Database Schema
-- Run this migration in your Supabase SQL Editor

-- ============================================
-- 1. USERS TABLE (synced from NextAuth)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  github_id TEXT UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- ============================================
-- 2. PRICING PLANS TABLE (reference data)
-- ============================================
CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_monthly INTEGER NOT NULL, -- in cents
  price_yearly INTEGER NOT NULL,  -- in cents
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  monthly_credits INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES pricing_plans(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete', 'trialing')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- One active subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_active
ON subscriptions(user_id)
WHERE status IN ('active', 'trialing');

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);

-- ============================================
-- 4. CREDIT BALANCES TABLE (per billing period)
-- ============================================
CREATE TABLE IF NOT EXISTS credit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for finding current period balance
CREATE INDEX IF NOT EXISTS idx_credit_balances_user_period
ON credit_balances(user_id, period_start, period_end);

-- ============================================
-- 5. CREDIT USAGE LOG TABLE
-- ============================================
CREATE TYPE generation_type AS ENUM (
  'text_post',
  'image_default',
  'image_standard',
  'image_premium',
  'video_default',
  'video_premium'
);

CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credits_consumed INTEGER NOT NULL,
  action_type generation_type NOT NULL,
  model_used TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_usage_user_created
ON credit_usage(user_id, created_at DESC);

-- ============================================
-- 6. STRIPE WEBHOOK EVENTS (idempotency)
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY, -- Stripe event ID
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clean up old events after 30 days
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed
ON stripe_webhook_events(processed_at);

-- ============================================
-- 7. SEED PRICING PLANS
-- ============================================
INSERT INTO pricing_plans (name, slug, price_monthly, price_yearly, monthly_credits, features) VALUES
(
  'Starter',
  'starter',
  2900,  -- $29/mo
  30000, -- $300/yr ($25/mo)
  200,
  '["200 AI credits/month", "All generation types", "Basic support", "1 brand"]'::jsonb
),
(
  'Pro',
  'pro',
  7900,  -- $79/mo
  80400, -- $804/yr ($67/mo)
  600,
  '["600 AI credits/month", "All generation types", "Priority support", "5 brands", "Team collaboration"]'::jsonb
),
(
  'Business',
  'business',
  19900,  -- $199/mo
  202800, -- $2,028/yr ($169/mo)
  2000,
  '["2,000 AI credits/month", "All generation types", "Dedicated support", "Unlimited brands", "Advanced analytics", "API access"]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  monthly_credits = EXCLUDED.monthly_credits,
  features = EXCLUDED.features;

-- ============================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Users: can read own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Subscriptions: can read own subscriptions
CREATE POLICY "Users can read own subscriptions" ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- Credit balances: can read own balances
CREATE POLICY "Users can read own credit balances" ON credit_balances
  FOR SELECT USING (user_id = auth.uid());

-- Credit usage: can read own usage
CREATE POLICY "Users can read own credit usage" ON credit_usage
  FOR SELECT USING (user_id = auth.uid());

-- Pricing plans: anyone can read
CREATE POLICY "Anyone can read pricing plans" ON pricing_plans
  FOR SELECT USING (true);

-- Service role bypass for all tables (for webhooks and server operations)
CREATE POLICY "Service role full access users" ON users
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access subscriptions" ON subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access credit_balances" ON credit_balances
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access credit_usage" ON credit_usage
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access stripe_webhook_events" ON stripe_webhook_events
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to get user's current credit balance
CREATE OR REPLACE FUNCTION get_current_credits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  SELECT credits_remaining INTO v_credits
  FROM credit_balances
  WHERE user_id = p_user_id
    AND NOW() BETWEEN period_start AND period_end
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_credits, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_action_type generation_type,
  p_model_used TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance_id UUID;
  v_current_credits INTEGER;
BEGIN
  -- Get current balance
  SELECT id, credits_remaining INTO v_balance_id, v_current_credits
  FROM credit_balances
  WHERE user_id = p_user_id
    AND NOW() BETWEEN period_start AND period_end
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  -- Check if enough credits
  IF v_current_credits IS NULL OR v_current_credits < p_credits THEN
    RETURN FALSE;
  END IF;

  -- Deduct credits
  UPDATE credit_balances
  SET
    credits_remaining = credits_remaining - p_credits,
    credits_used = credits_used + p_credits,
    updated_at = NOW()
  WHERE id = v_balance_id;

  -- Log usage
  INSERT INTO credit_usage (user_id, credits_consumed, action_type, model_used, metadata)
  VALUES (p_user_id, p_credits, p_action_type, p_model_used, p_metadata);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize credits for a new period
CREATE OR REPLACE FUNCTION initialize_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_period_start TIMESTAMP WITH TIME ZONE,
  p_period_end TIMESTAMP WITH TIME ZONE
)
RETURNS UUID AS $$
DECLARE
  v_balance_id UUID;
BEGIN
  INSERT INTO credit_balances (user_id, credits_remaining, credits_used, period_start, period_end)
  VALUES (p_user_id, p_credits, 0, p_period_start, p_period_end)
  RETURNING id INTO v_balance_id;

  RETURN v_balance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_balances_updated_at
  BEFORE UPDATE ON credit_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
