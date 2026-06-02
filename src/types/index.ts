export type Methodology = "cycle_v" | "agile" | "hybrid";
export type ProjectStatus = "draft" | "active" | "paused" | "closed";
export type TaskStatus = "todo" | "in_progress" | "review" | "blocked" | "done" | "cancelled";
export type MemberRole = "pm" | "pmo" | "dev" | "client" | "observer";
export type PhaseType =
  | "requirements" | "design" | "architecture"
  | "development" | "testing" | "validation"
  | "deployment" | "maintenance";

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
  methodology: Methodology | null;
  // Scores classification
  score_stability: number | null;
  score_complexity: number | null;
  score_doc_dependency: number | null;
  score_change_frequency: number | null;
  score_criticality: number | null;
  score_innovation: number | null;
  score_client_validation: number | null;
  score_team_experience: number | null;
  deadline_pressure: "low" | "medium" | "high" | null;
  // Résultats moteur
  decision_score_v: number | null;
  decision_score_agile: number | null;
  methodology_recommendation: Methodology | null;
  recommendation_reason: string | null;
  start_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
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
