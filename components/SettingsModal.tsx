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

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const manifest = browser.runtime.getManifest();
  const version = manifest.version;
  const logoUrl = browser.runtime.getURL("/assets/logo-transparent.svg");
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState("appearance");

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

  const activeName = navItems.find((item) => item.id === activeSection)?.name ?? "Om";

  const renderContent = () => {
    switch (activeSection) {
      case "about":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <img
                src={logoUrl}
                alt="BetterLectio"
                width={48}
                height={48}
                className="size-12 shrink-0"
              />
              <div>
                <h3 className="text-xl font-semibold">BetterLectio</h3>
                <p className="text-sm text-muted-foreground">
                  Forbedret styling og funktionalitet til Lectio
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Version</span>
                <Badge variant="secondary">{version}</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Udviklet af</span>
                <span className="text-sm">Jonathan Bangert</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() =>
                  window.open("https://github.com/jonbng/betterlectio", "_blank")
                }
              >
                <Github className="size-4 mr-1.5" />
                GitHub
                <ExternalLink className="size-3 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() =>
                  window.open(
                    "https://github.com/jonbng/betterlectio/issues",
                    "_blank"
                  )
                }
              >
                <Bug className="size-4 mr-1.5" />
                Rapporter problem
                <ExternalLink className="size-3 ml-1" />
              </Button>
            </div>
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
                      <span className="text-muted-foreground">Indstillinger</span>
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
