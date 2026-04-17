// Projection scales keep the OSM-derived scene compact enough for stable camera math.
export const POSITION_SCALE = 0.2;
export const ROAD_WIDTH_SCALE = 0.6;
export const BUILDING_HEIGHT_SCALE = 0.2;
export const ROAD_LAYER_Y = {
  local: 0.116,
  connector: 0.121,
  arterial: 0.126,
} as const;
export const NON_ROAD_LAYER_Y = {
  facility: 0.048,
  green: 0.056,
  pedestrian: 0.064,
  parking: 0.072,
  water: 0.08,
} as const;
export const ROAD_NETWORK_EDGE_Y_OFFSET = 0.42;
export const ROAD_NETWORK_NODE_Y = 0.72;
export const LARGE_LOW_RISE_BUILDING_AREA_M2 = 12_000;
export const LARGE_LOW_RISE_BUILDING_MAX_HEIGHT_M = 20;

// Signal and curbside tuning keeps intersections readable without simulating every lane.
export const SIGNAL_RADIUS = 7;
export const SIGNAL_CYCLE = 24;
export const SIGNAL_CLUSTER_DISTANCE = 18;
export const SIGNAL_ROAD_SNAP_DISTANCE = 14;
export const SIGNAL_NODE_SNAP_DISTANCE = 16;
export const SIGNAL_COORDINATION_BAND_SIZE = 14;
export const SIGNAL_COORDINATION_PHASE_STEP = 1.35;
export const SIGNAL_WAVE_TRAVEL_SPEED = 6.4;
export const SIGNAL_RADIUS_SQ = SIGNAL_RADIUS * SIGNAL_RADIUS;
export const CURBSIDE_EDGE_INSET_MIN = 0.45;
export const CURBSIDE_EDGE_INSET_MAX = 0.72;
export const CURBSIDE_EXTRA_OFFSET_MAX = 1.05;
export const CURBSIDE_SIDEWALK_OFFSET = 0.92;
export const INTERSECTION_BOX_OCCUPANCY_RADIUS = 2.35;
export const INTERSECTION_OCCUPANCY_LOOKAHEAD = 6;
export const INTERSECTION_EXIT_QUEUE_RADIUS = 8.8;
export const INTERSECTION_BOX_OCCUPANCY_RADIUS_SQ =
  INTERSECTION_BOX_OCCUPANCY_RADIUS * INTERSECTION_BOX_OCCUPANCY_RADIUS;
export const INTERSECTION_EXIT_QUEUE_RADIUS_SQ =
  INTERSECTION_EXIT_QUEUE_RADIUS * INTERSECTION_EXIT_QUEUE_RADIUS;
export const INTERSECTION_EXIT_BLOCK_SPEED = 2.4;
export const INTERSECTION_BOX_ENTRY_LOOKAHEAD = 10.5;
export const INTERSECTION_SIGNAL_LOOKAHEAD = 18;
export const INTERSECTION_LEFT_TURN_GAP_DISTANCE = 7.2;
export const CROSSWALK_STRIPE_COUNT = 4;
export const CROSSWALK_STEP = 1.35;
export const CROSSWALK_WIDTH = 5.4;
export const PEDESTRIAN_SPAN = 4.2;

// Vehicle stepping and spacing aim for predictable motion over physical realism.
export const HOTSPOT_SLOWDOWN_DISTANCE = 16;
export const HOTSPOT_TRIGGER_DISTANCE = 1.2;
export const SERVICE_STOP_DURATION = 1.6;
export const VEHICLE_SIMULATION_FPS = 30;
export const VEHICLE_SIMULATION_STEP = 1 / VEHICLE_SIMULATION_FPS;
export const MAX_VEHICLE_SIMULATION_STEPS = 4;
export const VEHICLE_FOLLOW_LOOKAHEAD_BUFFER = 8;
export const VEHICLE_PROXIMITY_CELL_SIZE = 12;
export const ROAD_SEGMENT_INDEX_CELL_SIZE = 24;
export const TRAFFIC_ROUTE_REENTRY_DISTANCE = 6.4;
export const TAXI_ASSET_TARGET_LENGTH = 4.28;
export const TRAFFIC_ASSET_TARGET_LENGTH = 4.2;
export const ASSET_FETCH_TIMEOUT_MS = 20_000;

// Camera presets favor stable presentation shots and readable taxi follow views.
export const CAMERA_DRIVE_SPEED = 26;
export const CAMERA_STRAFE_SPEED = 22;
export const CAMERA_TURN_SPEED = 1.95;
export const CAMERA_BASE_MOVE_SCALE = 1.8;
export const CAMERA_BASE_TURN_SCALE = 0.95;
export const CAMERA_DRAG_SENSITIVITY = 0.0042;
export const CAMERA_MIN_DISTANCE = 34;
export const CAMERA_MAX_DISTANCE = 560;
export const CAMERA_MIN_PITCH = 0.34;
export const CAMERA_MAX_PITCH = 1.16;
export const CAMERA_LOOK_HEIGHT = 6;
export const SUBWAY_FOCUS_DISTANCE = 56;
export const SUBWAY_FOCUS_PITCH = 0.82;
export const TAXI_VIEW_CAMERA_HEIGHT = 4.1;
export const TAXI_VIEW_CAMERA_BACK_OFFSET = -10.5;
export const TAXI_VIEW_CAMERA_SIDE_OFFSET = 0.5;
export const TAXI_VIEW_LOOK_AHEAD = 18;
export const TAXI_CLICK_MOVE_THRESHOLD = 8;
export const LOCAL_SCENARIO_FOCUS_DISTANCE = 34;
export const LOCAL_SCENARIO_FOCUS_PITCH = 0.34;
export const LOCAL_SCENARIO_FOCUS_CENTER_BLEND = 0.3;
export const LOCAL_SCENARIO_FOCUS_YAW_OFFSET = -0.76;

// Render cadence trades visual smoothness against browser budget in heavy scenes.
export const SHOW_DONG_BOUNDARIES = false;
export const DRIVE_RENDER_FPS = 60;
export const FOLLOW_RENDER_FPS = 60;
export const OVERVIEW_RENDER_FPS = 60;
export const HIDDEN_RENDER_FPS = 12;
export const SIMULATION_STATS_UPDATE_INTERVAL = 0.3;
export const HOTSPOT_ACTIVITY_REFRESH_INTERVAL = 1.2;
export const HOVER_REFRESH_INTERVAL = 1 / 30;
export const LABEL_RENDER_INTERVAL = 1 / 30;
export const LABEL_VISIBILITY_REFRESH_INTERVAL = 0.14;
export const COMMON_REFRESH_RATE_BANDS = [
  60, 72, 75, 90, 100, 120, 144, 165, 180, 200, 240,
] as const;
export const AUTO_RENDER_HALF_REFRESH_THRESHOLD = 100;
export const AUTO_REFRESH_BAND_HYSTERESIS_RATIO = 0.1;
export const DRIVE_PIXEL_RATIO = 0.85;
export const FOLLOW_PIXEL_RATIO = 0.85;
export const OVERVIEW_PIXEL_RATIO = 0.75;
export const HIDDEN_PIXEL_RATIO = 0.6;
