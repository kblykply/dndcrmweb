"use client";
import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { authedFetch } from "@/lib/authedFetch";
import { errorText, type Copy } from "../_lib/copy";
import type { Project, Workspace, Member } from "../_lib/types";
import Modal from "./Modal";
import WorkInfo, { WorkField } from "./WorkInfo";
import s from "../work.module.css";
export default function ProjectForm({
  copy: c,
  workspace,
  project,
  onClose,
  onSaved,
}: {
  copy: Copy;
  workspace: Workspace;
  project?: Project;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [name, setName] = useState(project?.name || "");
  const [key, setKey] = useState(project?.key || "");
  const [description, setDescription] = useState(project?.description || "");
  const [department, setDepartment] = useState(project?.departmentId || "");
  const [color, setColor] = useState(project?.color || "#147d73");
  const [members, setMembers] = useState<
    { userId: string; role: Member["role"] }[]
  >(project?.members.map(({ userId, role }) => ({ userId, role })) || []);
  const [person, setPerson] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const ownerId = project?.ownerId || workspace.me?.id;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await authedFetch(
        "/tasks/projects" + (project ? "/" + project.id : ""),
        {
          method: project ? "PATCH" : "POST",
          body: JSON.stringify({
            key,
            name,
            description,
            color,
            departmentId: department || null,
            members,
            ...(project ? { version: project.version } : {}),
          }),
        },
      );
      onSaved(result.id);
    } catch (error) {
      setError(errorText(error, c));
      setSaving(false);
    }
  }
  return (
    <Modal
      title={project ? c.settings : c.newProject}
      help={<WorkInfo topic="projects" />}
      closeLabel={c.close}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <form className={s.form} onSubmit={submit}>
        <fieldset disabled={saving}>
          {error && (
            <div className={s.error} role="alert">
              {error}
            </div>
          )}
          <label className={s.field}>
            {c.name}
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </label>
          <div className={s.formGrid}>
            <WorkField label={c.key} topic="projects">
              <input
                required
                pattern="[A-Z][A-Z0-9]{1,9}"
                maxLength={10}
                value={key}
                onChange={(e) =>
                  setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
                placeholder="OPS"
              />
            </WorkField>
            <WorkField label={c.department} topic="projects">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">{c.noDepartment}</option>
                {workspace.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </WorkField>
          </div>
          <label className={s.field}>
            {c.description}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
            />
          </label>
          <label className={s.field}>
            {c.color}
            <input
              className={s.colorInput}
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
          <div className={s.sectionHeader}>
            <div className={s.helpHeading}>
              <h3>{c.access}</h3>
              <WorkInfo topic="access" />
            </div>
            <span className={s.muted}>
              {c.owner}: {project?.owner.name || workspace.me?.name}
            </span>
          </div>
          <div className={s.memberList}>
            {members.map((member) => (
              <div className={s.memberRow} key={member.userId}>
                <span>
                  {workspace.users.find((u) => u.id === member.userId)?.name ||
                    project?.members.find((m) => m.userId === member.userId)
                      ?.user.name ||
                    member.userId}
                </span>
                <select
                  aria-label={c.role}
                  value={member.role}
                  onChange={(e) =>
                    setMembers(
                      members.map((m) =>
                        m.userId === member.userId
                          ? { ...m, role: e.target.value as Member["role"] }
                          : m,
                      ),
                    )
                  }
                >
                  <option value="LEAD">{c.lead}</option>
                  <option value="MEMBER">{c.member}</option>
                  <option value="VIEWER">{c.viewer}</option>
                </select>
                <button
                  className={s.iconButton}
                  type="button"
                  title={c.remove}
                  aria-label={c.remove}
                  onClick={() =>
                    setMembers(
                      members.filter((m) => m.userId !== member.userId),
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className={s.inlineForm}>
            <select
              aria-label={c.chooseMember}
              value={person}
              onChange={(e) => setPerson(e.target.value)}
            >
              <option value="">{c.chooseMember}</option>
              {workspace.users
                .filter(
                  (u) =>
                    u.id !== ownerId && !members.some((m) => m.userId === u.id),
                )
                .map((u) => (
                  <option value={u.id} key={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className={s.button}
              disabled={!person}
              onClick={() => {
                setMembers([...members, { userId: person, role: "MEMBER" }]);
                setPerson("");
              }}
            >
              <Plus size={16} />
              {c.addMember}
            </button>
          </div>
          <footer className={s.formFooter}>
            <button className={s.button} type="button" onClick={onClose}>
              {c.cancel}
            </button>
            <button className={s.primary} type="submit">
              <Save size={16} />
              {saving ? c.saving : c.save}
            </button>
          </footer>
        </fieldset>
      </form>
    </Modal>
  );
}
