"use client";
import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HardHat, RefreshCw } from "lucide-react";
import { ConstructionProvider, useConstruction, useCopy } from "./_lib/client";
import { InfoButton, State } from "./_components/Shared";
import s from "./construction.module.css";
function Shell({ children }: { children: React.ReactNode }) {
  const { workspace, project, projectId, select } = useConstruction();
  const { t } = useCopy();
  const pathname = usePathname();
  const links = [
    ["", "Genel Bakış", "Overview"],
    ["/progress", "İlerleme Takibi", "Progress"],
    ["/quality", "Kalite Kontrol", "Quality"],
    ["/claims", "Hakedişler", "Claims"],
    ["/budgets", "Maliyet Bütçesi", "Budget"],
    ["/review", "Kontrol ve Eksikler", "Review & Missing Data"],
  ];
  if (!workspace.data)
    return (
      <div className={s.page}>
        <State {...workspace} retry={() => void workspace.reload()} />
      </div>
    );
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <div className={s.eyebrow}>
            DND · {t("PROJE YÖNETİMİ", "PROJECT MANAGEMENT")}
          </div>
          <h1>
            <HardHat size={27} /> {t("İnşaat", "Construction")}
          </h1>
        </div>
        <div className={s.actions}>
          <select
            className={s.projectSelect}
            aria-label={t("Proje", "Project")}
            value={projectId}
            onChange={(e) => select(e.target.value)}
          >
            {workspace.data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <InfoButton title={t("Kaynaklar ve kapsam", "Sources and scope")}>
            <p>
              {t(
                "Perla ve Perla II ayrı projelerdir. İlerleme, kalite, hakediş ve bütçe ayrı hesaplanır. Hakediş tutarı banka ödemesi değildir.",
                "Perla and Perla II are separate projects. Progress, quality, claims and budgets are calculated separately. A claim is not a bank payment.",
              )}
            </p>
            <div className={s.sourceList}>
              {project.data?.sources.map((source) => (
                <article key={source.id}>
                  <strong>{source.fileName}</strong>
                  <p>{source.dateBasis}</p>
                  <small>
                    {t("Aktarım", "Imported")}:{" "}
                    {new Date(source.importedAt).toLocaleDateString("tr-TR")}
                  </small>
                </article>
              ))}
            </div>
            <p>
              {t(
                "Excel kaynakları korunur. Düzenlemeler kullanıcı ve gerekçeyle kaydedilir.",
                "Excel sources are retained. Changes record the user and reason.",
              )}
            </p>
          </InfoButton>
          <button
            className={s.icon}
            aria-label={t("Yenile", "Refresh")}
            title={t("Yenile", "Refresh")}
            disabled={workspace.loading || project.loading}
            onClick={() => {
              void workspace.reload();
              void project.reload();
            }}
          >
            <RefreshCw size={21} />
          </button>
        </div>
      </header>
      <nav
        className={s.subnav}
        aria-label={t("İnşaat sayfaları", "Construction pages")}
      >
        {links.map(([path, tr, en]) => (
          <Link
            key={path}
            href={`/construction${path}?project=${projectId}`}
            aria-current={
              path
                ? pathname.startsWith("/construction" + path)
                  ? "page"
                  : undefined
                : pathname === "/construction"
                  ? "page"
                  : undefined
            }
          >
            {t(tr, en)}
          </Link>
        ))}
      </nav>
      {workspace.data.projects.length === 0 ? (
        <p>
          {t(
            "Henüz inşaat verisi aktarılmadı.",
            "No construction data has been imported.",
          )}
        </p>
      ) : !workspace.data.projects.some((p) => p.id === projectId) ? (
        <p role="alert">
          {t(
            "Proje bulunamadı. Üstten proje seçin.",
            "Project not found. Select a project above.",
          )}
        </p>
      ) : (
        children
      )}
    </div>
  );
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p>Yükleniyor…</p>}>
      <ConstructionProvider>
        <Shell>{children}</Shell>
      </ConstructionProvider>
    </Suspense>
  );
}
