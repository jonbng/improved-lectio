import { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  FileText,
  BookOpen,
  MessageSquare,
  GraduationCap,
  Clock,
  ClipboardList,
  Library,
  FolderOpen,
  HelpCircle,
  Home,
  LogOut,
  User,
  ChevronUp,
  ChevronRight,
  Search,
  ListChecks,
  IdCard,
  CalendarDays,
  Users,
  GraduationCap as Teacher,
  School,
  DoorOpen,
  Box,
  UsersRound,
  LayoutGrid,
  FileSearch,
  BookMarked,
  Settings,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { clearLoginState } from '@/lib/profile-cache';
import { SettingsModal } from './SettingsModal';

function getSchoolIdFromUrl(): string {
  const match = window.location.pathname.match(/\/lectio\/(\d+)\//);
  return match ? match[1] : '94';
}

function getCurrentPage(): string {
  return window.location.pathname.split('/').pop()?.replace('.aspx', '').toLowerCase() || '';
}

function getSchoolNameFromPage(): string | null {
  // Try meta tag first (format: "Lectio- School Name")
  const meta = document.querySelector('meta[name="application-name"]');
  if (meta) {
    const content = meta.getAttribute('content') || '';
    const match = content.match(/^Lectio-\s*(.+)$/);
    if (match) return match[1];
  }
  // Fallback to title (format: "... - Lectio - School Name")
  const titleMatch = document.title.match(/ - Lectio - (.+)$/);
  if (titleMatch) return titleMatch[1];
  // Last resort
  const el = document.querySelector('.ls-master-header-institution-name');
  return el?.textContent?.trim() || null;
}

function getSchoolInfo(): { id: string; name: string } {
  const cached = getCachedProfile();
  return {
    id: cached?.schoolId || getSchoolIdFromUrl(),
    name: cached?.schoolName || getSchoolNameFromPage() || 'Lectio',
  };
}

interface CachedProfile {
  name: string;
  fullName: string;
  className: string;
  pictureUrl: string | null;
  studentId: string | null;
  schoolId: string | null;
  schoolName: string | null;
}

function getCachedProfile(): CachedProfile | null {
  return (window as any).__IL_CACHED_PROFILE__ || null;
}

function getProfilePicture(): string | null {
  // Try immediate extraction first
  const immediate = (window as any).__IL_PROFILE_PIC__;
  if (immediate) return immediate;

  // Fall back to cached
  const cached = getCachedProfile();
  return cached?.pictureUrl || null;
}

function getUserName(): string {
  // First check if we're on a page with another student's info
  const hasOtherUserId = window.location.search.includes('elevid=') ||
                         window.location.search.includes('laererid=');

  // If we're viewing another user, always use cached data
  if (hasOtherUserId) {
    const cached = getCachedProfile();
    if (cached?.name) return cached.name;
  }

  // Try to parse from title: "Eleven Jonathan Arthur Hojer Bangert(k), 1x - Skema - Lectio - ..."
  const titleMatch = document.title.match(/^Eleven\s+(.+?)\([^)]+\),/);
  if (titleMatch) {
    const fullName = titleMatch[1].trim();
    return fullName.split(' ')[0];
  }

  // Fallback to DOM element
  const el = document.querySelector('.ls-user-name');
  if (el?.textContent?.trim()) {
    return el.textContent.trim().split(' ')[0];
  }

  // Final fallback to cached
  const cached = getCachedProfile();
  return cached?.name || 'Bruger';
}

function getUserClass(): string {
  // First check if we're on a page with another student's info
  const hasOtherUserId = window.location.search.includes('elevid=') ||
                         window.location.search.includes('laererid=');

  // If we're viewing another user, always use cached data
  if (hasOtherUserId) {
    const cached = getCachedProfile();
    if (cached?.className) return cached.className;
  }

  // Try to parse from title: "Eleven Jonathan Arthur Hojer Bangert(k), 1x - Skema - Lectio - ..."
  const titleMatch = document.title.match(/\([^)]+\),\s*(\S+)\s*-/);
  if (titleMatch) {
    return titleMatch[1];
  }

  // Fallback to DOM element
  const el = document.querySelector('.ls-user-class');
  if (el?.textContent?.trim()) {
    return el.textContent.trim();
  }

  // Final fallback to cached
  const cached = getCachedProfile();
  return cached?.className || '';
}

const navMain = [
  { title: 'Forside', icon: Home, page: 'forside' },
  { title: 'Skema', icon: Calendar, page: 'skemany' },
  { title: 'Elever', icon: Users, page: 'FindSkema' },
  { title: 'Opgaver', icon: FileText, page: 'opgaverelev' },
  { title: 'Lektier', icon: BookOpen, page: 'material_lektieoversigt' },
  { title: 'Beskeder', icon: MessageSquare, page: 'beskeder2' },
];

const navSecondary = [
  { title: 'Karakterer', icon: GraduationCap, page: 'grades/grade_report' },
  { title: 'Fravær', icon: Clock, page: 'subnav/fravaerelev_fravaersaarsager' },
  { title: 'Studieplan', icon: ClipboardList, page: 'studieplan' },
  { title: 'Dokumenter', icon: FolderOpen, page: 'dokumentoversigt' },
  { title: 'Spørgeskema', icon: HelpCircle, page: 'spoergeskema/spoergeskema_rapport' },
  { title: 'UV-beskrivelser', icon: BookMarked, page: 'studieplan/uvb_list_off' },
];

const findSkemaItems = [
  { title: 'Elev', type: 'elev', icon: Users },
  { title: 'Lærer', type: 'laerer', icon: GraduationCap },
  { title: 'Klasse', type: 'stamklasse', icon: School },
  { title: 'Lokale', type: 'lokale', icon: DoorOpen },
  { title: 'Ressource', type: 'ressource', icon: Box },
  { title: 'Hold', type: 'hold', icon: UsersRound },
  { title: 'Gruppe', type: 'gruppe', icon: LayoutGrid },
];

const calendarItems = [
  { title: 'Dagsændringer', page: 'SkemaDagsaendringer' },
  { title: 'Ugeændringer', page: 'SkemaUgeaendringer' },
  { title: 'Månedskalender', page: 'kalender' },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageEnlarged, setImageEnlarged] = useState(false);
  const [findSkemaOpen, setFindSkemaOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get logo URL at render time when browser context is available
  const logoUrl = browser.runtime.getURL('/assets/logo-transparent.svg');

  const school = getSchoolInfo();
  const schoolId = school.id;
  const schoolName = school.name;
  const profilePic = getProfilePicture();
  const userName = getUserName();
  const userClass = getUserClass();
  const currentPage = getCurrentPage();

  const baseUrl = `/lectio/${schoolId}`;

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  // Close enlarged image on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setImageEnlarged(false);
      }
    }
    if (imageEnlarged) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [imageEnlarged]);

  // Listen for custom event to open settings (triggered by extension icon click)
  useEffect(() => {
    function handleOpenSettings() {
      setSettingsOpen(true);
    }
    window.addEventListener('betterlectio:openSettings', handleOpenSettings);
    return () => window.removeEventListener('betterlectio:openSettings', handleOpenSettings);
  }, []);

  const isActive = (page: string) => {
    const pageLower = page.toLowerCase();
    if (currentPage === pageLower) return true;
    // Match skema pages but not findskema
    if (currentPage.includes('skema') && !currentPage.includes('findskema') && pageLower === 'skemany') return true;
    if (currentPage === pageLower.split('/').pop()) return true;
    return false;
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="BetterLectio" width={32} height={32} className="size-8 shrink-0" />
          <span className="text-[1.35rem] font-semibold truncate text-gray-800 group-data-[collapsible=icon]:hidden">
            {schoolName === 'Sorø Akademis Skole' ? 'Sorø Akademi' : schoolName}
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-base">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton asChild isActive={isActive(item.page)} tooltip={item.title} className="text-lg py-2 h-auto">
                    <a href={`${baseUrl}/${item.page}.aspx`}>
                      <item.icon className="size-6" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-base">Mere</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSecondary.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton asChild isActive={isActive(item.page)} tooltip={item.title} className="text-lg py-2 h-auto">
                    <a href={`${baseUrl}/${item.page}.aspx`}>
                      <item.icon className="size-6" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-base">Skemaer</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Find Skema collapsible */}
              <Collapsible open={findSkemaOpen} onOpenChange={setFindSkemaOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Find Skema" className="text-lg py-2 h-auto">
                      <FileSearch className="size-6" />
                      <span>Find Skema</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {findSkemaItems.map((item) => (
                        <SidebarMenuSubItem key={item.type}>
                          <SidebarMenuSubButton asChild>
                            <a href={`${baseUrl}/FindSkema.aspx?type=${item.type}`}>
                              <item.icon className="size-4" />
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <a href={`${baseUrl}/FindSkemaAdv.aspx`}>
                            <Search className="size-4" />
                            <span>Avanceret</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Calendar views collapsible */}
              <Collapsible open={calendarOpen} onOpenChange={setCalendarOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Kalendervisninger" className="text-lg py-2 h-auto">
                      <CalendarDays className="size-6" />
                      <span>Ændringer</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {calendarItems.map((item) => (
                        <SidebarMenuSubItem key={item.page}>
                          <SidebarMenuSubButton asChild>
                            <a href={`${baseUrl}/${item.page}.aspx`}>
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="relative px-2 py-2" ref={menuRef}>
            {/* Dropdown menu - positioned above the trigger */}
            {menuOpen && (
              <div className="absolute bottom-full left-2 right-2 mb-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
                <div className="p-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14 rounded-lg">
                      {profilePic ? (
                        <AvatarImage src={profilePic} alt={userName} className="object-cover object-top" />
                      ) : null}
                      <AvatarFallback className="rounded-lg text-lg">
                        {userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="truncate font-semibold text-base">{userName}</span>
                      <span className="truncate text-sm text-muted-foreground">{userClass}</span>
                    </div>
                  </div>
                </div>
                <div className="p-1">
                  <a
                    href={`${baseUrl}/indstillinger/studentIndstillinger.aspx`}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  >
                    <User className="size-4" />
                    Profil
                  </a>
                  <a
                    href={`${baseUrl}/digitaltStudiekort.aspx`}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  >
                    <IdCard className="size-4" />
                    Studiekort
                  </a>
                  <a
                    href={`${baseUrl}/Elev_SPS.aspx`}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  >
                    <ListChecks className="size-4" />
                    SPS
                  </a>
                  <a
                    href={`${baseUrl}/bd/userreservations.aspx`}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  >
                    <Library className="size-4" />
                    Bøger
                  </a>
                  <a
                    href={`${baseUrl}/default.aspx?menu=kontakt`}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  >
                    <MessageSquare className="size-4" />
                    Kontakt
                  </a>
                  <a
                    href={`${baseUrl}/help/mainhelp.aspx`}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  >
                    <HelpCircle className="size-4" />
                    Hjælp
                  </a>
                </div>
                <div className="p-1 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setSettingsOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                  >
                    <Settings className="size-4" />
                    Indstillinger
                  </button>
                </div>
                <div className="p-1 border-t border-border">
                  <a
                    href={`${baseUrl}/logout.aspx`}
                    onClick={(e) => {
                      e.preventDefault();
                      clearLoginState();
                      fetch(`${baseUrl}/logout.aspx`).then(() => {
                        window.location.href = "https://www.lectio.dk";
                      });
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-destructive"
                  >
                    <LogOut className="size-4" />
                    Log ud
                  </a>
                </div>
              </div>
            )}

            {/* Trigger button */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors text-left"
            >
              <Avatar
                className="h-10 w-10 rounded-lg cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={(e) => {
                  e.stopPropagation();
                  if (profilePic) setImageEnlarged(true);
                }}
              >
                {profilePic ? (
                  <AvatarImage src={profilePic} alt={userName} className="object-cover object-top" />
                ) : null}
                <AvatarFallback className="rounded-lg">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold text-lg">{userName}</span>
                <span className="truncate text-base text-muted-foreground">{userClass}</span>
              </div>
              <ChevronUp className={`size-4 transition-transform ${menuOpen ? '' : 'rotate-180'}`} />
            </button>
          </div>
      </SidebarFooter>

      {/* Enlarged profile picture overlay */}
      {imageEnlarged && profilePic && (
        <div
          className="fixed inset-0 bg-black/60 z-100 flex items-center justify-center cursor-pointer backdrop-blur-sm"
          onClick={() => setImageEnlarged(false)}
        >
          <img
            src={profilePic}
            alt={userName}
            className="max-w-[80vw] max-h-[80vh] rounded-xl shadow-2xl object-contain animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Settings modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Sidebar>
  );
}
