import React from 'react';
import CapacityUtilizationChart from '../components/CapacityUtilizationChart';
import CoverageHeatmap from '../components/CoverageHeatmap';
import CapacityPlanPdfExport from '../components/CapacityPlanPdfExport';
import ProvisioningRulesEditor from '../components/ProvisioningRulesEditor';

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page" style={{ padding: 24 }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Network Views</h2>
        <p className="subtitle" style={{ color: '#9aa4b8', marginTop: 6 }}>
          Custom capacity utilization, coverage heatmap, plan exports, and provisioning rules.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginBottom: 20 }}>
        <CapacityUtilizationChart />
        <CoverageHeatmap />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
        <CapacityPlanPdfExport />
        <ProvisioningRulesEditor />
      </div>
    </div>
  );
}
