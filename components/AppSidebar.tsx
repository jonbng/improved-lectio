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
  Search,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
} from '@/components/ui/sidebar';

function getSchoolId(): string {
  const match = window.location.pathname.match(/\/lectio\/(\d+)\//);
  return match ? match[1] : '94';
}

function getCurrentPage(): string {
  return window.location.pathname.split('/').pop()?.replace('.aspx', '').toLowerCase() || '';
}

function getSchoolName(): string {
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
  return el?.textContent?.trim() || 'Lectio';
}

function getProfilePicture(): string | null {
  return (window as any).__IL_PROFILE_PIC__ || null;
}

function getUserName(): string {
  // Parse from title: "Eleven Jonathan Arthur Hojer Bangert(k), 1x - Skema - Lectio - ..."
  const titleMatch = document.title.match(/^Eleven\s+(.+?)\([^)]+\),/);
  if (titleMatch) {
    const fullName = titleMatch[1].trim();
    // Get first name only
    const parts = fullName.split(' ');
    return parts[0];
  }
  // Fallback
  const el = document.querySelector('.ls-user-name');
  return el?.textContent?.trim().split(' ')[0] || 'Bruger';
}

function getUserClass(): string {
  // Parse from title: "Eleven Jonathan Arthur Hojer Bangert(k), 1x - Skema - Lectio - ..."
  const titleMatch = document.title.match(/\([^)]+\),\s*(\S+)\s*-/);
  if (titleMatch) {
    return titleMatch[1];
  }
  const el = document.querySelector('.ls-user-class');
  return el?.textContent?.trim() || '';
}

function shouldShowUserProfile(): boolean {
  const page = getCurrentPage();
  const hasQueryParams = window.location.search.length > 0;
  // Hide profile on schedule page when viewing with params (e.g. ?week=...)
  if (page.includes('skema') && hasQueryParams) {
    return false;
  }
  return true;
}

const navMain = [
  { title: 'Forside', icon: Home, page: 'forside' },
  { title: 'Skema', icon: Calendar, page: 'skemany' },
  { title: 'Opgaver', icon: FileText, page: 'opgaverelev' },
  { title: 'Lektier', icon: BookOpen, page: 'material_lektieoversigt' },
  { title: 'Beskeder', icon: MessageSquare, page: 'beskeder2' },
  { title: 'Søg', icon: Search, page: 'ContentSearch' },
];

const navSecondary = [
  { title: 'Karakterer', icon: GraduationCap, page: 'grades/grade_report' },
  { title: 'Fravær', icon: Clock, page: 'subnav/fravaerelev_fravaersaarsager' },
  { title: 'Studieplan', icon: ClipboardList, page: 'studieplan' },
  { title: 'Bøger', icon: Library, page: 'bd/userreservations' },
  { title: 'Dokumenter', icon: FolderOpen, page: 'dokumentoversigt' },
  { title: 'Spørgeskema', icon: HelpCircle, page: 'spoergeskema/spoergeskema_rapport' },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const schoolId = getSchoolId();
  const schoolName = getSchoolName();
  const profilePic = getProfilePicture();
  const userName = getUserName();
  const userClass = getUserClass();
  const currentPage = getCurrentPage();
  const showUserProfile = shouldShowUserProfile();

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

  const isActive = (page: string) => {
    const pageLower = page.toLowerCase();
    if (currentPage === pageLower) return true;
    if (currentPage.includes('skema') && pageLower === 'skemany') return true;
    if (currentPage === pageLower.split('/').pop()) return true;
    return false;
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-4">
        <a href={`${baseUrl}/skemany.aspx`} className="text-xl font-semibold truncate">
          {schoolName}
        </a>
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
      </SidebarContent>

      {showUserProfile && (
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
                  <a
                    href={`${baseUrl}/logout.aspx`}
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
              <Avatar className="h-10 w-10 rounded-lg">
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
      )}
    </Sidebar>
  );
}
