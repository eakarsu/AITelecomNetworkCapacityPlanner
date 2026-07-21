const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('Demo seeding requires ALLOW_DEMO_SEED=true outside production.');
}
const demoPassword = String(process.env.DEMO_PASSWORD || '');
if (demoPassword.length < 12) throw new Error('DEMO_PASSWORD must contain at least 12 characters.');

const adminPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

const dbName = process.env.DB_NAME || 'telecom_planner';
if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(dbName)) throw new Error('DB_NAME is invalid.');

async function seed() {
  // Create database if not exists
  try {
    const res = await adminPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (res.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error('Error creating database:', err.message);
  }
  await adminPool.end();

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: dbName,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    // Drop and recreate all tables
    await pool.query(`
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS cell_towers CASCADE;
      DROP TABLE IF EXISTS bandwidth_allocations CASCADE;
      DROP TABLE IF EXISTS rollout_plans CASCADE;
      DROP TABLE IF EXISTS coverage_gaps CASCADE;
      DROP TABLE IF EXISTS demand_forecasts CASCADE;
      DROP TABLE IF EXISTS network_load CASCADE;
      DROP TABLE IF EXISTS spectrum_management CASCADE;
      DROP TABLE IF EXISTS qos_monitoring CASCADE;
      DROP TABLE IF EXISTS infrastructure_costs CASCADE;
      DROP TABLE IF EXISTS signal_interference CASCADE;
      DROP TABLE IF EXISTS network_alarms CASCADE;
      DROP TABLE IF EXISTS subscriber_analytics CASCADE;
      DROP TABLE IF EXISTS fiber_routes CASCADE;
      DROP TABLE IF EXISTS maintenance_schedules CASCADE;
      DROP TABLE IF EXISTS energy_consumption CASCADE;

      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'engineer',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE cell_towers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        tower_type VARCHAR(50) NOT NULL,
        height_meters DECIMAL(6,1) NOT NULL,
        frequency_band VARCHAR(50) NOT NULL,
        max_capacity INTEGER NOT NULL,
        current_load INTEGER DEFAULT 0,
        status VARCHAR(30) DEFAULT 'active',
        region VARCHAR(100) NOT NULL,
        installed_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE bandwidth_allocations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        region VARCHAR(100) NOT NULL,
        allocated_bandwidth_mbps DECIMAL(10,2) NOT NULL,
        used_bandwidth_mbps DECIMAL(10,2) DEFAULT 0,
        priority_level INTEGER DEFAULT 3,
        service_type VARCHAR(50) NOT NULL,
        allocation_date DATE,
        expiry_date DATE,
        status VARCHAR(30) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE rollout_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        region VARCHAR(100) NOT NULL,
        technology VARCHAR(50) NOT NULL,
        phase VARCHAR(50) NOT NULL,
        start_date DATE,
        end_date DATE,
        budget_millions DECIMAL(10,2),
        towers_planned INTEGER DEFAULT 0,
        towers_completed INTEGER DEFAULT 0,
        population_covered INTEGER DEFAULT 0,
        status VARCHAR(30) DEFAULT 'planned',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE coverage_gaps (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        region VARCHAR(100) NOT NULL,
        latitude DECIMAL(10,7) NOT NULL,
        longitude DECIMAL(10,7) NOT NULL,
        radius_km DECIMAL(6,2) NOT NULL,
        affected_population INTEGER DEFAULT 0,
        signal_strength_dbm DECIMAL(6,2),
        gap_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        recommended_solution TEXT,
        status VARCHAR(30) DEFAULT 'identified',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE demand_forecasts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        region VARCHAR(100) NOT NULL,
        forecast_period VARCHAR(50) NOT NULL,
        current_demand_gbps DECIMAL(10,2) NOT NULL,
        predicted_demand_gbps DECIMAL(10,2) NOT NULL,
        growth_rate_percent DECIMAL(5,2),
        confidence_level DECIMAL(5,2),
        data_type VARCHAR(50) NOT NULL,
        peak_hour VARCHAR(20),
        methodology VARCHAR(100),
        status VARCHAR(30) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE network_load (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        node_name VARCHAR(100) NOT NULL,
        region VARCHAR(100) NOT NULL,
        current_load_percent DECIMAL(5,2) NOT NULL,
        max_capacity_gbps DECIMAL(10,2) NOT NULL,
        avg_latency_ms DECIMAL(8,2),
        packet_loss_percent DECIMAL(5,3),
        active_connections INTEGER DEFAULT 0,
        balancing_strategy VARCHAR(50),
        status VARCHAR(30) DEFAULT 'normal',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE spectrum_management (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        frequency_band VARCHAR(50) NOT NULL,
        bandwidth_mhz DECIMAL(8,2) NOT NULL,
        license_holder VARCHAR(100),
        region VARCHAR(100) NOT NULL,
        technology VARCHAR(50) NOT NULL,
        license_start DATE,
        license_end DATE,
        utilization_percent DECIMAL(5,2) DEFAULT 0,
        interference_level VARCHAR(20) DEFAULT 'low',
        status VARCHAR(30) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE qos_monitoring (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        service_name VARCHAR(100) NOT NULL,
        region VARCHAR(100) NOT NULL,
        latency_ms DECIMAL(8,2) NOT NULL,
        jitter_ms DECIMAL(8,2),
        packet_loss_percent DECIMAL(5,3),
        throughput_mbps DECIMAL(10,2),
        availability_percent DECIMAL(5,2),
        sla_target VARCHAR(100),
        violation_count INTEGER DEFAULT 0,
        status VARCHAR(30) DEFAULT 'compliant',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE infrastructure_costs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        region VARCHAR(100) NOT NULL,
        capex_millions DECIMAL(10,2) DEFAULT 0,
        opex_monthly_thousands DECIMAL(10,2) DEFAULT 0,
        roi_percent DECIMAL(6,2),
        payback_period_months INTEGER,
        vendor VARCHAR(100),
        contract_start DATE,
        contract_end DATE,
        status VARCHAR(30) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE signal_interference (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        source_type VARCHAR(50) NOT NULL,
        affected_tower VARCHAR(100),
        region VARCHAR(100) NOT NULL,
        frequency_mhz DECIMAL(10,2) NOT NULL,
        interference_dbm DECIMAL(8,2) NOT NULL,
        affected_area_km2 DECIMAL(8,2),
        affected_users INTEGER DEFAULT 0,
        interference_type VARCHAR(50) NOT NULL,
        mitigation_strategy TEXT,
        severity VARCHAR(20) NOT NULL,
        status VARCHAR(30) DEFAULT 'detected',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE network_alarms (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        alarm_type VARCHAR(50) NOT NULL,
        source_node VARCHAR(100) NOT NULL,
        region VARCHAR(100) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        triggered_at TIMESTAMP DEFAULT NOW(),
        acknowledged_at TIMESTAMP,
        resolved_at TIMESTAMP,
        assigned_to VARCHAR(100),
        root_cause TEXT,
        affected_services TEXT,
        status VARCHAR(30) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE subscriber_analytics (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        region VARCHAR(100) NOT NULL,
        plan_type VARCHAR(50) NOT NULL,
        total_subscribers INTEGER NOT NULL,
        active_subscribers INTEGER DEFAULT 0,
        churn_rate_percent DECIMAL(5,2) DEFAULT 0,
        avg_revenue_per_user DECIMAL(8,2),
        data_usage_avg_gb DECIMAL(8,2),
        satisfaction_score DECIMAL(3,1),
        support_tickets INTEGER DEFAULT 0,
        measurement_period VARCHAR(50),
        status VARCHAR(30) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE fiber_routes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        route_type VARCHAR(50) NOT NULL,
        start_location VARCHAR(100) NOT NULL,
        end_location VARCHAR(100) NOT NULL,
        region VARCHAR(100) NOT NULL,
        length_km DECIMAL(8,2) NOT NULL,
        fiber_count INTEGER NOT NULL,
        capacity_tbps DECIMAL(8,2),
        current_utilization_percent DECIMAL(5,2) DEFAULT 0,
        installation_date DATE,
        vendor VARCHAR(100),
        redundancy_type VARCHAR(50),
        status VARCHAR(30) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE maintenance_schedules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        maintenance_type VARCHAR(50) NOT NULL,
        target_asset VARCHAR(100) NOT NULL,
        region VARCHAR(100) NOT NULL,
        scheduled_start TIMESTAMP NOT NULL,
        scheduled_end TIMESTAMP NOT NULL,
        actual_start TIMESTAMP,
        actual_end TIMESTAMP,
        impact_level VARCHAR(20) NOT NULL,
        affected_users INTEGER DEFAULT 0,
        assigned_team VARCHAR(100),
        vendor VARCHAR(100),
        cost_estimate DECIMAL(10,2),
        status VARCHAR(30) DEFAULT 'scheduled',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE energy_consumption (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        site_name VARCHAR(100) NOT NULL,
        site_type VARCHAR(50) NOT NULL,
        region VARCHAR(100) NOT NULL,
        monthly_kwh DECIMAL(10,2) NOT NULL,
        cost_per_kwh DECIMAL(6,4),
        monthly_cost DECIMAL(10,2),
        renewable_percent DECIMAL(5,2) DEFAULT 0,
        pue_ratio DECIMAL(4,2),
        carbon_tons_monthly DECIMAL(8,2),
        cooling_type VARCHAR(50),
        backup_power VARCHAR(50),
        status VARCHAR(30) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('All tables created.');

    // Seed Users
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(demoPassword, 12);
    await pool.query(`
      INSERT INTO users (email, password, name, role) VALUES
      ('admin@telecom.com', $1, 'Admin User', 'admin'),
      ('engineer@telecom.com', $1, 'John Engineer', 'engineer'),
      ('analyst@telecom.com', $1, 'Sarah Analyst', 'analyst')
    `, [hashedPassword]);
    console.log('Users seeded.');

    // Seed Cell Towers (15 items)
    await pool.query(`
      INSERT INTO cell_towers (name, latitude, longitude, tower_type, height_meters, frequency_band, max_capacity, current_load, status, region, installed_date, notes) VALUES
      ('Tower Alpha-1', 40.7128000, -74.0060000, 'Macro', 45.0, '700 MHz', 5000, 3200, 'active', 'New York Metro', '2022-03-15', 'Primary downtown coverage'),
      ('Tower Beta-2', 40.7580000, -73.9855000, 'Macro', 55.0, '1900 MHz', 8000, 6100, 'active', 'New York Metro', '2021-08-22', 'Midtown high-density area'),
      ('Tower Gamma-3', 34.0522000, -118.2437000, 'Small Cell', 12.0, '3500 MHz', 2000, 1800, 'warning', 'Los Angeles', '2023-01-10', 'Near capacity - upgrade needed'),
      ('Tower Delta-4', 41.8781000, -87.6298000, 'Macro', 50.0, '850 MHz', 6000, 2400, 'active', 'Chicago', '2020-11-05', 'Loop district coverage'),
      ('Tower Epsilon-5', 29.7604000, -95.3698000, 'Micro', 8.0, '2100 MHz', 1500, 1200, 'active', 'Houston', '2023-06-18', 'Mall coverage enhancement'),
      ('Tower Zeta-6', 33.4484000, -112.0740000, 'Macro', 60.0, '700 MHz', 7000, 3500, 'active', 'Phoenix', '2021-02-28', 'Suburban expansion tower'),
      ('Tower Eta-7', 39.7392000, -104.9903000, 'Small Cell', 10.0, '3500 MHz', 2500, 2200, 'warning', 'Denver', '2023-09-01', 'High-traffic sports venue'),
      ('Tower Theta-8', 47.6062000, -122.3321000, 'Macro', 48.0, '1900 MHz', 5500, 4100, 'active', 'Seattle', '2022-07-14', 'Tech corridor coverage'),
      ('Tower Iota-9', 25.7617000, -80.1918000, 'Macro', 40.0, '850 MHz', 6500, 5800, 'warning', 'Miami', '2020-05-20', 'Beach area - hurricane hardened'),
      ('Tower Kappa-10', 42.3601000, -71.0589000, 'Small Cell', 15.0, '2500 MHz', 3000, 1500, 'active', 'Boston', '2023-04-12', 'University district'),
      ('Tower Lambda-11', 37.7749000, -122.4194000, 'Macro', 52.0, '700 MHz', 7500, 6800, 'critical', 'San Francisco', '2019-12-01', 'Overloaded - immediate attention'),
      ('Tower Mu-12', 32.7767000, -96.7970000, 'Micro', 9.0, '3500 MHz', 1800, 900, 'active', 'Dallas', '2023-11-20', 'New deployment - 5G ready'),
      ('Tower Nu-13', 38.9072000, -77.0369000, 'Macro', 45.0, '1900 MHz', 5000, 3800, 'active', 'Washington DC', '2021-10-08', 'Government district priority'),
      ('Tower Xi-14', 36.1627000, -86.7816000, 'Small Cell', 11.0, '2100 MHz', 2200, 1100, 'active', 'Nashville', '2023-08-05', 'Entertainment district'),
      ('Tower Omicron-15', 39.9526000, -75.1652000, 'Macro', 47.0, '850 MHz', 5800, 4200, 'active', 'Philadelphia', '2022-01-30', 'Center city coverage')
    `);
    console.log('Cell towers seeded.');

    // Seed Bandwidth Allocations (15 items)
    await pool.query(`
      INSERT INTO bandwidth_allocations (name, region, allocated_bandwidth_mbps, used_bandwidth_mbps, priority_level, service_type, allocation_date, expiry_date, status, notes) VALUES
      ('Enterprise Gold - NYC', 'New York Metro', 10000.00, 7500.00, 1, 'Enterprise', '2024-01-01', '2025-12-31', 'active', 'Premium enterprise tier for financial district'),
      ('Consumer Standard - LA', 'Los Angeles', 25000.00, 18000.00, 3, 'Consumer', '2024-01-01', '2025-06-30', 'active', 'Standard consumer allocation'),
      ('IoT Reserved - Chicago', 'Chicago', 5000.00, 2800.00, 4, 'IoT', '2024-03-01', '2025-03-01', 'active', 'Smart city IoT devices'),
      ('Emergency Services - Houston', 'Houston', 3000.00, 500.00, 1, 'Emergency', '2024-01-01', '2026-01-01', 'active', 'FirstNet priority allocation'),
      ('5G mmWave - Phoenix', 'Phoenix', 50000.00, 15000.00, 2, '5G Premium', '2024-06-01', '2025-12-31', 'active', 'mmWave high-speed allocation'),
      ('Government Secure - DC', 'Washington DC', 8000.00, 6200.00, 1, 'Government', '2024-01-01', '2026-06-30', 'active', 'Classified network allocation'),
      ('Video Streaming - SF', 'San Francisco', 30000.00, 28000.00, 3, 'Consumer', '2024-01-01', '2025-03-31', 'warning', 'Near capacity - peak streaming hours'),
      ('Healthcare Network - Boston', 'Boston', 4000.00, 2100.00, 1, 'Healthcare', '2024-02-15', '2025-08-15', 'active', 'Hospital telemedicine backbone'),
      ('Education Tier - Nashville', 'Nashville', 6000.00, 3500.00, 2, 'Education', '2024-09-01', '2025-06-30', 'active', 'University campus allocation'),
      ('Industrial IoT - Dallas', 'Dallas', 7000.00, 4200.00, 3, 'Industrial', '2024-04-01', '2025-10-01', 'active', 'Manufacturing facility sensors'),
      ('Smart Grid - Denver', 'Denver', 2000.00, 1800.00, 2, 'Utility', '2024-01-01', '2026-01-01', 'warning', 'Power grid monitoring network'),
      ('Transit Network - Seattle', 'Seattle', 3500.00, 2000.00, 2, 'Transit', '2024-05-01', '2025-11-01', 'active', 'Public transportation connectivity'),
      ('Retail Backbone - Miami', 'Miami', 12000.00, 8500.00, 3, 'Retail', '2024-01-01', '2025-07-31', 'active', 'Point-of-sale and inventory systems'),
      ('Stadium Events - Philadelphia', 'Philadelphia', 20000.00, 2000.00, 4, 'Event', '2024-03-01', '2025-02-28', 'active', 'Temporary event capacity boost'),
      ('Backup/Failover - NYC', 'New York Metro', 15000.00, 0.00, 1, 'Backup', '2024-01-01', '2026-01-01', 'standby', 'Emergency failover bandwidth reserve')
    `);
    console.log('Bandwidth allocations seeded.');

    // Seed 5G Rollout Plans (15 items)
    await pool.query(`
      INSERT INTO rollout_plans (name, region, technology, phase, start_date, end_date, budget_millions, towers_planned, towers_completed, population_covered, status, notes) VALUES
      ('NYC 5G Phase 1', 'New York Metro', '5G NR', 'Phase 1', '2024-01-15', '2024-12-31', 125.50, 200, 180, 2500000, 'in_progress', 'Downtown Manhattan and Brooklyn deployment'),
      ('LA mmWave Rollout', 'Los Angeles', '5G mmWave', 'Phase 2', '2024-06-01', '2025-06-30', 95.00, 350, 120, 1800000, 'in_progress', 'High-density urban areas first'),
      ('Chicago Suburban 5G', 'Chicago', '5G NR', 'Phase 1', '2024-03-01', '2025-03-01', 78.00, 150, 150, 1200000, 'completed', 'Suburban ring deployment complete'),
      ('Houston Industrial 5G', 'Houston', '5G NR', 'Phase 1', '2024-09-01', '2025-09-01', 55.00, 80, 25, 450000, 'in_progress', 'Port and industrial zone focus'),
      ('Phoenix Desert Coverage', 'Phoenix', '5G FWA', 'Phase 1', '2025-01-01', '2025-12-31', 42.00, 100, 0, 600000, 'planned', 'Fixed wireless for suburban areas'),
      ('Denver Mountain Corridor', 'Denver', '5G NR', 'Phase 2', '2024-07-01', '2025-07-01', 68.00, 120, 65, 800000, 'in_progress', 'I-70 corridor and ski resorts'),
      ('Seattle Tech Hub 5G+', 'Seattle', '5G mmWave', 'Phase 3', '2024-04-01', '2025-04-01', 110.00, 250, 200, 1500000, 'in_progress', 'South Lake Union and Bellevue tech hub'),
      ('Miami Coastal 5G', 'Miami', '5G NR', 'Phase 1', '2024-02-01', '2024-11-30', 62.00, 90, 90, 950000, 'completed', 'Beach corridor and downtown Miami'),
      ('Boston Academic 5G', 'Boston', '5G NR', 'Phase 2', '2024-08-01', '2025-08-01', 48.00, 75, 30, 550000, 'in_progress', 'Cambridge and university areas'),
      ('SF Bay Area Expansion', 'San Francisco', '5G mmWave', 'Phase 3', '2025-03-01', '2026-03-01', 150.00, 400, 0, 3000000, 'planned', 'Full Bay Area coverage initiative'),
      ('Dallas Enterprise 5G', 'Dallas', '5G NR SA', 'Phase 1', '2024-05-01', '2025-02-28', 72.00, 100, 85, 700000, 'in_progress', 'Enterprise campus and Telecom Corridor'),
      ('DC Government 5G', 'Washington DC', '5G NR', 'Phase 1', '2024-01-01', '2024-12-31', 88.00, 60, 58, 400000, 'in_progress', 'Federal campus secure 5G'),
      ('Nashville Smart City', 'Nashville', '5G NR', 'Phase 1', '2025-02-01', '2026-02-01', 35.00, 50, 0, 350000, 'planned', 'Smart city and entertainment district'),
      ('Philadelphia Transit 5G', 'Philadelphia', '5G NR', 'Phase 2', '2024-10-01', '2025-10-01', 58.00, 85, 20, 650000, 'in_progress', 'SEPTA transit corridors'),
      ('Rural Midwest FWA', 'Midwest Rural', '5G FWA', 'Phase 1', '2024-11-01', '2026-05-01', 200.00, 500, 45, 5000000, 'in_progress', 'Federal broadband initiative - rural coverage')
    `);
    console.log('Rollout plans seeded.');

    // Seed Coverage Gaps (15 items)
    await pool.query(`
      INSERT INTO coverage_gaps (name, region, latitude, longitude, radius_km, affected_population, signal_strength_dbm, gap_type, severity, recommended_solution, status, notes) VALUES
      ('South Bronx Dead Zone', 'New York Metro', 40.8176000, -73.9209000, 2.50, 125000, -110.50, 'No Coverage', 'critical', 'Deploy 3 macro towers with 700MHz', 'identified', 'Complete coverage blackout affecting hospitals'),
      ('East LA Weak Signal', 'Los Angeles', 34.0239000, -118.1726000, 4.00, 230000, -95.20, 'Weak Signal', 'high', 'Add small cells and DAS system', 'in_progress', 'Indoor coverage severely affected'),
      ('South Side Chicago Gap', 'Chicago', 41.7445000, -87.6242000, 3.20, 180000, -102.00, 'Poor Coverage', 'high', 'Install 2 macro towers', 'identified', 'Economic development area'),
      ('Houston Ship Channel', 'Houston', 29.7355000, -95.2649000, 5.00, 15000, -108.30, 'No Coverage', 'medium', 'Industrial small cells with hardened enclosures', 'planned', 'Port authority requesting coverage'),
      ('Phoenix Outskirts West', 'Phoenix', 33.4200000, -112.2500000, 8.00, 45000, -100.00, 'Weak Signal', 'medium', 'FWA tower with directional antennas', 'identified', 'Rapidly growing suburban area'),
      ('Denver Mountain Shadow', 'Denver', 39.6500000, -105.2000000, 6.50, 8000, -115.00, 'No Coverage', 'high', 'Mountaintop repeater station', 'in_progress', 'Terrain blocking signal completely'),
      ('Seattle Waterfront Gap', 'Seattle', 47.6060000, -122.3425000, 1.50, 50000, -98.50, 'Indoor Gap', 'medium', 'DAS installation in waterfront buildings', 'planned', 'Tourist and business area'),
      ('Miami Gardens Underserved', 'Miami', 25.9420000, -80.2456000, 3.80, 110000, -104.00, 'Poor Coverage', 'high', 'New macro tower + 5 small cells', 'identified', 'Underserved community - equity concern'),
      ('Boston Tunnel Dead Zone', 'Boston', 42.3500000, -71.0600000, 0.80, 200000, -120.00, 'No Coverage', 'critical', 'Tunnel DAS system', 'in_progress', 'I-93 tunnel - safety critical'),
      ('SF Mission Valley', 'San Francisco', 37.7600000, -122.4200000, 1.20, 75000, -96.00, 'Weak Signal', 'medium', 'Additional small cells on poles', 'identified', 'High-density residential area'),
      ('Dallas Fair Park Area', 'Dallas', 32.7800000, -96.7600000, 2.00, 55000, -99.50, 'Poor Coverage', 'medium', 'Temporary + permanent cell solution', 'planned', 'Event venue needs surge capacity'),
      ('DC Metro Underground', 'Washington DC', 38.9000000, -77.0200000, 1.00, 350000, -118.00, 'No Coverage', 'critical', 'Metro tunnel DAS upgrade', 'in_progress', 'Congressional mandate for coverage'),
      ('Nashville Gulch', 'Nashville', 36.1500000, -86.7900000, 1.50, 30000, -97.00, 'Indoor Gap', 'low', 'Building DAS and femtocells', 'identified', 'New development construction blocking signal'),
      ('Rural I-95 Corridor', 'East Coast Rural', 37.5000000, -77.5000000, 25.00, 500000, -105.00, 'Weak Signal', 'high', 'Highway corridor tower string', 'planned', 'DOT safety requirement'),
      ('Philadelphia North', 'Philadelphia', 40.0500000, -75.1500000, 3.50, 95000, -101.00, 'Poor Coverage', 'high', 'Macro tower with MIMO upgrade', 'identified', 'Low-income community impact')
    `);
    console.log('Coverage gaps seeded.');

    // Seed Demand Forecasts (15 items)
    await pool.query(`
      INSERT INTO demand_forecasts (name, region, forecast_period, current_demand_gbps, predicted_demand_gbps, growth_rate_percent, confidence_level, data_type, peak_hour, methodology, status, notes) VALUES
      ('NYC Q1 2025 Forecast', 'New York Metro', 'Q1 2025', 850.00, 1020.00, 20.00, 92.50, 'Mobile Data', '18:00-20:00', 'ARIMA + ML Ensemble', 'active', 'Holiday season spike expected'),
      ('LA Video Demand', 'Los Angeles', 'H1 2025', 620.00, 930.00, 50.00, 88.00, 'Video Streaming', '19:00-23:00', 'Neural Network Forecast', 'active', '8K streaming adoption driving growth'),
      ('Chicago IoT Growth', 'Chicago', 'FY 2025', 120.00, 240.00, 100.00, 75.00, 'IoT Traffic', '08:00-17:00', 'Exponential Smoothing', 'active', 'Smart city initiative doubling connections'),
      ('Houston Industrial IoT', 'Houston', 'Q2 2025', 85.00, 110.50, 30.00, 90.00, 'Industrial IoT', '06:00-18:00', 'Linear Regression', 'active', 'Energy sector automation expansion'),
      ('Phoenix Residential Growth', 'Phoenix', 'FY 2025', 180.00, 270.00, 50.00, 85.00, 'Residential Broadband', '17:00-22:00', 'Population Growth Model', 'active', 'Rapid population influx from CA'),
      ('Denver Gaming Traffic', 'Denver', 'Q1 2025', 95.00, 133.00, 40.00, 82.00, 'Gaming/Low Latency', '20:00-02:00', 'Trend Analysis', 'active', 'Cloud gaming adoption increasing'),
      ('Seattle Enterprise Cloud', 'Seattle', 'H1 2025', 400.00, 520.00, 30.00, 94.00, 'Enterprise Cloud', '09:00-17:00', 'SARIMA Model', 'active', 'Tech company office return driving demand'),
      ('Miami Tourism Peak', 'Miami', 'Q1 2025', 250.00, 375.00, 50.00, 78.00, 'Mobile Data', '10:00-22:00', 'Seasonal Decomposition', 'active', 'Spring break and cruise season'),
      ('Boston Education Surge', 'Boston', 'Sep-Dec 2025', 160.00, 208.00, 30.00, 91.00, 'Education', '08:00-16:00', 'Calendar-based Model', 'active', 'University semester start'),
      ('SF AR/VR Growth', 'San Francisco', 'FY 2025', 300.00, 540.00, 80.00, 70.00, 'AR/VR Applications', '10:00-20:00', 'Technology Adoption Curve', 'active', 'Apple Vision Pro ecosystem growth'),
      ('Dallas Stadium Events', 'Dallas', 'Q4 2024', 45.00, 180.00, 300.00, 65.00, 'Event Surge', '12:00-23:00', 'Event Calendar Model', 'active', 'NFL season + special events'),
      ('DC Secure Comms Growth', 'Washington DC', 'FY 2025', 200.00, 250.00, 25.00, 96.00, 'Secure Communications', '07:00-19:00', 'Government Planning Model', 'active', 'New agency requirements'),
      ('Nashville Music Events', 'Nashville', 'H2 2025', 75.00, 112.50, 50.00, 80.00, 'Event/Streaming', '16:00-01:00', 'Event + Trend Model', 'active', 'CMA Fest and tourism growth'),
      ('National 5G Adoption', 'National', 'FY 2025', 2500.00, 4250.00, 70.00, 85.00, '5G Traffic', '17:00-22:00', 'S-Curve Adoption Model', 'active', '5G device penetration reaching tipping point'),
      ('Philadelphia Healthcare', 'Philadelphia', 'H1 2025', 55.00, 71.50, 30.00, 93.00, 'Healthcare/Telemedicine', '08:00-18:00', 'Healthcare Utilization Model', 'active', 'Telemedicine mandate expansion')
    `);
    console.log('Demand forecasts seeded.');

    // Seed Network Load (15 items)
    await pool.query(`
      INSERT INTO network_load (name, node_name, region, current_load_percent, max_capacity_gbps, avg_latency_ms, packet_loss_percent, active_connections, balancing_strategy, status, notes) VALUES
      ('NYC Core Router A', 'NYC-CORE-A', 'New York Metro', 78.50, 100.00, 12.30, 0.010, 450000, 'Weighted Round Robin', 'normal', 'Primary core node - stable performance'),
      ('NYC Core Router B', 'NYC-CORE-B', 'New York Metro', 82.00, 100.00, 15.20, 0.025, 520000, 'Weighted Round Robin', 'warning', 'Approaching threshold - traffic spike'),
      ('LA Edge Node 1', 'LA-EDGE-1', 'Los Angeles', 65.30, 40.00, 8.50, 0.005, 180000, 'Least Connections', 'normal', 'Hollywood/West LA edge'),
      ('Chicago Aggregation', 'CHI-AGG-1', 'Chicago', 71.00, 60.00, 10.80, 0.008, 290000, 'IP Hash', 'normal', 'Central aggregation point'),
      ('Houston South Hub', 'HOU-HUB-S', 'Houston', 45.20, 50.00, 18.50, 0.015, 120000, 'Round Robin', 'normal', 'Southern region hub'),
      ('Phoenix Distribution', 'PHX-DIST-1', 'Phoenix', 88.00, 30.00, 25.00, 0.050, 95000, 'Weighted Least Connections', 'critical', 'Overloaded - needs immediate scaling'),
      ('Denver Peering Point', 'DEN-PEER-1', 'Denver', 55.00, 80.00, 6.20, 0.003, 200000, 'BGP ECMP', 'normal', 'Major peering exchange node'),
      ('Seattle CDN Edge', 'SEA-CDN-1', 'Seattle', 72.50, 50.00, 4.50, 0.002, 310000, 'Geographic', 'normal', 'Content delivery optimized'),
      ('Miami International GW', 'MIA-GW-INT', 'Miami', 68.00, 120.00, 35.00, 0.020, 180000, 'Policy-based', 'normal', 'LATAM traffic gateway'),
      ('Boston Academic Net', 'BOS-ACAD-1', 'Boston', 42.00, 25.00, 7.80, 0.004, 85000, 'Priority Queue', 'normal', 'Internet2 connected'),
      ('SF Data Center Core', 'SF-DC-CORE', 'San Francisco', 91.50, 200.00, 3.20, 0.001, 890000, 'ECMP + Anycast', 'critical', 'Primary West Coast DC - at capacity'),
      ('Dallas Enterprise GW', 'DAL-ENT-1', 'Dallas', 58.00, 45.00, 11.00, 0.007, 150000, 'Application-aware', 'normal', 'Enterprise traffic gateway'),
      ('DC Secure Network', 'DC-SEC-1', 'Washington DC', 35.00, 40.00, 9.50, 0.001, 60000, 'Priority + Encryption', 'normal', 'Government secure backbone'),
      ('Nashville Media Hub', 'NSH-MEDIA-1', 'Nashville', 52.00, 20.00, 14.00, 0.012, 70000, 'Content-aware', 'normal', 'Streaming and media distribution'),
      ('Philly Transit Net', 'PHL-TRANSIT', 'Philadelphia', 76.00, 15.00, 22.00, 0.030, 45000, 'Priority Queue', 'warning', 'SEPTA network - latency concerns')
    `);
    console.log('Network load seeded.');

    // Seed Spectrum Management (15 items)
    await pool.query(`
      INSERT INTO spectrum_management (name, frequency_band, bandwidth_mhz, license_holder, region, technology, license_start, license_end, utilization_percent, interference_level, status, notes) VALUES
      ('Low-Band 700MHz NYC', '700 MHz', 20.00, 'TelecomCorp', 'New York Metro', '4G LTE', '2020-01-01', '2030-12-31', 85.00, 'low', 'active', 'Primary coverage band - excellent penetration'),
      ('Mid-Band 2.5GHz LA', '2.5 GHz', 40.00, 'TelecomCorp', 'Los Angeles', '5G NR', '2022-06-01', '2032-05-31', 62.00, 'low', 'active', 'Sprint merger acquired spectrum'),
      ('mmWave 28GHz Chicago', '28 GHz', 400.00, 'TelecomCorp', 'Chicago', '5G mmWave', '2023-01-01', '2033-12-31', 25.00, 'medium', 'active', 'Dense urban deployment only'),
      ('C-Band 3.7GHz Houston', '3.7 GHz', 100.00, 'TelecomCorp', 'Houston', '5G NR', '2023-03-15', '2035-03-14', 45.00, 'low', 'active', 'FCC auction won spectrum block'),
      ('AWS-3 1.7GHz Phoenix', '1.7/2.1 GHz', 25.00, 'TelecomCorp', 'Phoenix', '4G LTE-A', '2019-07-01', '2029-06-30', 78.00, 'low', 'active', 'Supplementary downlink capacity'),
      ('CBRS 3.5GHz Denver', '3.5 GHz', 40.00, 'TelecomCorp', 'Denver', '5G NR / LTE', '2024-01-01', '2027-12-31', 30.00, 'medium', 'active', 'Shared spectrum - GAA tier'),
      ('mmWave 39GHz Seattle', '39 GHz', 200.00, 'TelecomCorp', 'Seattle', '5G mmWave', '2023-06-01', '2033-05-31', 18.00, 'low', 'active', 'Fixed wireless and mobile hotspots'),
      ('Band 71 600MHz Miami', '600 MHz', 15.00, 'TelecomCorp', 'Miami', '5G NR', '2021-09-01', '2031-08-31', 72.00, 'low', 'active', 'Low-band 5G for coverage'),
      ('PCS 1900MHz Boston', '1900 MHz', 30.00, 'TelecomCorp', 'Boston', '4G LTE', '2018-01-01', '2028-12-31', 90.00, 'medium', 'active', 'Legacy band - nearing capacity'),
      ('C-Band 3.45GHz SF', '3.45 GHz', 80.00, 'TelecomCorp', 'San Francisco', '5G NR', '2024-06-01', '2036-05-31', 15.00, 'low', 'active', 'Newly deployed spectrum'),
      ('mmWave 24GHz Dallas', '24 GHz', 300.00, 'TelecomCorp', 'Dallas', '5G mmWave', '2023-09-01', '2033-08-31', 12.00, 'low', 'active', 'Stadium and venue coverage'),
      ('Band 14 FirstNet DC', '700 MHz PS', 10.00, 'FirstNet/AT&T', 'Washington DC', 'LTE Band 14', '2018-03-01', '2043-02-28', 40.00, 'low', 'active', 'Public safety dedicated spectrum'),
      ('LAA 5GHz Nashville', '5 GHz', 80.00, 'Unlicensed', 'Nashville', 'LTE-LAA', '2022-01-01', '2099-12-31', 55.00, 'high', 'active', 'Unlicensed supplemental - WiFi interference'),
      ('Upper Mid-Band 7GHz', '7.125 GHz', 150.00, 'TelecomCorp', 'National', '6G Research', '2025-06-01', '2035-05-31', 0.00, 'low', 'reserved', 'Future 6G research allocation'),
      ('WCS 2.3GHz Philly', '2.3 GHz', 20.00, 'TelecomCorp', 'Philadelphia', '4G LTE', '2017-04-01', '2027-03-31', 82.00, 'medium', 'active', 'Wireless Communications Service band')
    `);
    console.log('Spectrum management seeded.');

    // Seed QoS Monitoring (15 items)
    await pool.query(`
      INSERT INTO qos_monitoring (name, service_name, region, latency_ms, jitter_ms, packet_loss_percent, throughput_mbps, availability_percent, sla_target, violation_count, status, notes) VALUES
      ('VoLTE NYC Primary', 'Voice over LTE', 'New York Metro', 25.00, 5.20, 0.010, 64.00, 99.99, 'Latency < 50ms, Loss < 0.1%', 0, 'compliant', 'Excellent voice quality maintained'),
      ('Video Streaming LA', 'Video CDN', 'Los Angeles', 45.00, 12.00, 0.050, 500.00, 99.95, 'Throughput > 100Mbps, Avail > 99.9%', 2, 'compliant', 'Minor buffering events during peak'),
      ('Enterprise VPN Chicago', 'Corporate VPN', 'Chicago', 18.00, 3.50, 0.005, 200.00, 99.99, 'Latency < 20ms, Avail > 99.99%', 1, 'warning', 'Borderline latency - monitoring closely'),
      ('Emergency Comms Houston', 'FirstNet Voice', 'Houston', 15.00, 2.00, 0.001, 50.00, 99.999, 'Latency < 30ms, Avail > 99.999%', 0, 'compliant', 'Mission-critical - top priority'),
      ('Gaming Network Phoenix', 'Cloud Gaming', 'Phoenix', 35.00, 8.50, 0.020, 150.00, 99.90, 'Latency < 40ms, Jitter < 10ms', 5, 'violation', 'Latency spikes during evening peak'),
      ('Telemedicine Denver', 'Healthcare Video', 'Denver', 20.00, 4.00, 0.003, 100.00, 99.99, 'Latency < 30ms, Loss < 0.01%', 0, 'compliant', 'Life-critical service level'),
      ('Web Browsing Seattle', 'General Web', 'Seattle', 30.00, 6.00, 0.015, 350.00, 99.95, 'Throughput > 50Mbps', 0, 'compliant', 'Above standard consumer expectations'),
      ('IoT Sensor Miami', 'IoT Data Collection', 'Miami', 80.00, 15.00, 0.100, 10.00, 99.50, 'Avail > 99%, Loss < 1%', 3, 'warning', 'Hurricane season impacting sensors'),
      ('Financial Trading Boston', 'Low-Latency Trading', 'Boston', 2.50, 0.50, 0.000, 1000.00, 99.999, 'Latency < 5ms, Avail > 99.999%', 0, 'compliant', 'Ultra-low latency - dedicated fiber path'),
      ('Smart City Sensors SF', 'City IoT Platform', 'San Francisco', 50.00, 10.00, 0.030, 25.00, 99.80, 'Avail > 99.5%, Loss < 0.5%', 1, 'compliant', 'Traffic and environmental sensors'),
      ('Stadium WiFi Dallas', 'Event Connectivity', 'Dallas', 65.00, 20.00, 0.200, 75.00, 99.00, 'Throughput > 25Mbps per user', 8, 'violation', 'Capacity issues during sold-out events'),
      ('Government Secure DC', 'Classified Network', 'Washington DC', 10.00, 1.50, 0.000, 500.00, 99.999, 'All metrics must be top-tier', 0, 'compliant', 'Exceeds all SLA targets'),
      ('Music Streaming Nashville', 'Audio CDN', 'Nashville', 40.00, 7.00, 0.025, 80.00, 99.92, 'Avail > 99.9%, Throughput > 50Mbps', 1, 'warning', 'Minor degradation during CMA Fest'),
      ('Autonomous Vehicle Pilot', 'V2X Network', 'Phoenix', 8.00, 1.00, 0.001, 200.00, 99.999, 'Latency < 10ms, Loss < 0.001%', 0, 'compliant', 'Safety-critical autonomous driving'),
      ('Transit Connectivity Philly', 'Public Transit WiFi', 'Philadelphia', 55.00, 18.00, 0.150, 30.00, 98.50, 'Avail > 99%, Throughput > 10Mbps', 12, 'violation', 'Underground sections causing failures')
    `);
    console.log('QoS monitoring seeded.');

    // Seed Infrastructure Costs (15 items)
    await pool.query(`
      INSERT INTO infrastructure_costs (name, category, region, capex_millions, opex_monthly_thousands, roi_percent, payback_period_months, vendor, contract_start, contract_end, status, notes) VALUES
      ('NYC 5G Macro Towers', 'Tower Infrastructure', 'New York Metro', 45.00, 180.00, 22.50, 24, 'Ericsson', '2024-01-01', '2029-12-31', 'active', '50 macro tower deployments with MIMO'),
      ('LA Small Cell Network', 'Small Cells', 'Los Angeles', 12.50, 45.00, 35.00, 18, 'Samsung Networks', '2024-03-01', '2027-02-28', 'active', '200 small cells on street furniture'),
      ('Chicago Fiber Backbone', 'Fiber Optic', 'Chicago', 85.00, 95.00, 18.00, 36, 'Corning', '2023-06-01', '2033-05-31', 'active', '500km metro fiber ring'),
      ('Houston Data Center', 'Data Center', 'Houston', 120.00, 350.00, 15.00, 48, 'Equinix', '2024-06-01', '2034-05-31', 'active', 'Edge data center for South region'),
      ('Phoenix Solar Power', 'Power/Energy', 'Phoenix', 8.00, 5.00, 45.00, 12, 'SunPower', '2024-02-01', '2044-01-31', 'active', 'Solar panels for 30 tower sites'),
      ('Denver DAS Installation', 'DAS', 'Denver', 15.00, 25.00, 28.00, 20, 'CommScope', '2024-04-01', '2029-03-31', 'active', 'Stadium and convention center DAS'),
      ('Seattle Core Routers', 'Network Equipment', 'Seattle', 22.00, 30.00, 32.00, 16, 'Cisco', '2024-01-15', '2028-01-14', 'active', 'Core network upgrade to 400G'),
      ('Miami Hurricane Hardening', 'Site Hardening', 'Miami', 18.00, 15.00, 12.00, 42, 'Tower Construction Inc', '2024-05-01', '2026-04-30', 'active', 'Hurricane Cat-5 protection upgrades'),
      ('Boston Campus WiFi 6E', 'WiFi Infrastructure', 'Boston', 5.50, 12.00, 40.00, 10, 'Aruba/HPE', '2024-08-01', '2027-07-31', 'active', 'University campus WiFi 6E deployment'),
      ('SF Edge Computing', 'Edge Compute', 'San Francisco', 35.00, 120.00, 25.00, 22, 'Dell Technologies', '2024-03-15', '2029-03-14', 'active', 'MEC nodes at 25 cell sites'),
      ('Dallas Tower Lease', 'Tower Leasing', 'Dallas', 0.00, 280.00, 0.00, 0, 'American Tower', '2024-01-01', '2034-12-31', 'active', 'Master lease agreement - 150 sites'),
      ('DC Security Infrastructure', 'Security', 'Washington DC', 28.00, 85.00, 0.00, 0, 'Palo Alto Networks', '2024-02-01', '2027-01-31', 'active', 'Mandatory security - no direct ROI'),
      ('Nashville Smart Poles', 'Smart Infrastructure', 'Nashville', 6.00, 8.00, 38.00, 14, 'Philips/Signify', '2024-09-01', '2029-08-31', 'planned', 'Smart poles with integrated small cells'),
      ('National OSS/BSS Upgrade', 'Software/OSS', 'National', 50.00, 200.00, 20.00, 30, 'Amdocs', '2024-01-01', '2028-12-31', 'active', 'Operations support system modernization'),
      ('Philadelphia SEPTA DAS', 'Transit DAS', 'Philadelphia', 22.00, 35.00, 8.00, 60, 'JMA Wireless', '2024-07-01', '2029-06-30', 'in_progress', 'Subway and elevated rail DAS system')
    `);
    console.log('Infrastructure costs seeded.');

    // Seed Signal Interference (15 items)
    await pool.query(`
      INSERT INTO signal_interference (name, source_type, affected_tower, region, frequency_mhz, interference_dbm, affected_area_km2, affected_users, interference_type, mitigation_strategy, severity, status, notes) VALUES
      ('JFK Airport Radar', 'Radar System', 'Tower Beta-2', 'New York Metro', 2700.00, -65.00, 15.00, 85000, 'Adjacent Channel', 'Frequency coordination with FAA', 'high', 'detected', 'FAA radar causing periodic interference'),
      ('Illegal Booster LA-1', 'Signal Booster', 'Tower Gamma-3', 'Los Angeles', 1900.00, -45.00, 2.00, 12000, 'Co-Channel', 'FCC enforcement action pending', 'critical', 'mitigating', 'Illegal consumer booster disrupting network'),
      ('Chicago Rail EMI', 'Electromagnetic', 'Tower Delta-4', 'Chicago', 850.00, -78.00, 3.50, 25000, 'Electromagnetic', 'EMI filtering and shielding', 'medium', 'mitigating', 'CTA electric rail generating EMI'),
      ('Houston Refinery Noise', 'Industrial', 'Tower Epsilon-5', 'Houston', 2100.00, -72.00, 5.00, 8000, 'Intermodulation', 'Intermod filter installation', 'medium', 'detected', 'Refinery equipment creating IM products'),
      ('Phoenix Solar Inverter', 'Solar Equipment', 'Tower Zeta-6', 'Phoenix', 700.00, -80.00, 4.00, 15000, 'Broadband Noise', 'Solar farm inverter replacement', 'low', 'resolved', 'Resolved with new inverter models'),
      ('Denver TV Station', 'Broadcasting', 'Tower Eta-7', 'Denver', 3500.00, -60.00, 8.00, 40000, 'Adjacent Channel', 'Band-pass filter deployment', 'high', 'mitigating', 'TV station adjacent to CBRS band'),
      ('Seattle Maritime Radar', 'Maritime', 'Tower Theta-8', 'Seattle', 3100.00, -68.00, 10.00, 55000, 'Out-of-Band', 'Coordination with port authority', 'medium', 'detected', 'Ship radar bleeding into cellular bands'),
      ('Miami Building Reflection', 'Multipath', 'Tower Iota-9', 'Miami', 28000.00, -55.00, 1.00, 20000, 'Multipath', 'Beamforming optimization', 'high', 'mitigating', 'New high-rise causing mmWave reflections'),
      ('Boston Hospital MRI', 'Medical Equipment', 'Tower Kappa-10', 'Boston', 1900.00, -85.00, 0.50, 3000, 'Electromagnetic', 'Shielding consultation with hospital', 'low', 'detected', 'MRI machines causing localized interference'),
      ('SF Microwave Backhaul', 'Backhaul Link', 'Tower Lambda-11', 'San Francisco', 11000.00, -58.00, 2.50, 30000, 'Cross-Polar', 'Antenna realignment scheduled', 'medium', 'mitigating', 'Misaligned microwave dish causing crosspol'),
      ('Dallas GPS Jammer', 'Jamming', 'Tower Mu-12', 'Dallas', 1575.42, -40.00, 6.00, 45000, 'Intentional Jamming', 'FCC enforcement + triangulation', 'critical', 'detected', 'GPS jammer affecting timing systems'),
      ('DC Foreign Embassy', 'Unknown', 'Tower Nu-13', 'Washington DC', 2600.00, -50.00, 1.50, 10000, 'Unknown Source', 'Counter-intelligence coordination', 'critical', 'detected', 'Suspicious emissions near embassy row'),
      ('Nashville Stage Equipment', 'Entertainment', 'Tower Xi-14', 'Nashville', 5800.00, -70.00, 0.80, 8000, 'Co-Channel', 'Event coordination protocol', 'low', 'resolved', 'Concert wireless equipment conflict'),
      ('Rural Wind Turbine', 'Wind Energy', 'Tower Omicron-15', 'Midwest Rural', 700.00, -75.00, 12.00, 5000, 'Scattering', 'Radar-absorbing materials on turbines', 'medium', 'mitigating', 'Wind turbine blade scattering signals'),
      ('Philly Construction Crane', 'Construction', 'Tower Omicron-15', 'Philadelphia', 3500.00, -62.00, 1.20, 18000, 'Blocking/Reflection', 'Temporary small cell deployment', 'high', 'mitigating', 'Construction crane blocking signal path')
    `);
    console.log('Signal interference seeded.');

    // Seed Network Alarms (15 items)
    await pool.query(`
      INSERT INTO network_alarms (name, alarm_type, source_node, region, severity, category, description, triggered_at, acknowledged_at, resolved_at, assigned_to, root_cause, affected_services, status, notes) VALUES
      ('NYC Core Link Flap', 'Link Failure', 'NYC-CORE-A', 'New York Metro', 'critical', 'Connectivity', 'Core router uplink flapping every 30 seconds', '2025-03-18 14:22:00', '2025-03-18 14:25:00', NULL, 'NOC Team Alpha', 'Suspected fiber micro-bend', 'Voice, Data, Enterprise VPN', 'active', 'Fiber vendor dispatched'),
      ('LA Temperature Alert', 'Environmental', 'LA-EDGE-1', 'Los Angeles', 'warning', 'Environmental', 'Cabinet temperature exceeded 85F threshold', '2025-03-18 11:30:00', '2025-03-18 11:45:00', NULL, 'Field Ops West', 'HVAC unit degraded', 'Local edge services', 'acknowledged', 'Replacement HVAC ordered'),
      ('Chicago BGP Peer Down', 'Protocol', 'CHI-AGG-1', 'Chicago', 'major', 'Routing', 'BGP session with Tier-1 peer lost', '2025-03-18 09:15:00', '2025-03-18 09:16:00', '2025-03-18 09:45:00', 'Network Engineering', 'Peer maintenance window', 'Internet transit', 'resolved', 'Peer restored after planned maintenance'),
      ('Houston Power Failover', 'Power', 'HOU-HUB-S', 'Houston', 'critical', 'Power', 'Primary power lost, running on UPS battery', '2025-03-18 16:00:00', '2025-03-18 16:01:00', NULL, 'Power Systems Team', 'Grid outage in south district', 'All local services', 'active', 'Generator starting sequence initiated'),
      ('Phoenix CPU Threshold', 'Performance', 'PHX-DIST-1', 'Phoenix', 'warning', 'Performance', 'Router CPU utilization at 92% for 15 minutes', '2025-03-18 13:45:00', NULL, NULL, NULL, NULL, 'Routing, NAT, Firewall', 'active', 'Auto-escalation in 30 min if not ack'),
      ('Denver Memory Leak', 'Performance', 'DEN-PEER-1', 'Denver', 'minor', 'Performance', 'Gradual memory increase detected on linecard 3', '2025-03-17 22:00:00', '2025-03-18 08:00:00', NULL, 'Network Engineering', 'Known firmware bug', 'Peering traffic', 'acknowledged', 'Firmware upgrade scheduled'),
      ('Seattle DDoS Detection', 'Security', 'SEA-CDN-1', 'Seattle', 'critical', 'Security', 'Volumetric DDoS attack detected: 45Gbps inbound', '2025-03-18 15:30:00', '2025-03-18 15:31:00', '2025-03-18 15:38:00', 'Security Ops', 'Botnet targeting CDN origin', 'CDN, Web Services', 'resolved', 'Scrubbing center activated, attack mitigated'),
      ('Miami Fiber Cut', 'Link Failure', 'MIA-GW-INT', 'Miami', 'critical', 'Connectivity', 'Fiber cut on LATAM gateway primary path', '2025-03-18 10:00:00', '2025-03-18 10:01:00', NULL, 'NOC Team Bravo', 'Construction crew hit conduit', 'LATAM traffic, International', 'active', 'Traffic rerouted to backup, ETA 8 hours'),
      ('Boston License Expiry', 'Configuration', 'BOS-ACAD-1', 'Boston', 'warning', 'Licensing', 'Software license expires in 7 days', '2025-03-18 06:00:00', '2025-03-18 09:00:00', NULL, 'Procurement', 'License renewal pending', 'Academic network features', 'acknowledged', 'PO submitted, awaiting approval'),
      ('SF Storage Full', 'Capacity', 'SF-DC-CORE', 'San Francisco', 'major', 'Storage', 'Log storage at 95% capacity', '2025-03-18 12:00:00', '2025-03-18 12:15:00', NULL, 'DC Operations', 'Log rotation policy insufficient', 'Logging, Analytics', 'acknowledged', 'Emergency log purge and rotation update'),
      ('Dallas Config Drift', 'Configuration', 'DAL-ENT-1', 'Dallas', 'minor', 'Configuration', 'Running config differs from golden template', '2025-03-17 20:00:00', NULL, NULL, NULL, 'Manual change not committed', 'Enterprise gateway', 'active', 'Compliance audit flagged'),
      ('DC Intrusion Alert', 'Security', 'DC-SEC-1', 'Washington DC', 'critical', 'Security', 'Unauthorized access attempt on secure segment', '2025-03-18 14:00:00', '2025-03-18 14:00:30', '2025-03-18 14:15:00', 'Security Ops', 'Brute force from known bad IP', 'Government secure network', 'resolved', 'IP blocked, incident report filed'),
      ('Nashville Broadcast Storm', 'Traffic', 'NSH-MEDIA-1', 'Nashville', 'major', 'Traffic', 'Broadcast storm detected on VLAN 100', '2025-03-18 08:30:00', '2025-03-18 08:32:00', '2025-03-18 08:50:00', 'Network Engineering', 'Spanning tree loop from new switch', 'Media streaming, Local LAN', 'resolved', 'Offending port disabled, STP reconfigured'),
      ('Rural Satellite Backhaul', 'Performance', 'RURAL-SAT-1', 'Midwest Rural', 'warning', 'Performance', 'Satellite backhaul latency increased to 680ms', '2025-03-18 07:00:00', NULL, NULL, NULL, 'Weather conditions degrading signal', 'Rural broadband', 'active', 'Weather expected to clear by evening'),
      ('Philly Transit Outage', 'Link Failure', 'PHL-TRANSIT', 'Philadelphia', 'critical', 'Connectivity', 'Complete loss of connectivity to 12 transit stations', '2025-03-18 06:45:00', '2025-03-18 06:46:00', NULL, 'Transit Network Team', 'Core switch failure', 'Transit WiFi, Passenger info', 'active', 'Replacement switch being configured')
    `);
    console.log('Network alarms seeded.');

    // Seed Subscriber Analytics (15 items)
    await pool.query(`
      INSERT INTO subscriber_analytics (name, region, plan_type, total_subscribers, active_subscribers, churn_rate_percent, avg_revenue_per_user, data_usage_avg_gb, satisfaction_score, support_tickets, measurement_period, status, notes) VALUES
      ('NYC Postpaid Premium', 'New York Metro', 'Postpaid Premium', 850000, 820000, 1.20, 95.50, 45.00, 8.5, 12500, 'Q1 2025', 'active', 'Highest ARPU segment - strong retention'),
      ('LA Prepaid Basic', 'Los Angeles', 'Prepaid Basic', 1200000, 980000, 4.50, 35.00, 18.00, 6.8, 45000, 'Q1 2025', 'active', 'High churn - pricing pressure from MVNOs'),
      ('Chicago Enterprise', 'Chicago', 'Enterprise', 15000, 14800, 0.50, 450.00, 120.00, 9.2, 800, 'Q1 2025', 'active', 'Enterprise accounts very stable'),
      ('Houston Family Plan', 'Houston', 'Postpaid Family', 320000, 305000, 2.10, 165.00, 85.00, 7.5, 15000, 'Q1 2025', 'active', 'Family plans growing 15% YoY'),
      ('Phoenix 5G Early Adopter', 'Phoenix', '5G Unlimited', 180000, 175000, 1.80, 85.00, 65.00, 7.8, 9500, 'Q1 2025', 'active', '5G coverage satisfaction improving'),
      ('Denver Student Plan', 'Denver', 'Student', 95000, 88000, 6.00, 25.00, 55.00, 7.0, 5200, 'Q1 2025', 'active', 'Seasonal churn at graduation'),
      ('Seattle Tech Pro', 'Seattle', 'Business Pro', 45000, 44000, 0.80, 120.00, 95.00, 8.8, 2100, 'Q1 2025', 'active', 'Tech professionals value low latency'),
      ('Miami Tourist Roaming', 'Miami', 'Roaming/Visitor', 500000, 450000, 15.00, 12.00, 8.00, 6.5, 35000, 'Q1 2025', 'active', 'Seasonal tourist traffic - transient base'),
      ('Boston Academic Bundle', 'Boston', 'Academic Bundle', 120000, 115000, 3.50, 40.00, 70.00, 7.2, 6800, 'Q1 2025', 'active', 'Back-to-school surge in September'),
      ('SF Developer Plan', 'San Francisco', 'Developer API', 8000, 7800, 0.90, 200.00, 150.00, 9.0, 400, 'Q1 2025', 'active', 'API-heavy users, very low churn'),
      ('Dallas Government', 'Dallas', 'Government', 25000, 24900, 0.20, 75.00, 30.00, 8.0, 1200, 'Q1 2025', 'active', 'Government contract - very sticky'),
      ('DC FirstNet Public Safety', 'Washington DC', 'FirstNet', 35000, 34800, 0.10, 55.00, 25.00, 8.5, 500, 'Q1 2025', 'active', 'Mission critical - zero tolerance for churn'),
      ('Nashville Music Industry', 'Nashville', 'Business Plus', 18000, 17200, 2.50, 110.00, 80.00, 7.6, 1500, 'Q1 2025', 'active', 'Music industry accounts need upload speeds'),
      ('National IoT Machine', 'National', 'IoT/M2M', 5000000, 4800000, 0.80, 5.00, 0.50, 7.5, 2000, 'Q1 2025', 'active', 'Massive IoT base with low ARPU'),
      ('Philadelphia Senior Plan', 'Philadelphia', 'Senior Basic', 200000, 185000, 2.80, 30.00, 8.00, 7.0, 18000, 'Q1 2025', 'active', 'Higher support ticket volume per user')
    `);
    console.log('Subscriber analytics seeded.');

    // Seed Fiber Routes (15 items)
    await pool.query(`
      INSERT INTO fiber_routes (name, route_type, start_location, end_location, region, length_km, fiber_count, capacity_tbps, current_utilization_percent, installation_date, vendor, redundancy_type, status, notes) VALUES
      ('NYC Metro Ring A', 'Metro Ring', 'Manhattan Hub', 'Brooklyn POP', 'New York Metro', 45.00, 288, 38.40, 72.00, '2020-06-15', 'Corning', 'SONET Ring', 'active', 'Primary metro backbone ring'),
      ('LA Long Haul West', 'Long Haul', 'LA Downtown DC', 'Phoenix POP', 'West Coast', 580.00, 144, 19.20, 45.00, '2019-03-01', 'OFS Fitel', 'Diverse Path', 'active', 'Interstate backbone LA-Phoenix'),
      ('Chicago Metro Core', 'Metro Core', 'Chicago Loop Hub', 'Schaumburg POP', 'Chicago', 35.00, 432, 57.60, 68.00, '2021-08-20', 'Corning', 'Dual Ring', 'active', 'Dense metro fiber with dual redundancy'),
      ('Houston Gulf Corridor', 'Regional', 'Houston DC', 'Galveston POP', 'Houston', 85.00, 96, 12.80, 35.00, '2022-01-10', 'Prysmian', 'Linear + Backup', 'active', 'Gulf coast connectivity corridor'),
      ('Denver Mountain Pass', 'Long Haul', 'Denver Hub', 'Vail Repeater', 'Denver', 160.00, 48, 6.40, 55.00, '2018-11-01', 'AFL', 'Single Path', 'active', 'Challenging mountain terrain route'),
      ('Seattle Puget Sound', 'Submarine', 'Seattle DC', 'Bainbridge POP', 'Seattle', 12.00, 72, 9.60, 28.00, '2023-04-15', 'SubCom', 'Submarine + Land', 'active', 'Undersea crossing to island'),
      ('Miami LATAM Gateway', 'Submarine', 'Miami NAP', 'Caribbean Landing', 'Miami', 340.00, 192, 25.60, 62.00, '2017-09-01', 'NEC', 'Dual Submarine', 'active', 'Critical LATAM interconnect'),
      ('Boston Research Loop', 'Campus', 'MIT Hub', 'Harvard POP', 'Boston', 8.00, 576, 76.80, 40.00, '2022-07-01', 'Sumitomo', 'Ring', 'active', 'Ultra high-capacity research network'),
      ('SF Bay Bridge Span', 'Metro', 'SF Financial DC', 'Oakland POP', 'San Francisco', 18.00, 288, 38.40, 78.00, '2019-05-20', 'Corning', 'Bridge + Tunnel', 'active', 'Critical bay crossing with dual path'),
      ('Dallas Telecom Corridor', 'Metro Core', 'Richardson Hub', 'Plano POP', 'Dallas', 22.00, 360, 48.00, 52.00, '2021-02-14', 'OFS Fitel', 'Mesh', 'active', 'Dense telecom district fiber mesh'),
      ('DC Government Ring', 'Secure', 'Pentagon POP', 'Capitol Hub', 'Washington DC', 30.00, 144, 19.20, 30.00, '2020-01-01', 'Classified', 'Hardened Ring', 'active', 'Classified government fiber ring'),
      ('Nashville Music Row', 'Metro', 'Nashville DC', 'Music Row Hub', 'Nashville', 6.00, 96, 12.80, 38.00, '2023-09-01', 'Prysmian', 'Star', 'active', 'Entertainment district connectivity'),
      ('National Backbone East', 'Long Haul', 'NYC Hub', 'DC Hub', 'East Coast', 365.00, 192, 25.60, 70.00, '2016-06-01', 'Corning', 'Diverse Route', 'active', 'East coast backbone segment'),
      ('Rural Midwest Trunk', 'Long Haul', 'Chicago Hub', 'Des Moines POP', 'Midwest Rural', 530.00, 48, 6.40, 22.00, '2023-11-15', 'AFL', 'Single Path', 'active', 'Federal broadband expansion fiber'),
      ('Philadelphia Northeast', 'Metro', 'Philly DC', 'Northeast Hub', 'Philadelphia', 15.00, 144, 19.20, 58.00, '2021-10-01', 'Sumitomo', 'Ring', 'active', 'Northeast metro extension ring')
    `);
    console.log('Fiber routes seeded.');

    // Seed Maintenance Schedules (15 items)
    await pool.query(`
      INSERT INTO maintenance_schedules (name, maintenance_type, target_asset, region, scheduled_start, scheduled_end, actual_start, actual_end, impact_level, affected_users, assigned_team, vendor, cost_estimate, status, notes) VALUES
      ('NYC Core Router Upgrade', 'Software Upgrade', 'NYC-CORE-A', 'New York Metro', '2025-03-22 02:00:00', '2025-03-22 06:00:00', NULL, NULL, 'high', 450000, 'Network Engineering', 'Cisco', 15000.00, 'scheduled', 'IOS-XR upgrade to fix known CVE'),
      ('LA Small Cell Batch Replace', 'Hardware Replacement', 'LA Small Cells Zone 3', 'Los Angeles', '2025-03-20 08:00:00', '2025-03-20 18:00:00', '2025-03-20 08:15:00', NULL, 'medium', 25000, 'Field Ops West', 'Samsung', 85000.00, 'in_progress', '15 end-of-life small cells being replaced'),
      ('Chicago Fiber Splice', 'Fiber Maintenance', 'CHI-AGG-1 Uplink', 'Chicago', '2025-03-25 01:00:00', '2025-03-25 05:00:00', NULL, NULL, 'high', 290000, 'Fiber Team Midwest', 'Corning', 8000.00, 'scheduled', 'Preventive splice point reinforcement'),
      ('Houston Generator Test', 'Preventive', 'HOU-HUB-S Generator', 'Houston', '2025-03-19 10:00:00', '2025-03-19 12:00:00', '2025-03-19 10:00:00', '2025-03-19 11:30:00', 'low', 0, 'Power Systems', 'Caterpillar', 2500.00, 'completed', 'Monthly generator load test passed'),
      ('Phoenix HVAC Overhaul', 'Preventive', 'PHX-DIST-1 Cooling', 'Phoenix', '2025-03-24 06:00:00', '2025-03-24 14:00:00', NULL, NULL, 'medium', 95000, 'Facilities Phoenix', 'Carrier', 35000.00, 'scheduled', 'Summer prep - full HVAC service'),
      ('Denver Antenna Realign', 'Optimization', 'Tower Eta-7 Antennas', 'Denver', '2025-03-21 04:00:00', '2025-03-21 08:00:00', NULL, NULL, 'low', 8000, 'RF Engineering', 'Ericsson', 5000.00, 'scheduled', 'Optimize coverage after new building'),
      ('Seattle Firmware Update', 'Software Upgrade', 'SEA-CDN-1', 'Seattle', '2025-03-23 03:00:00', '2025-03-23 05:00:00', NULL, NULL, 'medium', 310000, 'Network Engineering', 'Arista', 0.00, 'approved', 'Critical security patch deployment'),
      ('Miami Hurricane Prep', 'Preventive', 'All Miami Sites', 'Miami', '2025-04-01 06:00:00', '2025-04-05 18:00:00', NULL, NULL, 'low', 0, 'Field Ops South', 'Multiple', 120000.00, 'scheduled', 'Annual hurricane season preparation'),
      ('Boston UPS Battery Replace', 'Hardware Replacement', 'BOS-ACAD-1 UPS', 'Boston', '2025-03-19 22:00:00', '2025-03-20 02:00:00', '2025-03-19 22:00:00', '2025-03-20 01:15:00', 'medium', 85000, 'Power Systems', 'APC/Schneider', 28000.00, 'completed', 'All 4 battery strings replaced successfully'),
      ('SF Database Migration', 'Migration', 'SF-DC-CORE OSS DB', 'San Francisco', '2025-03-29 00:00:00', '2025-03-29 08:00:00', NULL, NULL, 'high', 890000, 'DC Operations', 'Amdocs', 50000.00, 'scheduled', 'OSS database migration to new cluster'),
      ('Dallas Tower Inspection', 'Inspection', 'Tower Mu-12', 'Dallas', '2025-03-20 09:00:00', '2025-03-20 15:00:00', '2025-03-20 09:30:00', NULL, 'low', 0, 'Tower Crew Delta', 'Tower Construction Inc', 3500.00, 'in_progress', 'Annual structural and FAA compliance inspection'),
      ('DC Security Audit', 'Security', 'DC-SEC-1 Firewall', 'Washington DC', '2025-03-26 10:00:00', '2025-03-26 18:00:00', NULL, NULL, 'low', 0, 'Security Ops', 'Palo Alto', 12000.00, 'approved', 'Quarterly penetration test and audit'),
      ('Nashville Capacity Upgrade', 'Capacity Upgrade', 'NSH-MEDIA-1', 'Nashville', '2025-03-28 02:00:00', '2025-03-28 06:00:00', NULL, NULL, 'medium', 70000, 'Network Engineering', 'Juniper', 95000.00, 'scheduled', 'Adding 100G linecards for event season'),
      ('National NTP Sync', 'Configuration', 'All Core Routers', 'National', '2025-03-22 12:00:00', '2025-03-22 14:00:00', NULL, NULL, 'low', 0, 'Network Engineering', 'Internal', 0.00, 'scheduled', 'NTP stratum update across all nodes'),
      ('Philly Subway DAS Install', 'Installation', 'SEPTA Line 3 DAS', 'Philadelphia', '2025-03-24 00:00:00', '2025-03-28 04:00:00', NULL, NULL, 'medium', 45000, 'Transit Network Team', 'JMA Wireless', 180000.00, 'scheduled', 'New DAS installation in 5 subway stations')
    `);
    console.log('Maintenance schedules seeded.');

    // Seed Energy Consumption (15 items)
    await pool.query(`
      INSERT INTO energy_consumption (name, site_name, site_type, region, monthly_kwh, cost_per_kwh, monthly_cost, renewable_percent, pue_ratio, carbon_tons_monthly, cooling_type, backup_power, status, notes) VALUES
      ('NYC Data Center Power', 'NYC-DC-1', 'Data Center', 'New York Metro', 450000.00, 0.1800, 81000.00, 15.00, 1.45, 195.00, 'Chilled Water', 'Diesel Generator + UPS', 'active', 'Largest facility - efficiency improvement needed'),
      ('LA Macro Tower Array', 'LA-TOWER-ZONE-1', 'Tower Cluster', 'Los Angeles', 85000.00, 0.2200, 18700.00, 35.00, NULL, 55.00, 'Passive Air', 'Battery + Solar', 'active', 'Solar panels reducing grid dependency'),
      ('Chicago Metro Hub', 'CHI-HUB-1', 'Central Office', 'Chicago', 280000.00, 0.1400, 39200.00, 10.00, 1.60, 140.00, 'Precision AC', 'Diesel Generator + UPS', 'active', 'Winter heating costs offset by cooling savings'),
      ('Houston Edge DC', 'HOU-EDGE-1', 'Edge Data Center', 'Houston', 120000.00, 0.1100, 13200.00, 20.00, 1.35, 65.00, 'Free Cooling + AC', 'Natural Gas Generator', 'active', 'Newer facility with efficient design'),
      ('Phoenix Solar Farm Site', 'PHX-SOLAR-1', 'Tower + Solar', 'Phoenix', 45000.00, 0.0800, 3600.00, 85.00, NULL, 8.00, 'Evaporative', 'Solar + Battery', 'active', 'Model green site - 85% renewable'),
      ('Denver Mountain Sites', 'DEN-MTN-GROUP', 'Remote Towers', 'Denver', 35000.00, 0.1300, 4550.00, 40.00, NULL, 22.00, 'Passive + Heater', 'Wind + Battery', 'active', 'Wind turbines supplementing grid power'),
      ('Seattle Campus DC', 'SEA-DC-1', 'Data Center', 'Seattle', 380000.00, 0.1000, 38000.00, 90.00, 1.20, 15.00, 'Free Air Cooling', 'UPS + Hydro Grid', 'active', 'Pacific NW hydro power - very green'),
      ('Miami Hardened Sites', 'MIA-HARD-GROUP', 'Hardened Towers', 'Miami', 55000.00, 0.1600, 8800.00, 12.00, NULL, 38.00, 'Split AC', 'Diesel Generator', 'active', 'Hurricane-proof sites with higher power needs'),
      ('Boston University Hub', 'BOS-UNI-1', 'Small DC', 'Boston', 90000.00, 0.2400, 21600.00, 25.00, 1.50, 52.00, 'CRAC Units', 'UPS + Generator', 'active', 'High electricity rates in Boston area'),
      ('SF Core Facility', 'SF-DC-CORE', 'Core Data Center', 'San Francisco', 520000.00, 0.2600, 135200.00, 60.00, 1.30, 95.00, 'Liquid Cooling', 'Fuel Cell + UPS', 'active', 'Liquid cooling for high-density compute'),
      ('Dallas Telecom Campus', 'DAL-CAMPUS-1', 'Campus', 'Dallas', 200000.00, 0.0900, 18000.00, 18.00, 1.55, 110.00, 'Precision AC', 'Diesel Generator', 'active', 'Low Texas energy rates, high consumption'),
      ('DC Secure Facility', 'DC-SEC-SITE', 'Secure Facility', 'Washington DC', 150000.00, 0.1500, 22500.00, 5.00, 1.70, 88.00, 'Redundant AC', 'Triple Redundant Gen', 'active', 'Security requires extra power overhead'),
      ('Nashville Smart Poles', 'NSH-POLES', 'Smart Infrastructure', 'Nashville', 12000.00, 0.1200, 1440.00, 50.00, NULL, 5.00, 'None', 'Grid + Small Battery', 'active', 'LED + small cell - very efficient per unit'),
      ('Rural Midwest Sites', 'RURAL-MW-GROUP', 'Remote Towers', 'Midwest Rural', 75000.00, 0.1100, 8250.00, 30.00, NULL, 42.00, 'Passive', 'Diesel + Solar', 'active', 'Diesel transport costs add to expense'),
      ('Philadelphia Transit Net', 'PHL-TRANSIT-PWR', 'Transit Infrastructure', 'Philadelphia', 65000.00, 0.1700, 11050.00, 8.00, NULL, 45.00, 'Tunnel Ventilation', 'UPS + Transit Grid', 'active', 'Subway power sharing arrangement')
    `);
    console.log('Energy consumption seeded.');

    console.log('\\n✅ All seed data inserted successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await pool.end();
  }
}

seed();
