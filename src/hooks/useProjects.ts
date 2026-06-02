"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Project, Task, Sprint, UserStory, ProjectPhase, Milestone } from "@/types";
import toast from "react-hot-toast";

const DB = () => supabase.schema("hybridpm");

// --- Projects ---
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
      const { data, error } = await DB().from("projects").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Project;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Project> & { name: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await DB().from("projects").insert({ ...values, owner_id: user!.id }).select().single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projet créé !");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Project> & { id: string }) => {
      const { data, error } = await DB().from("projects").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["project", data.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projet mis à jour !");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// --- Tasks ---
export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: ["tasks", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("tasks")
        .select("*, profiles(full_name, avatar_url)")
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
      const { data, error } = await DB().from("tasks").insert(values).select().single();
      if (error) throw error;
      return data as Task;
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
      const { data, error } = await DB().from("tasks").update(values).eq("id", id).select().single();
      if (error) throw error;
      return { ...data, project_id } as Task;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks", data.project_id] });
      toast.success("Tâche mise à jour !");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// --- Sprints ---
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

// --- User Stories ---
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

// --- Phases Cycle en V ---
export function usePhases(projectId: string | null) {
  return useQuery({
    queryKey: ["phases", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("project_phases")
        .select("*")
        .eq("project_id", projectId!)
        .order("position");
      if (error) throw error;
      return data as ProjectPhase[];
    },
  });
}

// --- Milestones ---
export function useMilestones(projectId: string | null) {
  return useQuery({
    queryKey: ["milestones", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await DB()
        .from("milestones")
        .select("*")
        .eq("project_id", projectId!)
        .order("due_date");
      if (error) throw error;
      return data as Milestone[];
    },
  });
}
