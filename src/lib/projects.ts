export const PROJECTS = [
  "LA_JOYA",
  "LA_JOYA_PERLA",
  "LA_JOYA_PERLA_II",
  "LAGOON_VERDE",
  "GECITKALE_1_ETAP",
] as const;

export type ProjectType = (typeof PROJECTS)[number];
export type ProjectCategory = "RESIDENTIAL" | "LAND";

export const PROJECT_META: Record<
  ProjectType,
  { label: string; category: ProjectCategory }
> = {
  LA_JOYA: { label: "La Joya", category: "RESIDENTIAL" },
  LA_JOYA_PERLA: { label: "La Joya Perla", category: "RESIDENTIAL" },
  LA_JOYA_PERLA_II: {
    label: "La Joya Perla II",
    category: "RESIDENTIAL",
  },
  LAGOON_VERDE: { label: "Lagoon Verde", category: "RESIDENTIAL" },
  GECITKALE_1_ETAP: { label: "Geçitkale 1. Etap", category: "LAND" },
};

export function projectLabel(project?: string | null) {
  if (!project) return "";
  return PROJECT_META[project as ProjectType]?.label || project;
}

export function isLandProject(project?: string | null) {
  return PROJECT_META[project as ProjectType]?.category === "LAND";
}

export function projectCategoryLabel(project: string, locale: string) {
  if (!isLandProject(project)) return "";
  return locale === "tr" ? "Arsa" : "Land";
}

export function projectOptionLabel(project: string, locale: string) {
  const category = projectCategoryLabel(project, locale);
  return category ? `${projectLabel(project)} · ${category}` : projectLabel(project);
}
