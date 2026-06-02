"use client";

import { useState } from "react";
import { useComments, useAddComment } from "@/hooks/useProjects";
import { useAuthStore } from "@/stores/auth";
import { MessageSquare, Send } from "lucide-react";

interface CommentsProps {
  projectId: string;
  entityType: string;
  entityId: string;
}

export default function Comments({ projectId, entityType, entityId }: CommentsProps) {
  const { data: comments = [], isLoading } = useComments(entityId);
  const addComment = useAddComment();
  const { user } = useAuthStore();
  const [text, setText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await addComment.mutateAsync({ projectId, entityType, entityId, content: text.trim() });
    setText("");
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" /> Commentaires ({comments.length})
      </p>

      {isLoading ? (
        <div className="py-3 flex justify-center"><div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-xs text-slate-600 italic">Aucun commentaire pour l&apos;instant.</p>
          )}
          {comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 bg-indigo-600/30 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-indigo-300">
                  {(c.profiles?.full_name ?? c.profiles?.email ?? "?")[0].toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-slate-300">{c.profiles?.full_name ?? c.profiles?.email ?? "Utilisateur"}</span>
                  <span className="text-xs text-slate-600">{new Date(c.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="w-7 h-7 bg-indigo-600/30 rounded-full flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-indigo-300">{(user?.email ?? "?")[0].toUpperCase()}</span>
        </div>
        <div className="flex-1 flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Ajouter un commentaire…"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" disabled={!text.trim() || addComment.isPending}
            className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
