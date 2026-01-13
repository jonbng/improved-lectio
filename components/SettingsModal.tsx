import { useEffect, useRef, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import { browser } from "wxt/browser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Info,
  Github,
  Bug,
  Palette,
  Bell,
  Wrench,
  ExternalLink,
  X,
  Chrome,
  Monitor,
  Calendar,
} from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const navItems = [
  { id: "appearance", name: "Udseende", icon: Palette },
  { id: "notifications", name: "Notifikationer", icon: Bell },
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
      // Migrate from old format if needed
      const firstInstalledAt = info.firstInstalledAt || info.installedAt || new Date().toISOString();

      if (info.version === currentVersion) {
        // Same version, return existing info
        return {
          version: currentVersion,
          firstInstalledAt,
          lastUpdatedAt: info.lastUpdatedAt || firstInstalledAt,
        };
      }

      // Version changed - update lastUpdatedAt but keep firstInstalledAt
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

  // First install
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

  // Get version info on mount
  useEffect(() => {
    setVersionInfo(getVersionInfo(version));
  }, [version]);

  // Handle escape key and focus trap
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    // Focus the modal content when opened
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

  const activeName =
    navItems.find((item) => item.id === activeSection)?.name ?? "Om";

  const browserInfo = getBrowserInfo();
  const osInfo = getOSInfo();
  const screenDimensions = `${window.screen.width} × ${window.screen.height}`;

  const renderContent = () => {
    switch (activeSection) {
      case "about":
        return (
          <div className="space-y-8">
            {/* Hero section with logo and name */}
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

            {/* Version and info cards */}
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

            {/* Action buttons */}
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

            {/* Debug info section */}
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

            {/* Credits */}
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tema</Label>
                <p className="text-sm text-muted-foreground">
                  Vælg mellem lyst og mørkt tema
                </p>
              </div>
              <Badge variant="outline">Kommer snart</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Accentfarve</Label>
                <p className="text-sm text-muted-foreground">
                  Tilpas udvidelsens farvetema
                </p>
              </div>
              <Badge variant="outline">Kommer snart</Badge>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Nye beskeder</Label>
                <p className="text-sm text-muted-foreground">
                  Få notifikationer om nye beskeder
                </p>
              </div>
              <Checkbox disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Skemaændringer</Label>
                <p className="text-sm text-muted-foreground">
                  Få notifikationer om ændringer i dit skema
                </p>
              </div>
              <Checkbox disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Nye opgaver</Label>
                <p className="text-sm text-muted-foreground">
                  Få notifikationer om nye opgaver
                </p>
              </div>
              <Checkbox disabled />
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              Notifikationer er ikke tilgængelige endnu.
            </p>
          </div>
        );

      case "advanced":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Debug-tilstand</Label>
                <p className="text-sm text-muted-foreground">
                  Vis ekstra fejlfindingsinformation
                </p>
              </div>
              <Checkbox disabled />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ryd cache</Label>
                <p className="text-sm text-muted-foreground">
                  Slet gemte data og indstillinger
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Ryd
              </Button>
            </div>
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
        className="relative z-10 bg-background w-full max-w-[700px] lg:max-w-[800px] max-h-[85vh] md:max-h-[500px] overflow-hidden rounded-lg border shadow-lg mx-4 animate-in fade-in-0 zoom-in-95 duration-200 outline-none"
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

          <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
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
