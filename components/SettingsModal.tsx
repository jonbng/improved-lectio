import { useEffect, useRef, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import { browser } from "wxt/browser";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FeatureToggle } from "@/components/settings/FeatureToggle";
import { SettingsSection } from "@/components/settings/SettingsSection";
import {
  getSettings,
  saveSettings,
  resetSettings,
  clearAllData,
  requiresReload,
  type FeatureSettings,
} from "@/lib/settings-storage";
import { clearPictureCache, getStarredPeople, getRecentPeople } from "@/lib/findskema-storage";
import {
  Info,
  Github,
  Bug,
  Palette,
  Wrench,
  ExternalLink,
  X,
  Chrome,
  Monitor,
  Calendar,
  PanelLeft,
  Zap,
} from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navItems = [
  { id: "appearance", name: "Udseende", icon: Palette },
  { id: "behavior", name: "Adfærd", icon: Zap },
  { id: "sidebar", name: "Sidebar", icon: PanelLeft },
  { id: "advanced", name: "Avanceret", icon: Wrench },
  { id: "about", name: "Om", icon: Info },
];

const VERSION_STORAGE_KEY = "betterlectio_version_info";

interface VersionInfo {
  version: string;
  firstInstalledAt: string;
  lastUpdatedAt: string;
}

function getVersionInfo(currentVersion: string): VersionInfo {
  try {
    const stored = localStorage.getItem(VERSION_STORAGE_KEY);
    if (stored) {
      const info = JSON.parse(stored);
      const firstInstalledAt = info.firstInstalledAt || info.installedAt || new Date().toISOString();

      if (info.version === currentVersion) {
        return {
          version: currentVersion,
          firstInstalledAt,
          lastUpdatedAt: info.lastUpdatedAt || firstInstalledAt,
        };
      }

      const updatedInfo: VersionInfo = {
        version: currentVersion,
        firstInstalledAt,
        lastUpdatedAt: new Date().toISOString(),
      };
      localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(updatedInfo));
      return updatedInfo;
    }
  } catch {
    // Ignore parse errors
  }

  const now = new Date().toISOString();
  const newInfo: VersionInfo = {
    version: currentVersion,
    firstInstalledAt: now,
    lastUpdatedAt: now,
  };
  localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(newInfo));
  return newInfo;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) {
    const match = ua.match(/Firefox\/(\d+)/);
    return `Firefox ${match?.[1] ?? ""}`;
  }
  if (ua.includes("Edg/")) {
    const match = ua.match(/Edg\/(\d+)/);
    return `Edge ${match?.[1] ?? ""}`;
  }
  if (ua.includes("Chrome")) {
    const match = ua.match(/Chrome\/(\d+)/);
    return `Chrome ${match?.[1] ?? ""}`;
  }
  if (ua.includes("Safari")) {
    const match = ua.match(/Version\/(\d+)/);
    return `Safari ${match?.[1] ?? ""}`;
  }
  return "Ukendt";
}

function getOSInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Windows NT 10")) return "Windows 10/11";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS X")) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    if (match) {
      return `macOS ${match[1].replace("_", ".")}`;
    }
    return "macOS";
  }
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iOS")) return "iOS";
  return "Ukendt";
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const manifest = browser.runtime.getManifest();
  const version = manifest.version;
  const logoUrl = browser.runtime.getURL("/assets/logo-transparent.svg");
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState("appearance");
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [settings, setSettings] = useState<FeatureSettings>(() => getSettings());

  // Get version info on mount
  useEffect(() => {
    setVersionInfo(getVersionInfo(version));
  }, [version]);

  // Reload settings when modal opens
  useEffect(() => {
    if (open) {
      setSettings(getSettings());
    }
  }, [open]);

  // Handle escape key and focus trap
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    contentRef.current?.focus();

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const activeName = navItems.find((item) => item.id === activeSection)?.name ?? "Om";

  const browserInfo = getBrowserInfo();
  const osInfo = getOSInfo();
  const screenDimensions = `${window.screen.width} × ${window.screen.height}`;

  const handleSettingChange = <K extends keyof Omit<FeatureSettings, 'version'>>(
    category: K,
    key: keyof FeatureSettings[K],
    value: boolean
  ) => {
    const newSettings = { ...settings };
    (newSettings[category] as Record<string, boolean>)[key as string] = value;
    setSettings(newSettings);
    saveSettings(newSettings);

    // Show reload toast if this setting requires it
    if (requiresReload(category, key as string)) {
      toast("Indstillingen træder i kraft efter genindlæsning", {
        action: {
          label: "Genindlæs",
          onClick: () => window.location.reload(),
        },
        duration: 5000,
      });
    }
  };

  const handleClearPictureCache = () => {
    clearPictureCache();
    toast.success("Billedcache ryddet");
  };

  const handleClearAllData = () => {
    clearAllData();
    setSettings(getSettings());
    toast.success("Alle data ryddet", {
      action: {
        label: "Genindlæs",
        onClick: () => window.location.reload(),
      },
    });
  };

  const handleResetSettings = () => {
    resetSettings();
    setSettings(getSettings());
    toast.success("Indstillinger nulstillet", {
      action: {
        label: "Genindlæs",
        onClick: () => window.location.reload(),
      },
    });
  };

  // Get data counts for display
  const starredCount = getStarredPeople().length;
  const recentsCount = getRecentPeople().length;

  const renderContent = () => {
    switch (activeSection) {
      case "about":
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-center gap-2">
              <img
                src={logoUrl}
                alt="BetterLectio"
                width={64}
                height={64}
                className="size-16 shrink-0"
              />
              <h1 className="text-3xl! font-bold! text-black!">
                BetterLectio
              </h1>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-8 rounded-md bg-primary/10">
                    <Info className="size-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Version</span>
                </div>
                <Badge variant="secondary" className="text-sm">
                  v{version}
                </Badge>
              </div>

              {versionInfo && (
                <>
                  <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-8 rounded-md bg-primary/10">
                        <Calendar className="size-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">Først installeret</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(versionInfo.firstInstalledAt)}
                    </span>
                  </div>
                  {versionInfo.firstInstalledAt !== versionInfo.lastUpdatedAt && (
                    <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-md bg-primary/10">
                          <Calendar className="size-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium">Sidst opdateret</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(versionInfo.lastUpdatedAt)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="https://chromewebstore.google.com/detail/betterlectio/dkfapbjhgiepdijkpfabekbnepiomahj"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-input bg-background text-black! hover:bg-accent cursor-pointer transition-colors no-underline"
              >
                <Chrome className="size-4" />
                Chrome Web Store
                <ExternalLink className="size-3" />
              </a>
              <a
                href="https://github.com/jonbng/betterlectio"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-input bg-background text-black! hover:bg-accent cursor-pointer transition-colors no-underline"
              >
                <Github className="size-4" />
                GitHub
                <ExternalLink className="size-3" />
              </a>
              <a
                href="https://github.com/jonbng/betterlectio/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-input bg-background text-black! hover:bg-accent cursor-pointer transition-colors no-underline"
              >
                <Bug className="size-4" />
                Rapporter problem
                <ExternalLink className="size-3" />
              </a>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Debug info
              </h3>
              <div className="rounded-lg border bg-muted/30 divide-y divide-border">
                <div className="flex items-center justify-between py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <Chrome className="size-4 text-muted-foreground" />
                    <span className="text-sm">Browser</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">
                    {browserInfo}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <Monitor className="size-4 text-muted-foreground" />
                    <span className="text-sm">Operativsystem</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">
                    {osInfo}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <Monitor className="size-4 text-muted-foreground" />
                    <span className="text-sm">Skærmopløsning</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">
                    {screenDimensions}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Udviklet af{" "}
              <a
                href="https://jonathanb.dk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline cursor-pointer"
              >
                Jonathan Bangert
              </a>
            </p>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <SettingsSection title="Visuelle funktioner">
              <FeatureToggle
                id="visual-favicon"
                label="BetterLectio favicon"
                description="Erstat Lectios favicon med BetterLectio logoet"
                enabled={settings.visual.customFavicon}
                onChange={(v) => handleSettingChange('visual', 'customFavicon', v)}
              />
              <FeatureToggle
                id="visual-titles"
                label="Rene sidetitler"
                description="Moderne sidetitler med ulæste beskeder badge"
                enabled={settings.visual.cleanPageTitles}
                onChange={(v) => handleSettingChange('visual', 'cleanPageTitles', v)}
              />
              <FeatureToggle
                id="visual-fouc"
                label="Skelet-indlæsning"
                description="Vis skelet-animation mens siden indlæses"
                enabled={settings.visual.foucPrevention}
                onChange={(v) => handleSettingChange('visual', 'foucPrevention', v)}
                requiresReload
              />
            </SettingsSection>

            <SettingsSection title="Skema funktioner">
              <FeatureToggle
                id="schedule-today"
                label="Fremhæv i dag"
                description="Gul baggrund på dagens kolonne i skemaet"
                enabled={settings.schedule.todayHighlight}
                onChange={(v) => handleSettingChange('schedule', 'todayHighlight', v)}
                hasDependent={settings.schedule.currentTimeIndicator}
              />
              <FeatureToggle
                id="schedule-time"
                label="Tidsindikator"
                description="Rød linje der viser det aktuelle tidspunkt"
                enabled={settings.schedule.currentTimeIndicator}
                onChange={(v) => handleSettingChange('schedule', 'currentTimeIndicator', v)}
                disabled={!settings.schedule.todayHighlight}
                disabledReason="Kræver 'Fremhæv i dag' er aktiveret"
              />
              <FeatureToggle
                id="schedule-viewing"
                label="Visningshoved"
                description="Viser hvem skemaet tilhører når du ser andres skemaer"
                enabled={settings.schedule.viewingScheduleHeader}
                onChange={(v) => handleSettingChange('schedule', 'viewingScheduleHeader', v)}
              />
            </SettingsSection>

            <SettingsSection title="Sideredesigns">
              <FeatureToggle
                id="pages-findskema"
                label="FindSkema redesign"
                description="Fuzzy søgning, filtre, personkort og favoritter"
                enabled={settings.pages.findSkemaRedesign}
                onChange={(v) => handleSettingChange('pages', 'findSkemaRedesign', v)}
                hasDependent={settings.data.starredPeople || settings.data.recentSearches}
              />
              <FeatureToggle
                id="pages-forside"
                label="Forside redesign"
                description="Hilsen, live ur og masonry kortlayout"
                enabled={settings.pages.forsideRedesign}
                onChange={(v) => handleSettingChange('pages', 'forsideRedesign', v)}
              />
              <FeatureToggle
                id="pages-members"
                label="Medlemsliste kort"
                description="Viser hold/klasse medlemmer som kort i stedet for tabel"
                enabled={settings.pages.membersPageCards}
                onChange={(v) => handleSettingChange('pages', 'membersPageCards', v)}
              />
              <FeatureToggle
                id="pages-login"
                label="Login side redesign"
                description="Moderne skolevalg med søgning"
                enabled={settings.pages.loginPageRedesign}
                onChange={(v) => handleSettingChange('pages', 'loginPageRedesign', v)}
                requiresReload
              />
            </SettingsSection>
          </div>
        );

      case "behavior":
        return (
          <div className="space-y-6">
            <SettingsSection title="Adfærd">
              <FeatureToggle
                id="behavior-session"
                label="Bloker session popup"
                description="Forhindrer 'Din session udløber snart' popup"
                enabled={settings.behavior.sessionPopupBlocker}
                onChange={(v) => handleSettingChange('behavior', 'sessionPopupBlocker', v)}
                requiresReload
              />
              <FeatureToggle
                id="behavior-forside"
                label="Omdiriger til forside"
                description="Omdiriger fra default.aspx til forside.aspx"
                enabled={settings.behavior.autoRedirectForside}
                onChange={(v) => handleSettingChange('behavior', 'autoRedirectForside', v)}
                requiresReload
              />
              <FeatureToggle
                id="behavior-messages"
                label="Beskeder til Nyeste"
                description="Åbn beskeder i 'Nyeste' mappe som standard"
                enabled={settings.behavior.messagesAutoRedirect}
                onChange={(v) => handleSettingChange('behavior', 'messagesAutoRedirect', v)}
              />
              <FeatureToggle
                id="behavior-lastschool"
                label="Fortsæt til sidst brugte skole"
                description="Vis knap til hurtigt login på login-siden"
                enabled={settings.behavior.continueToLastSchool}
                onChange={(v) => handleSettingChange('behavior', 'continueToLastSchool', v)}
              />
            </SettingsSection>

            <SettingsSection title="Ydeevne">
              <FeatureToggle
                id="behavior-preload"
                label="Forudindlæsning"
                description="Forudindlæs sider ved hover for hurtigere navigation"
                enabled={settings.behavior.preloading}
                onChange={(v) => handleSettingChange('behavior', 'preloading', v)}
              />
            </SettingsSection>

            <SettingsSection title="Data">
              <FeatureToggle
                id="data-starred"
                label="Favoritter"
                description={`Gem favorit-personer til hurtig adgang (${starredCount} gemt)`}
                enabled={settings.data.starredPeople}
                onChange={(v) => handleSettingChange('data', 'starredPeople', v)}
                disabled={!settings.pages.findSkemaRedesign}
                disabledReason="Kræver FindSkema redesign er aktiveret"
              />
              <FeatureToggle
                id="data-recents"
                label="Seneste søgninger"
                description={`Husk dine seneste søgninger (${recentsCount} gemt)`}
                enabled={settings.data.recentSearches}
                onChange={(v) => handleSettingChange('data', 'recentSearches', v)}
                disabled={!settings.pages.findSkemaRedesign}
                disabledReason="Kræver FindSkema redesign er aktiveret"
              />
            </SettingsSection>
          </div>
        );

      case "sidebar":
        return (
          <div className="space-y-6">
            <SettingsSection title="Hovedmenu" description="Vælg hvilke links der vises i hovedmenuen">
              <FeatureToggle
                id="sidebar-forside"
                label="Forside"
                description="Link til forsiden"
                enabled={settings.sidebar.showForside}
                onChange={(v) => handleSettingChange('sidebar', 'showForside', v)}
              />
              <FeatureToggle
                id="sidebar-skema"
                label="Skema"
                description="Link til dit skema"
                enabled={settings.sidebar.showSkema}
                onChange={(v) => handleSettingChange('sidebar', 'showSkema', v)}
              />
              <FeatureToggle
                id="sidebar-elever"
                label="Elever"
                description="Link til elevoversigt"
                enabled={settings.sidebar.showElever}
                onChange={(v) => handleSettingChange('sidebar', 'showElever', v)}
              />
              <FeatureToggle
                id="sidebar-opgaver"
                label="Opgaver"
                description="Link til opgaveoversigt"
                enabled={settings.sidebar.showOpgaver}
                onChange={(v) => handleSettingChange('sidebar', 'showOpgaver', v)}
              />
              <FeatureToggle
                id="sidebar-lektier"
                label="Lektier"
                description="Link til lektieoversigt"
                enabled={settings.sidebar.showLektier}
                onChange={(v) => handleSettingChange('sidebar', 'showLektier', v)}
              />
              <FeatureToggle
                id="sidebar-beskeder"
                label="Beskeder"
                description="Link til beskeder"
                enabled={settings.sidebar.showBeskeder}
                onChange={(v) => handleSettingChange('sidebar', 'showBeskeder', v)}
              />
            </SettingsSection>

            <SettingsSection title="Sekundær menu" description="Vælg hvilke links der vises i den sekundære menu">
              <FeatureToggle
                id="sidebar-karakterer"
                label="Karakterer"
                description="Link til karakteroversigt"
                enabled={settings.sidebar.showKarakterer}
                onChange={(v) => handleSettingChange('sidebar', 'showKarakterer', v)}
              />
              <FeatureToggle
                id="sidebar-fravaer"
                label="Fravær"
                description="Link til fraværsoversigt"
                enabled={settings.sidebar.showFravaer}
                onChange={(v) => handleSettingChange('sidebar', 'showFravaer', v)}
              />
              <FeatureToggle
                id="sidebar-studieplan"
                label="Studieplan"
                description="Link til studieplan"
                enabled={settings.sidebar.showStudieplan}
                onChange={(v) => handleSettingChange('sidebar', 'showStudieplan', v)}
              />
              <FeatureToggle
                id="sidebar-dokumenter"
                label="Dokumenter"
                description="Link til dokumenter"
                enabled={settings.sidebar.showDokumenter}
                onChange={(v) => handleSettingChange('sidebar', 'showDokumenter', v)}
              />
              <FeatureToggle
                id="sidebar-spoergeskema"
                label="Spørgeskema"
                description="Link til spørgeskemaer"
                enabled={settings.sidebar.showSpoergeskema}
                onChange={(v) => handleSettingChange('sidebar', 'showSpoergeskema', v)}
              />
              <FeatureToggle
                id="sidebar-uvbeskrivelser"
                label="UV-beskrivelser"
                description="Link til undervisningsbeskrivelser"
                enabled={settings.sidebar.showUVBeskrivelser}
                onChange={(v) => handleSettingChange('sidebar', 'showUVBeskrivelser', v)}
              />
            </SettingsSection>

            <SettingsSection title="Sektioner" description="Vis eller skjul foldbare sektioner">
              <FeatureToggle
                id="sidebar-findskema"
                label="Find Skema"
                description="Foldbar sektion med genveje til skematyper"
                enabled={settings.sidebar.showFindSkema}
                onChange={(v) => handleSettingChange('sidebar', 'showFindSkema', v)}
              />
              <FeatureToggle
                id="sidebar-aendringer"
                label="Ændringer"
                description="Foldbar sektion med skemaændringer"
                enabled={settings.sidebar.showAendringer}
                onChange={(v) => handleSettingChange('sidebar', 'showAendringer', v)}
              />
            </SettingsSection>
          </div>
        );

      case "advanced":
        return (
          <div className="space-y-6">
            <SettingsSection title="Cache" description="Administrer lokalt gemt data">
              <div className="flex items-center justify-between py-3 px-4">
                <div className="space-y-0.5">
                  <Label className="font-medium">Ryd billedcache</Label>
                  <p className="text-sm text-muted-foreground">
                    Slet cachede profilbilleder
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearPictureCache}
                  className="cursor-pointer"
                >
                  Ryd cache
                </Button>
              </div>
              <div className="flex items-center justify-between py-3 px-4">
                <div className="space-y-0.5">
                  <Label className="font-medium">Ryd alle data</Label>
                  <p className="text-sm text-muted-foreground">
                    Slet favoritter, seneste søgninger, billedcache og indstillinger
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearAllData}
                  className="cursor-pointer"
                >
                  Ryd alt
                </Button>
              </div>
            </SettingsSection>

            <SettingsSection title="Nulstil" description="Gendan standardindstillinger">
              <div className="flex items-center justify-between py-3 px-4">
                <div className="space-y-0.5">
                  <Label className="font-medium">Nulstil indstillinger</Label>
                  <p className="text-sm text-muted-foreground">
                    Gendan alle indstillinger til standard (beholder favoritter og søgninger)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetSettings}
                  className="cursor-pointer"
                >
                  Nulstil
                </Button>
              </div>
            </SettingsSection>
          </div>
        );

      default:
        return null;
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={contentRef}
        tabIndex={-1}
        className="relative z-10 bg-background w-full max-w-[700px] lg:max-w-[800px] max-h-[85vh] md:max-h-[600px] overflow-hidden rounded-lg border shadow-lg mx-4 animate-in fade-in-0 zoom-in-95 duration-200 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-5 right-5 z-20 rounded-sm opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="Luk"
        >
          <X className="size-5" />
        </button>

        <SidebarProvider className="items-start min-h-0">
          <Sidebar collapsible="none" className="flex border-r py-4">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navItems.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={item.id === activeSection}
                          onClick={() => setActiveSection(item.id)}
                          className="cursor-pointer h-11! text-[15px]!"
                        >
                          <item.icon className="size-[18px]!" />
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <main className="flex h-[580px] flex-1 flex-col overflow-hidden">
            <header className="flex h-12 shrink-0 items-center gap-2 border-b mt-4">
              <div className="flex items-center gap-2 px-6">
                <Breadcrumb>
                  <BreadcrumbList className="text-[15px]">
                    <BreadcrumbItem>
                      <span className="text-muted-foreground">
                        Indstillinger
                      </span>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeName}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
              {renderContent()}
            </div>
          </main>
        </SidebarProvider>
      </div>
    </div>
  );

  // Portal to il-root to ensure styles apply
  const portalTarget = document.getElementById("il-root") || document.body;
  return createPortal(modalContent, portalTarget);
}
