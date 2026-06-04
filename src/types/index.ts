export type Methodology = "cycle_v" | "agile" | "hybrid";
export type ProjectStatus = "draft" | "active" | "paused" | "closed";
export type TaskStatus = "todo" | "in_progress" | "review" | "blocked" | "done" | "cancelled";
export type MemberRole = "pm" | "pmo" | "dev" | "client" | "observer";
export type PhaseType =
  | "requirements" | "design" | "architecture"
  | "development" | "testing" | "validation"
  | "deployment" | "maintenance";
export type ComplexityLevel = "simple" | "medium" | "high" | "critical";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  organization: string | null;
  email: string | null;
  daily_rate_ht: number | null;
  daily_rate_ttc: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  domain: string | null;
  status: ProjectStatus;
  methodology_recommended: Methodology | null;
  methodology_applied: Methodology | null;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  complexity_level: ComplexityLevel | null;
  uo_value: number | null;
  context_team_size: number | null;
  context_domain_maturity: number | null;
  context_client_proximity: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  profiles?: Profile;
}

export interface Task {
  id: string;
  project_id: string;
  parent_task_id: string | null;
  title: string;
  description: string | null;
  assignee_id: string | null;
  status: TaskStatus;
  priority: number;
  progress_pct: number;
  methodology: Methodology | null;
  score_stability: number | null;
  score_complexity: number | null;
  score_doc_dependency: number | null;
  score_change_frequency: number | null;
  score_criticality: number | null;
  score_innovation: number | null;
  score_client_validation: number | null;
  score_team_experience: number | null;
  deadline_pressure: "low" | "medium" | "high" | null;
  decision_score_v: number | null;
  decision_score_agile: number | null;
  methodology_recommendation: Methodology | null;
  recommendation_reason: string | null;
  start_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  allocation_pct: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export type RiskCategory = "technical" | "schedule" | "budget" | "resource" | "quality" | "other";
export type RiskStatus   = "open" | "mitigated" | "closed" | "occurred";

export interface ProjectRisk {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  category: RiskCategory;
  probability: number;
  impact: number;
  weight: number;
  status: RiskStatus;
  mitigation: string | null;
  owner_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Epic {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  color: string;
  status: "open" | "in_progress" | "closed";
  created_at: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "planned" | "active" | "completed" | "cancelled";
  velocity_planned: number;
  velocity_achieved: number;
  created_at: string;
}

export interface UserStory {
  id: string;
  project_id: string;
  epic_id: string | null;
  sprint_id: string | null;
  title: string;
  persona: string | null;
  goal: string | null;
  benefit: string | null;
  acceptance_criteria: string | null;
  story_points: number | null;
  status: "backlog" | "planned" | "in_progress" | "done" | "cancelled";
  priority: number;
  created_at: string;
  updated_at: string;
  epics?: Epic;
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  phase_type: PhaseType;
  name: string;
  description: string | null;
  status: "pending" | "active" | "gate_review" | "completed" | "rejected";
  position: number;
  started_at: string | null;
  completed_at: string | null;
  validation_required: boolean;
  validated_by: string | null;
  validated_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  phase_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  achieved_at: string | null;
  status: "pending" | "achieved" | "missed";
  created_at: string;
}

export interface MilestoneTask {
  id: string;
  milestone_id: string;
  task_id: string;
  created_at: string;
}

export interface MethodologyDecision {
  id: string;
  project_id: string;
  task_id: string | null;
  decided_by: string;
  recommended: Methodology;
  applied: Methodology;
  was_overridden: boolean;
  override_reason: string | null;
  score_v: number | null;
  score_agile: number | null;
  criteria_snapshot: Record<string, number> | null;
  decided_at: string;
}

export interface Deliverable {
  id: string;
  project_id: string;
  phase_id: string | null;
  title: string;
  description: string | null;
  file_url: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Retrospective {
  id: string;
  sprint_id: string;
  project_id: string;
  went_well: string[] | null;
  to_improve: string[] | null;
  action_items: string[] | null;
  happiness_score: number | null;
  held_at: string;
  created_by: string;
}

export interface Comment {
  id: string;
  project_id: string;
  author_id: string;
  entity_type: string;
  entity_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null; email: string | null };
}

export interface Notification {
  id: string;
  user_id: string;
  project_id: string | null;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  link: string | null;
  created_at: string;
}

export type CostCategory = "human" | "software" | "infrastructure" | "other";

export interface ProjectCost {
  id: string;
  project_id: string;
  category: CostCategory;
  label: string;
  unit: string;
  quantity: number;
  unit_cost_ht: number;
  vat_rate: number;
  member_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TraceabilityLink {
  id: string;
  project_id: string;
  requirement_id: string | null;
  test_case_id: string | null;
  link_type: string;
  created_at: string;
}

export interface KanbanCard {
  id: string;
  project_id: string;
  task_id: string | null;
  story_id: string | null;
  column_name: "todo" | "in_progress" | "review" | "blocked" | "done";
  position: number;
  wip_limit: number | null;
  created_at: string;
}

// ── Nouveaux types CDC CPP ────────────────────────────────────────────────────

export type MepStatus = "planned" | "go" | "nogo" | "in_progress" | "pss" | "psc" | "completed" | "cancelled" | "incident";
export type MepEnvironment = "dev" | "integration" | "preprod" | "production";

export interface ChronogramStep {
  id: string;
  time: string;
  label: string;
  done: boolean;
  incident?: string;
}

export interface MepOperation {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  planned_date: string | null;
  execution_date: string | null;
  environment: MepEnvironment;
  is_hno: boolean;
  status: MepStatus;
  go_nogo_decision: "go" | "nogo" | null;
  go_nogo_reason: string | null;
  go_nogo_decided_by: string | null;
  go_nogo_at: string | null;
  chronogram: ChronogramStep[];
  incidents: string[];
  action_plans: string[];
  bilan: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CommitteeType = "copil" | "comev" | "cab" | "rcc" | "rci" | "weekly" | "other";
export type CommitteeStatus = "scheduled" | "held" | "cancelled";

export interface CommitteeActionItem {
  id: string;
  label: string;
  owner: string;
  due_date: string;
  done: boolean;
}

export interface Committee {
  id: string;
  project_id: string | null;
  title: string;
  committee_type: CommitteeType;
  scheduled_at: string | null;
  held_at: string | null;
  status: CommitteeStatus;
  agenda: string | null;
  minutes: string | null;
  attendees: string[];
  action_items: CommitteeActionItem[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlashReport {
  id: string;
  project_id: string;
  week_number: number | null;
  year: number | null;
  general_info: string | null;
  check_rssi: boolean;
  check_design_authority: boolean;
  check_test_strategy: boolean;
  check_industrialization: boolean;
  check_comev: boolean;
  check_pv_recette: boolean;
  environments_status: Record<string, string>;
  alerts: string | null;
  next_actions: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UoLog {
  id: string;
  project_id: string;
  month: number;
  year: number;
  uo_consumed: number;
  uo_planned: number;
  notes: string | null;
  created_at: string;
}

export type SkillLevel = "knowledge" | "medium" | "advanced" | "mastery" | "expert";

export interface SkillMatrixEntry {
  id: string;
  project_id: string;
  member_id: string;
  skill_name: string;
  skill_level: SkillLevel;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
