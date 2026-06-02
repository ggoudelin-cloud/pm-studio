"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  Project, Task, Sprint, UserStory, ProjectPhase, Milestone,
  ProjectMember, MemberRole,
} from "@/types";
import toast from "react-hot-toast";

const DB = () => supabase.schema("hybridpm");

// ── Projects ────────────────────────────────────────────────────────────────
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await DB().from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: ["project", id],
    enabled: !!id,
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
  return useQuery({
    queryKey: ["tasks", projectId],
    enabled: !!projectId,
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
      toast.success("Tâche mise à jour !");
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
  return useQuery({
    queryKey: ["task-deps", projectId],
    enabled: !!projectId,
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

// ── Sprints ─────────────────────────────────────────────────────────────────
export function useSprints(projectId: string | null) {
  return useQuery({
    queryKey: ["sprints", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await DB().from("sprints").select("*").eq("project_id", projectId!).order("created_at");
      if (error) throw error;
      return data as Sprint[];
    },
  });
}

// ── User Stories ────────────────────────────────────────────────────────────
export function useUserStories(projectId: string | null) {
  return useQuery({
    queryKey: ["stories", projectId],
    enabled: !!projectId,
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
  return useQuery({
    queryKey: ["epics", projectId],
    enabled: !!projectId,
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

// ── Phases ──────────────────────────────────────────────────────────────────
export function usePhases(projectId: string | null) {
  return useQuery({
    queryKey: ["phases", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await DB().from("project_phases").select("*").eq("project_id", projectId!).order("position");
      if (error) throw error;
      return data as ProjectPhase[];
    },
  });
}

// ── Milestones ──────────────────────────────────────────────────────────────
export function useMilestones(projectId: string | null) {
  return useQuery({
    queryKey: ["milestones", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await DB().from("milestones").select("*").eq("project_id", projectId!).order("due_date");
      if (error) throw error;
      return data as Milestone[];
    },
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
  return useQuery({
    queryKey: ["notifications"],
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

// ── Team / Members ────────────────────────────────────────────────────────────
export function useProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: ["members", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("project_members")
        .select("*, profiles(id, full_name, job_title, email)")
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
      return { projectId };
    },
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["members", d.projectId] }); toast.success("Rôle mis à jour."); },
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
