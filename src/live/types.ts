/** Message shapes from WEBSOCKET_API.md (protocol 1.0.0). Unknown fields are ignored. */

export type Side = "in" | "out" | "unknown";

export interface CameraInfo {
  id: string;
  name: string;
  enabled: boolean;
}

export interface HelloMsg {
  type: "hello";
  client_id?: number;
  version?: string;
  server_time?: number;
  topics?: string[];
  available_topics?: string[];
  cameras?: CameraInfo[];
}

export interface StatusCamera {
  id: string;
  name?: string;
  status: string;
  fps?: number | null;
  persons: number;
  inside: number | null;
  outside: number | null;
  mode?: string;
  entries?: number;
  exits?: number;
  alerts: number;
  objects?: Record<string, number>;
}

export interface StatusTotals {
  persons: number;
  inside: number | null;
  outside: number | null;
  entries?: number;
  exits?: number;
  objects: number;
  alerts: number;
}

export interface StatusMsg {
  type: "status";
  ts?: number;
  totals?: StatusTotals;
  cameras?: StatusCamera[];
}

export interface PersonObject {
  label: string;
  vi: string;
  category: string;
  conf: number;
  alert: boolean;
  box?: [number, number, number, number];
}

export interface Person {
  track_id: number | null;
  side: Side;
  alert: boolean;
  items: string[];
  objects: PersonObject[];
  conf: number;
  box?: [number, number, number, number];
  foot?: [number, number];
}

export interface PeopleCamera {
  id: string;
  frame_size?: [number, number];
  people: Person[];
}

export interface PeopleMsg {
  type: "people";
  ts?: number;
  cameras?: PeopleCamera[];
}

export interface CrossingMsg {
  type: "crossing";
  ts: number;
  camera_id: string;
  track_id: number | null;
  direction: "in" | "out";
  mode?: string;
  dwell_s?: number;
}

export interface AlertMsg {
  type: "alert";
  ts: number;
  camera_id: string;
  track_id: number | null;
  items: string[];
  all_items?: string[];
}

export interface CameraEventMsg {
  type: "camera";
  ts: number;
  camera_id: string;
  status: string;
  error?: string | null;
}

export interface ResetMsg {
  type: "reset";
  ts: number;
  camera_id: string;
}

export interface TrackMsg {
  type: "track";
  ts: number;
  camera_id: string;
  track_id: number | null;
  first_ts?: number;
  last_ts?: number;
  duration?: number;
  frames?: number;
  items?: Record<string, number>;
  alert?: boolean;
  first_side?: Side | null;
  last_side?: Side | null;
}

/** Client-tracked clock for a person still (or just) in frame. Key = PersonView.key. */
export interface LivePersonSession {
  key: string;
  cameraId: string;
  trackId: number | null;
  firstSeenTs: number;
  lastSeenTs: number;
  zoneEnterTs: number | null;
  /** True when zoneEnterTs was inferred from side=in without a crossing in. */
  zoneEstimated: boolean;
  lastSide: Side;
  sideSinceTs: number;
  lastDwellS: number | null;
  alertTs: number | null;
}

/** Finished visibility visit from a `track` message, optionally joined with zone dwell. */
export interface CompletedVisit {
  id: string;
  cameraId: string;
  trackId: number | null;
  firstTs: number;
  lastTs: number;
  duration: number;
  firstSide?: Side | null;
  lastSide?: Side | null;
  items: Record<string, number>;
  frames?: number;
  alert: boolean;
  dwellS?: number;
}

export interface ErrorMsg {
  type: "error";
  error: string;
}

export type FeedEvent = CrossingMsg | AlertMsg | CameraEventMsg | ResetMsg;

export type ServerMessage =
  | HelloMsg
  | StatusMsg
  | PeopleMsg
  | FeedEvent
  | TrackMsg
  | ErrorMsg
  | { type: "pong" | "subscribed" | "cameras_set"; [k: string]: unknown };

export type ConnState = "idle" | "connecting" | "open" | "retrying" | "closed";

export interface ConnInfo {
  state: ConnState;
  /** WebSocket close code when known. */
  code?: number;
  /** Seconds until the next reconnect attempt. */
  retryIn?: number;
  /** Human readable reason shown in the HUD. */
  note?: string;
}

/** A person with a stable key for the active camera. */
export interface PersonView extends Person {
  key: string;
  cameraId: string;
  index: number;
}
