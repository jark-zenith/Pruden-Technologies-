import type { User } from "@supabase/supabase-js";
import { requireSupabase } from "./supabase";
export type ProjectStatus = "planned" | "active" | "blocked" | "completed" | "archived";
export type TaskStatus = "planned" | "in_progress" | "blocked" | "completed" | "cancelled";
export type Priority = "low" | "medium" | "high" | "critical";
export type Project = { id:string; owner_id:string; name:string; description:string; status:ProjectStatus; priority:Priority; due_date:string|null; created_at:string; updated_at:string };
export type Task = { id:string; owner_id:string; project_id:string|null; title:string; description:string; status:TaskStatus; priority:Priority; assigned_to:string; due_date:string|null; created_at:string; updated_at:string };
function ownerId(user: User) { if (!user?.id) throw new Error("Sign in is required."); return user.id; }
export async function listProjects(user: User) { const {data,error}=await requireSupabase().from("pruden_projects").select("*").eq("owner_id",ownerId(user)).order("updated_at",{ascending:false}); if(error) throw error; return (data??[]) as Project[]; }
export async function createProject(user: User,input:Pick<Project,"name"|"description"|"status"|"priority"|"due_date">) { const name=input.name.trim(); if(!name||name.length>120) throw new Error("Project name must be 1–120 characters."); const {data,error}=await requireSupabase().from("pruden_projects").insert({...input,name,owner_id:ownerId(user)}).select("*").single(); if(error) throw error; await writeAudit(user,"project.created","project",data.id); return data as Project; }
export async function listTasks(user: User) { const {data,error}=await requireSupabase().from("pruden_tasks").select("*").eq("owner_id",ownerId(user)).order("created_at",{ascending:false}); if(error) throw error; return (data??[]) as Task[]; }
export async function createTask(user: User,input:Pick<Task,"title"|"description"|"project_id"|"status"|"priority"|"assigned_to"|"due_date">) { const title=input.title.trim(); if(!title||title.length>200) throw new Error("Task title must be 1–200 characters."); const {data,error}=await requireSupabase().from("pruden_tasks").insert({...input,title,owner_id:ownerId(user)}).select("*").single(); if(error) throw error; await writeAudit(user,"task.created","task",data.id); return data as Task; }
export async function updateTaskStatus(user: User,id:string,status:TaskStatus) { const {data,error}=await requireSupabase().from("pruden_tasks").update({status}).eq("id",id).eq("owner_id",ownerId(user)).select("*").single(); if(error) throw error; await writeAudit(user,"task.status_changed","task",id,{status}); return data as Task; }
export async function deleteProject(user: User,id:string) {
 const {error}=await requireSupabase().from("pruden_projects").delete().eq("id",id).eq("owner_id",ownerId(user));
 if(error) throw error;
 await writeAudit(user,"project.deleted","project",id);
}
export async function deleteTask(user: User,id:string) {
 const {error}=await requireSupabase().from("pruden_tasks").delete().eq("id",id).eq("owner_id",ownerId(user));
 if(error) throw error;
 await writeAudit(user,"task.deleted","task",id);
}
export async function listApprovals(user: User) { const {data,error}=await requireSupabase().from("pruden_approvals").select("*").eq("owner_id",ownerId(user)).order("created_at",{ascending:false}); if(error) throw error; return data??[]; }
async function writeAudit(user:User,action:string,entityType:string,entityId:string,details:Record<string,unknown>={}) { const {error}=await requireSupabase().from("pruden_audit_events").insert({owner_id:ownerId(user),actor_id:user.id,action,entity_type:entityType,entity_id:entityId,details}); if(error) throw error; }
