module.exports={
  caseType:'approved_network_capacity_change',initialState:'capacity_event_registered',
  states:['capacity_event_registered','telemetry_reconciled','constraints_locked','scenario_replayed','plan_proposed','operator_review','change_approved','execution_observed','execution_failed','offline_pending','rollback_verified','outcome_reconciled','closed'],
  createRoles:['capacity_planner','network_manager'],assessmentRoles:['capacity_planner','network_reviewer','safety_reviewer'],auditRoles:['network_manager','safety_reviewer','auditor'],connectorRoles:['integration_operator','network_manager'],
  evidenceKinds:['telemetry_manifest','nms_snapshot','asset_site_snapshot','gis_version','constraint_manifest','weather_snapshot','maintenance_window','historical_replay','forecast_report','optimization_report','operator_approval','change_receipt','execution_feedback','offline_receipt','failure_record','rollback_record','outcome_report'],
  requiredSignals:['telemetryVersion','nmsVersion','assetVersion','gisVersion','constraintVersion','modelVersion','policyVersion','safetyLimitsVerified','sourceFreshnessSeconds','forecastError','constraintViolations','p95LatencyMs','missedEventRate','realizedUtilization','offlineStatus'],
  professionalBoundary:'Plans remain proposals for qualified network operators. Assessment cannot change NMS, RAN, spectrum, SCADA, devices, site assets, or dispatch maintenance.',
  connectors:[{name:'telemetry',purpose:'timestamped read-only capacity observations'},{name:'network_management',purpose:'Ericsson/Nokia/other NMS snapshots and receipts'},{name:'erp_wms_tms',purpose:'work, parts, and logistics status'},{name:'scada_device',purpose:'read-only equipment status; commands prohibited'},{name:'gis',purpose:'versioned network and site geometry'},{name:'weather',purpose:'timestamped condition receipts'},{name:'maintenance',purpose:'maintenance windows and feedback'},{name:'notification',purpose:'approved operator delivery receipts'}],
  transitions:[
    {from:'capacity_event_registered',action:'reconcile_telemetry',to:'telemetry_reconciled',roles:['capacity_planner','integration_operator'],requiresEvidence:true},
    {from:'telemetry_reconciled',action:'lock_constraints',to:'constraints_locked',roles:['network_reviewer'],requiresEvidence:true,dualControl:true},
    {from:'constraints_locked',action:'record_historical_replay',to:'scenario_replayed',roles:['capacity_planner','network_reviewer'],requiresEvidence:true},
    {from:'scenario_replayed',action:'record_plan',to:'plan_proposed',roles:['capacity_planner'],requiresEvidence:true},
    {from:'plan_proposed',action:'submit_operator_review',to:'operator_review',roles:['network_reviewer','safety_reviewer'],requiresEvidence:true,dualControl:true},
    {from:'operator_review',action:'approve_observed_change',to:'change_approved',roles:['network_manager','safety_reviewer'],requiresEvidence:true,dualControl:true},
    {from:'change_approved',action:'record_execution',to:'execution_observed',roles:['integration_operator','network_manager'],requiresEvidence:true},
    {from:'change_approved',action:'record_failure',to:'execution_failed',roles:['integration_operator','network_manager'],requiresEvidence:true},
    {from:'change_approved',action:'record_offline_pending',to:'offline_pending',roles:['integration_operator'],requiresEvidence:true},
    {from:'execution_failed',action:'verify_rollback',to:'rollback_verified',roles:['safety_reviewer','network_manager'],requiresEvidence:true,dualControl:true},
    {from:'offline_pending',action:'verify_rollback',to:'rollback_verified',roles:['safety_reviewer','network_manager'],requiresEvidence:true,dualControl:true},
    {from:'execution_observed',action:'reconcile_outcome',to:'outcome_reconciled',roles:['network_reviewer','network_manager'],requiresEvidence:true,dualControl:true},
    {from:'rollback_verified',action:'reconcile_outcome',to:'outcome_reconciled',roles:['network_reviewer','network_manager'],requiresEvidence:true,dualControl:true},
    {from:'outcome_reconciled',action:'close_plan',to:'closed',roles:['network_manager','auditor'],requiresEvidence:true}
  ],
  acceptedFixture:{telemetryVersion:'t1',nmsVersion:'n1',assetVersion:'a1',gisVersion:'g1',constraintVersion:'c1',modelVersion:'m1',policyVersion:'p1',safetyLimitsVerified:true,sourceFreshnessSeconds:15,forecastError:0.06,constraintViolations:0,p95LatencyMs:600,missedEventRate:0.01,realizedUtilization:0.72,offlineStatus:'reconciled'},
  rejectedFixture:{telemetryVersion:'t1',nmsVersion:'n1',assetVersion:'a1',gisVersion:'g1',constraintVersion:'c1',modelVersion:'m1',policyVersion:'p1',safetyLimitsVerified:true,sourceFreshnessSeconds:15,forecastError:0.06,constraintViolations:2,p95LatencyMs:600,missedEventRate:0.01,realizedUtilization:0.72,offlineStatus:'reconciled'},
  readyDisposition:'independent_network_operator_review_required',holdDisposition:'forecast_constraint_latency_or_offline_hold',decisionField:'networkChangeCommand',
  assess:x=>{const freshness=Number(x.sourceFreshnessSeconds),error=Number(x.forecastError),violations=Number(x.constraintViolations),latency=Number(x.p95LatencyMs),missed=Number(x.missedEventRate),utilization=Number(x.realizedUtilization);const ready=x.safetyLimitsVerified===true&&freshness<=120&&error<=0.1&&violations===0&&latency<=1000&&missed<=0.02&&utilization<=0.85&&x.offlineStatus==='reconciled';return{disposition:ready?'independent_network_operator_review_required':'forecast_constraint_latency_or_offline_hold',networkChangeCommand:null,dispatchCommand:null,metrics:{freshness,error,violations,latency,missed,utilization},versions:{telemetry:x.telemetryVersion,nms:x.nmsVersion,assets:x.assetVersion,gis:x.gisVersion,constraints:x.constraintVersion,model:x.modelVersion}};}
};
