-- ============================================================
-- RGB SFA Admin — Seed Data
-- Run AFTER migrations.sql
-- Replace DEFAULT_TENANT_ID if you change it in .env.local
-- ============================================================

DO $$
DECLARE
  tid UUID := '00000000-0000-0000-0000-000000000001';

  -- Levels
  lvl1_id UUID := '30000000-0000-0000-0000-000000000001';
  lvl2_id UUID := '30000000-0000-0000-0000-000000000002';
  lvl3_id UUID := '30000000-0000-0000-0000-000000000003';

  -- Departments
  dept_sales UUID := '10000000-0000-0000-0000-000000000001';

  -- Designations
  desig_rm   UUID := '20000000-0000-0000-0000-000000000001';
  desig_sm   UUID := '20000000-0000-0000-0000-000000000002';
  desig_se   UUID := '20000000-0000-0000-0000-000000000003';

  -- Users
  user_admin  UUID := '40000000-0000-0000-0000-000000000001';
  user_rakesh UUID := '40000000-0000-0000-0000-000000000002';
  user_yogaraj UUID := '40000000-0000-0000-0000-000000000003';
  user_aryan  UUID := '40000000-0000-0000-0000-000000000004';

BEGIN

-- ---- Levels ----
INSERT INTO levels (id, tenant_id, level_no, name) VALUES
  (lvl1_id, tid, 1, 'L1'),
  (lvl2_id, tid, 2, 'L2'),
  (lvl3_id, tid, 3, 'L3')
ON CONFLICT (tenant_id, level_no) DO NOTHING;

-- ---- Departments ----
INSERT INTO departments (id, tenant_id, name) VALUES
  (dept_sales, tid, 'Sales')
ON CONFLICT DO NOTHING;

-- ---- Designations ----
INSERT INTO designations (id, tenant_id, department_id, name) VALUES
  (desig_rm, tid, dept_sales, 'Regional Manager'),
  (desig_sm, tid, dept_sales, 'Sales Manager'),
  (desig_se, tid, dept_sales, 'Sales Executive')
ON CONFLICT DO NOTHING;

-- ---- Users ----
-- Admin (L1, Administrator, no manager)
INSERT INTO users (id, tenant_id, name, email, contact, department_id, designation_id, level_id, profile, manager_user_id, status) VALUES
  (user_admin, tid, 'Admin User', 'admin@demo.com', '9999999999',
   dept_sales, desig_rm, lvl1_id, 'Administrator', NULL, 'Active')
ON CONFLICT (tenant_id, contact) DO NOTHING;

-- Rakesh Jain (L1, Standard, manager = Admin)
INSERT INTO users (id, tenant_id, name, email, contact, department_id, designation_id, level_id, profile, manager_user_id, status) VALUES
  (user_rakesh, tid, 'Rakesh Jain', 'rakesh@rgbindia.com', '9033050100',
   dept_sales, desig_rm, lvl1_id, 'Standard', user_admin, 'Active')
ON CONFLICT (tenant_id, contact) DO NOTHING;

-- Yogaraj (L2, Standard, manager = Rakesh)
INSERT INTO users (id, tenant_id, name, email, contact, department_id, designation_id, level_id, profile, manager_user_id, status) VALUES
  (user_yogaraj, tid, 'Yogaraj', 'yogaraj@rgbindia.com', '9012345678',
   dept_sales, desig_sm, lvl2_id, 'Standard', user_rakesh, 'Active')
ON CONFLICT (tenant_id, contact) DO NOTHING;

-- Aryan (L3, Standard, manager = Yogaraj)
INSERT INTO users (id, tenant_id, name, email, contact, department_id, designation_id, level_id, profile, manager_user_id, status) VALUES
  (user_aryan, tid, 'Aryan', 'aryan@rgbindia.com', '7878038514',
   dept_sales, desig_se, lvl3_id, 'Standard', user_yogaraj, 'Active')
ON CONFLICT (tenant_id, contact) DO NOTHING;

END $$;
