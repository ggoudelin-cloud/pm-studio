"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import type {
  Project, Task, Sprint, UserStory, ProjectPhase, Milestone,
  ProjectMember, MemberRole, MepOperation, Committee, FlashReport,
  UoLog, SkillMatrixEntry, MilestoneTask,
} from "@/types";
import toast from "react-hot-toast";

const DB = () => supabase.schema("hybridpm");

// ── Projects ────────────────────────────────────────────────────────────────
export function useProjects() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["projects"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await DB().from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProject(id: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["project", id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await DB().from("projects").select("*").eq("id", id!).limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as Project | null;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Project> & { name: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await DB().from("projects").insert({ ...values, owner_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Projet créé !"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Project> & { id: string }) => {
      const { error } = await DB().from("projects").update(values).eq("id", id);
      if (error) throw error;
      return { id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["project", data.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projet mis à jour !");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Tasks ───────────────────────────────────────────────────────────────────
export function useTasks(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["tasks", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("tasks")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useMyTaskProjectIds() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["my-task-project-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("tasks")
        .select("project_id")
        .eq("assignee_id", user!.id);
      if (error) throw error;
      return [...new Set((data ?? []).map((t: { project_id: string }) => t.project_id))] as string[];
    },
  });
}

export function useMyTasks(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["my-tasks", projectId, user?.id],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("tasks")
        .select("*")
        .eq("project_id", projectId!)
        .eq("assignee_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Task> & { project_id: string; title: string }) => {
      const { error } = await DB().from("tasks").insert(values);
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks", data.project_id] });
      toast.success("Tâche créée !");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...values }: Partial<Task> & { id: string; project_id: string }) => {
      const { error } = await DB().from("tasks").update(values).eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks", data.project_id] });
      qc.invalidateQueries({ queryKey: ["my-tasks", data.project_id] });
      toast.success("Tâche mise à jour !");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTaskSilent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...values }: Partial<Task> & { id: string; project_id: string }) => {
      const { error } = await DB().from("tasks").update(values).eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks", data.project_id] });
      qc.invalidateQueries({ queryKey: ["my-tasks", data.project_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await DB().from("tasks").delete().eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks", data.project_id] });
      toast.success("Tâche supprimée.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Task Dependencies ───────────────────────────────────────────────────────
export function useTaskDependencies(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["task-deps", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("task_dependencies")
        .select("*");
      if (error) throw error;
      return data as { id: string; task_id: string; predecessor_id: string; lag_days: number }[];
    },
  });
}

export function useAddDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, predecessorId, lagDays = 0, projectId }: { taskId: string; predecessorId: string; lagDays?: number; projectId: string }) => {
      const { error } = await DB().from("task_dependencies").insert({ task_id: taskId, predecessor_id: predecessorId, lag_days: lagDays });
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["task-deps", d.projectId] }); toast.success("Dépendance ajoutée."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveDependency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await DB().from("task_dependencies").delete().eq("id", id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["task-deps", d.projectId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Milestone ↔ Task links ──────────────────────────────────────────────────
export function useMilestoneTasks(milestoneId: string | null) {
  return useQuery({
    queryKey: ["milestone-tasks", milestoneId],
    enabled: !!milestoneId,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("milestone_tasks")
        .select("*")
        .eq("milestone_id", milestoneId!);
      if (error) throw error;
      return data as MilestoneTask[];
    },
  });
}

export function useTaskMilestones(taskId: string | null) {
  return useQuery({
    queryKey: ["task-milestones", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("milestone_tasks")
        .select("*, milestones(id, title, due_date, status)")
        .eq("task_id", taskId!);
      if (error) throw error;
      return data as (MilestoneTask & { milestones: { id: string; title: string; due_date: string | null; status: string } })[];
    },
  });
}

export function useAddMilestoneTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ milestoneId, taskId }: { milestoneId: string; taskId: string }) => {
      const { error } = await DB().from("milestone_tasks").insert({ milestone_id: milestoneId, task_id: taskId });
      if (error) throw error;
      return { milestoneId, taskId };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["milestone-tasks", d.milestoneId] });
      qc.invalidateQueries({ queryKey: ["task-milestones", d.taskId] });
      toast.success("Tâche rattachée au jalon.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveMilestoneTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, milestoneId, taskId }: { id: string; milestoneId: string; taskId: string }) => {
      const { error } = await DB().from("milestone_tasks").delete().eq("id", id);
      if (error) throw error;
      return { milestoneId, taskId };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["milestone-tasks", d.milestoneId] });
      qc.invalidateQueries({ queryKey: ["task-milestones", d.taskId] });
      toast.success("Tâche retirée du jalon.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Sprints ─────────────────────────────────────────────────────────────────
export function useSprints(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["sprints", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB().from("sprints").select("*").eq("project_id", projectId!).order("created_at");
      if (error) throw error;
      return data as Sprint[];
    },
  });
}

// ── User Stories ────────────────────────────────────────────────────────────
export function useUserStories(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["stories", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("user_stories")
        .select("*, epics(title, color)")
        .eq("project_id", projectId!)
        .order("priority", { ascending: false });
      if (error) throw error;
      return data as UserStory[];
    },
  });
}

// ── Epics ───────────────────────────────────────────────────────────────────
export function useEpics(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["epics", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB().from("epics").select("*").eq("project_id", projectId!).order("created_at");
      if (error) throw error;
      return data as import("@/types").Epic[];
    },
  });
}

export function useCreateEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { project_id: string; title: string; description?: string; color?: string }) => {
      const { error } = await DB().from("epics").insert({ ...values, color: values.color ?? "#6366f1", status: "open" });
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["epics", d.project_id] }); toast.success("Epic créé !"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...values }: Partial<import("@/types").Epic> & { id: string; project_id: string }) => {
      const { error } = await DB().from("epics").update(values).eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["epics", d.project_id] }); toast.success("Epic mis à jour."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await DB().from("epics").delete().eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["epics", d.project_id] }); toast.success("Epic supprimé."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── User Story update ────────────────────────────────────────────────────────
export function useUpdateUserStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...values }: Partial<UserStory> & { id: string; project_id: string }) => {
      const { error } = await DB().from("user_stories").update(values).eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["stories", d.project_id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Sprints create / update ──────────────────────────────────────────────────
export function useCreateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { project_id: string; name: string; goal?: string; start_date?: string; end_date?: string; velocity_planned?: number }) => {
      const { error } = await DB().from("sprints").insert({
        ...values,
        status: "planned",
        velocity_planned: values.velocity_planned ?? 0,
        velocity_achieved: 0,
      });
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["sprints", d.project_id] }); toast.success("Sprint créé !"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSprint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...values }: Partial<Sprint> & { id: string; project_id: string }) => {
      const { error } = await DB().from("sprints").update(values).eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["sprints", d.project_id] }); toast.success("Sprint mis à jour."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Phases ──────────────────────────────────────────────────────────────────
export function usePhases(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["phases", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB().from("project_phases").select("*").eq("project_id", projectId!).order("position");
      if (error) throw error;
      return data as ProjectPhase[];
    },
  });
}

// ── Milestones ──────────────────────────────────────────────────────────────
export function useMilestones(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["milestones", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB().from("milestones").select("*").eq("project_id", projectId!).order("due_date");
      if (error) throw error;
      return data as Milestone[];
    },
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...values }: Partial<Milestone> & { id: string; project_id: string }) => {
      const { error } = await DB().from("milestones").update(values).eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["milestones", d.project_id] }); toast.success("Jalon mis à jour."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await DB().from("milestones").delete().eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["milestones", d.project_id] }); toast.success("Jalon supprimé."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { project_id: string; title: string; due_date?: string; description?: string; phase_id?: string }) => {
      const { error } = await DB().from("milestones").insert({ ...values, status: "pending" });
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["milestones", d.project_id] }); toast.success("Jalon créé !"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Deliverables ─────────────────────────────────────────────────────────────
export function useDeliverables(projectId: string | null) {
  return useQuery({
    queryKey: ["deliverables", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await DB().from("deliverables").select("*").eq("project_id", projectId!).order("created_at");
      if (error) throw error;
      return data as import("@/types").Deliverable[];
    },
  });
}

export function useCreateDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { project_id: string; title: string; description?: string; phase_id?: string; file_url?: string }) => {
      const { error } = await DB().from("deliverables").insert({ ...values, status: "draft" });
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["deliverables", d.project_id] }); toast.success("Livrable créé !"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...values }: Partial<import("@/types").Deliverable> & { id: string; project_id: string }) => {
      const { error } = await DB().from("deliverables").update(values).eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["deliverables", d.project_id] }); toast.success("Livrable mis à jour."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Retrospectives ───────────────────────────────────────────────────────────
export function useRetrospectives(projectId: string | null) {
  return useQuery({
    queryKey: ["retros", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await DB().from("retrospectives").select("*").eq("project_id", projectId!).order("held_at", { ascending: false });
      if (error) throw error;
      return data as import("@/types").Retrospective[];
    },
  });
}

export function useCreateRetrospective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { project_id: string; sprint_id: string; went_well?: string[]; to_improve?: string[]; action_items?: string[]; happiness_score?: number; held_at?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await DB().from("retrospectives").insert({ ...values, created_by: user!.id, held_at: values.held_at ?? new Date().toISOString() });
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["retros", d.project_id] }); toast.success("Rétrospective créée !"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateRetrospective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...values }: Partial<import("@/types").Retrospective> & { id: string; project_id: string }) => {
      const { error } = await DB().from("retrospectives").update(values).eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["retros", d.project_id] }); toast.success("Rétrospective mise à jour."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Comments ──────────────────────────────────────────────────────────────────
export function useComments(entityId: string | null) {
  return useQuery({
    queryKey: ["comments", entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("comments")
        .select("*, profiles:author_id(full_name, email)")
        .eq("entity_id", entityId!)
        .order("created_at");
      if (error) throw error;
      return data as import("@/types").Comment[];
    },
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, entityType, entityId, content }: { projectId: string; entityType: string; entityId: string; content: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await DB().from("comments").insert({ project_id: projectId, author_id: user!.id, entity_type: entityType, entity_id: entityId, content });
      if (error) throw error;
      return { entityId };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["comments", d.entityId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function useNotifications() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["notifications"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await DB().from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data as import("@/types").Notification[];
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await DB().from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await DB().from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notifications"] }); },
  });
}

// ── Team / Members ────────────────────────────────────────────────────────────
export function useMyMemberships() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["my-memberships"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("project_members")
        .select("project_id, role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as { project_id: string; role: MemberRole }[];
    },
  });
}

export function useMyRoleInProject(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["my-role", projectId, user?.id],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("project_members")
        .select("role")
        .eq("project_id", projectId!)
        .eq("user_id", user!.id)
        .limit(1);
      if (error) throw error;
      return (data?.[0]?.role ?? null) as MemberRole | null;
    },
  });
}

export function useProjectMembers(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["members", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("project_members")
        .select("*, profiles!project_members_user_profiles_fkey(id, full_name, job_title, email)")
        .eq("project_id", projectId!);
      if (error) throw error;
      return data as (ProjectMember & { profiles: { id: string; full_name: string | null; job_title: string | null; email: string | null } })[];
    },
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, email, role }: { projectId: string; email: string; role: MemberRole }) => {
      const { data, error } = await supabase.schema("hybridpm").rpc("find_user_by_email", { p_email: email });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Aucun utilisateur trouvé avec cet email.");
      const { error: ie } = await DB().from("project_members").insert({ project_id: projectId, user_id: data[0].id, role });
      if (ie) throw ie;
      return { projectId };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["members", d.projectId] }); toast.success("Membre ajouté !"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, projectId }: { memberId: string; projectId: string }) => {
      const { error } = await DB().from("project_members").delete().eq("id", memberId);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["members", d.projectId] }); toast.success("Membre retiré."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, projectId, role }: { memberId: string; projectId: string; role: MemberRole }) => {
      const { error } = await DB().from("project_members").update({ role }).eq("id", memberId);
      if (error) throw error;
      return { projectId, memberId, role };
    },
    onMutate: async ({ memberId, projectId, role }) => {
      await qc.cancelQueries({ queryKey: ["members", projectId] });
      const prev = qc.getQueryData(["members", projectId]);
      qc.setQueryData(["members", projectId], (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((m: { id: string }) => m.id === memberId ? { ...m, role } : m);
      });
      return { prev, projectId };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx) qc.setQueryData(["members", ctx.projectId], ctx.prev);
      toast.error(e.message);
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["members", d.projectId] });
      toast.success("Rôle mis à jour.");
    },
  });
}

// ── Project Costs ─────────────────────────────────────────────────────────────
export function useProjectCosts(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["costs", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB().from("project_costs").select("*").eq("project_id", projectId!).order("category").order("created_at");
      if (error) throw error;
      return data as import("@/types").ProjectCost[];
    },
  });
}

export function useCreateCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<import("@/types").ProjectCost, "id" | "created_at" | "updated_at">) => {
      const { error } = await DB().from("project_costs").insert(values);
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["costs", d.project_id] }); toast.success("Coût ajouté !"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...values }: Partial<import("@/types").ProjectCost> & { id: string; project_id: string }) => {
      const { error } = await DB().from("project_costs").update(values).eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["costs", d.project_id] }); toast.success("Coût mis à jour."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await DB().from("project_costs").delete().eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["costs", d.project_id] }); toast.success("Coût supprimé."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Traceability ──────────────────────────────────────────────────────────────
export function useTraceability(projectId: string | null) {
  return useQuery({
    queryKey: ["traceability", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await DB().from("traceability").select("*").eq("project_id", projectId!).order("created_at");
      if (error) throw error;
      return data as import("@/types").TraceabilityLink[];
    },
  });
}

export function useCreateTraceabilityLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { project_id: string; requirement_id?: string; test_case_id?: string; link_type: string }) => {
      const { error } = await DB().from("traceability").insert(values);
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["traceability", d.project_id] }); toast.success("Lien créé."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Project Risks ─────────────────────────────────────────────────────────────
export function useProjectRisks(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["risks", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("project_risks")
        .select("*, profiles:owner_id(full_name, email)")
        .eq("project_id", projectId!)
        .order("weight", { ascending: false });
      if (error) throw error;
      return data as (import("@/types").ProjectRisk & { profiles: { full_name: string | null; email: string | null } | null })[];
    },
  });
}

export function useCreateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<import("@/types").ProjectRisk, "id" | "weight" | "created_at" | "updated_at">) => {
      const { error } = await DB().from("project_risks").insert(values);
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["risks", d.project_id] }); toast.success("Risque créé !"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...values }: Partial<import("@/types").ProjectRisk> & { id: string; project_id: string }) => {
      const { error } = await DB().from("project_risks").update(values).eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["risks", d.project_id] }); toast.success("Risque mis à jour."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await DB().from("project_risks").delete().eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["risks", d.project_id] }); toast.success("Risque supprimé."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── MEP — Mises En Production ─────────────────────────────────────────────────
export function useMepOperations(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["mep", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("mep_operations")
        .select("*")
        .eq("project_id", projectId!)
        .order("planned_date", { ascending: false });
      if (error) throw error;
      return data as MepOperation[];
    },
  });
}

export function useCreateMep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<MepOperation, "id" | "created_at" | "updated_at" | "chronogram" | "incidents" | "action_plans"> & { project_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await DB().from("mep_operations").insert({ ...values, created_by: user!.id, chronogram: [], incidents: [], action_plans: [] });
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["mep", d.project_id] }); toast.success("MEP créée !"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateMep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...values }: Partial<MepOperation> & { id: string; project_id: string }) => {
      const { error } = await DB().from("mep_operations").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["mep", d.project_id] }); toast.success("MEP mise à jour."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteMep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await DB().from("mep_operations").delete().eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["mep", d.project_id] }); toast.success("MEP supprimée."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Comitologie ───────────────────────────────────────────────────────────────
export function useCommittees(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["committees", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("committees")
        .select("*")
        .eq("project_id", projectId!)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data as Committee[];
    },
  });
}

export function useCreateCommittee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<Committee, "id" | "created_at" | "updated_at" | "attendees" | "action_items"> & { project_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await DB().from("committees").insert({ ...values, created_by: user!.id, attendees: [], action_items: [] });
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["committees", d.project_id] }); toast.success("Comité créé !"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCommittee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...values }: Partial<Committee> & { id: string; project_id: string }) => {
      const { error } = await DB().from("committees").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["committees", d.project_id] }); toast.success("Comité mis à jour."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCommittee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await DB().from("committees").delete().eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["committees", d.project_id] }); toast.success("Comité supprimé."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Rapport Flash ─────────────────────────────────────────────────────────────
export function useFlashReports(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["flash-reports", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("flash_reports")
        .select("*")
        .eq("project_id", projectId!)
        .order("year", { ascending: false })
        .order("week_number", { ascending: false });
      if (error) throw error;
      return data as FlashReport[];
    },
  });
}

export function useCreateFlashReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<FlashReport, "id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await DB().from("flash_reports").insert({ ...values, created_by: user!.id });
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["flash-reports", d.project_id] }); toast.success("Rapport Flash créé !"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateFlashReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id, ...values }: Partial<FlashReport> & { id: string; project_id: string }) => {
      const { error } = await DB().from("flash_reports").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["flash-reports", d.project_id] }); toast.success("Rapport Flash mis à jour."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── UO Logs ───────────────────────────────────────────────────────────────────
export function useUoLogs(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["uo-logs", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("uo_logs")
        .select("*")
        .eq("project_id", projectId!)
        .order("year")
        .order("month");
      if (error) throw error;
      return data as UoLog[];
    },
  });
}

export function useAllUoLogs() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["uo-logs-all"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("uo_logs")
        .select("*")
        .order("year")
        .order("month");
      if (error) throw error;
      return data as UoLog[];
    },
  });
}

export function useUpsertUoLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<UoLog, "id" | "created_at">) => {
      const { error } = await DB().from("uo_logs").upsert(values, { onConflict: "project_id,month,year" });
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["uo-logs", d.project_id] });
      qc.invalidateQueries({ queryKey: ["uo-logs-all"] });
      toast.success("UO mis à jour.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Matrice de compétences ────────────────────────────────────────────────────
export function useSkillMatrix(projectId: string | null) {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["skills", projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("skill_matrix")
        .select("*")
        .eq("project_id", projectId!)
        .order("skill_name");
      if (error) throw error;
      return data as SkillMatrixEntry[];
    },
  });
}

export function useUpsertSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Omit<SkillMatrixEntry, "id" | "created_at" | "updated_at">) => {
      const { error } = await DB().from("skill_matrix").upsert({ ...values, updated_at: new Date().toISOString() }, { onConflict: "project_id,member_id,skill_name" });
      if (error) throw error;
      return { project_id: values.project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["skills", d.project_id] }); toast.success("Compétence mise à jour."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      const { error } = await DB().from("skill_matrix").delete().eq("id", id);
      if (error) throw error;
      return { project_id };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["skills", d.project_id] }); toast.success("Compétence supprimée."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── All milestones cross-project (portefeuille PMO) ───────────────────────────
export function useAllMilestones() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["milestones-all"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("milestones")
        .select("*, projects(id, name)")
        .order("due_date");
      if (error) throw error;
      return data as (Milestone & { projects: { id: string; name: string } | null })[];
    },
  });
}

// ── All project costs cross-project ──────────────────────────────────────────
export function useAllProjectCosts() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ["costs-all"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await DB().from("project_costs").select("*");
      if (error) throw error;
      return data as import("@/types").ProjectCost[];
    },
  });
}

// ── Save baseline Gantt (copie start/due → baseline_start/end) ────────────────
export function useSaveBaseline(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) return null;
      const { data: tasks, error } = await DB()
        .from("tasks")
        .select("id, start_date, due_date")
        .eq("project_id", projectId);
      if (error) throw error;
      await Promise.all(
        (tasks ?? []).map(t =>
          DB().from("tasks").update({
            baseline_start: t.start_date ?? null,
            baseline_end:   t.due_date   ?? null,
          }).eq("id", t.id)
        )
      );
      return projectId;
    },
    onSuccess: (pid) => {
      if (pid) qc.invalidateQueries({ queryKey: ["tasks", pid] });
      toast.success("Baseline sauvegardée !");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
