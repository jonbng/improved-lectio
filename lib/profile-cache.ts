const PROFILE_CACHE_KEY = 'il-user-profile';

export interface UserProfile {
  name: string;
  fullName: string;
  className: string;
  pictureUrl: string | null;
  studentId: string | null;
  cachedAt: number;
}

export interface ViewedPerson {
  name: string;
  className: string;
  pictureUrl: string | null;
  id: string;
  type: 'student' | 'teacher';
}

export function getCachedProfile(): UserProfile | null {
  try {
    const stored = localStorage.getItem(PROFILE_CACHE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }
  return null;
}

export function cacheProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore errors
  }
}

/**
 * Get the logged-in user's student ID from the page.
 * This is found in the meta tag or mobile menu links, not the URL.
 */
export function getLoggedInUserId(): string | null {
  // Try meta tag first: <meta name="msapplication-starturl" content="/lectio/94/forside.aspx?elevid=72721772841">
  const meta = document.querySelector('meta[name="msapplication-starturl"]');
  const metaContent = meta?.getAttribute('content') || '';
  const metaMatch = metaContent.match(/elevid=(\d+)/);
  if (metaMatch) return metaMatch[1];

  // Try mobile menu links that reference logged-in user's pages
  const menuLink = document.querySelector<HTMLAnchorElement>(
    '#mobilMereSheetMenuList a[href*="studieplan.aspx"][href*="elevid="], ' +
    '#mobilMereSheetMenuList a[href*="grade_report.aspx"][href*="elevid="]'
  );
  const linkMatch = menuLink?.href.match(/elevid=(\d+)/);
  if (linkMatch) return linkMatch[1];

  return null;
}

/**
 * Get the ID of the person whose schedule/page we're viewing from the URL.
 */
export function getViewedPersonId(): { id: string; type: 'student' | 'teacher' } | null {
  const elevMatch = window.location.search.match(/elevid=(\d+)/);
  if (elevMatch) return { id: elevMatch[1], type: 'student' };

  const teacherMatch = window.location.search.match(/laererid=(\d+)/);
  if (teacherMatch) return { id: teacherMatch[1], type: 'teacher' };

  return null;
}

/**
 * Check if we're viewing our own page or someone else's.
 */
export function isViewingOwnPage(): boolean {
  const viewed = getViewedPersonId();
  if (!viewed) return true; // No ID in URL = own page

  const loggedInId = getLoggedInUserId();
  if (!loggedInId) return true; // Can't determine, assume own page

  return viewed.id === loggedInId;
}

/**
 * Extract info about the person whose schedule we're viewing (when it's not us).
 */
export function extractViewedPerson(): ViewedPerson | null {
  const viewed = getViewedPersonId();
  if (!viewed || isViewingOwnPage()) return null;

  // Extract from main title: "Eleven Carl Christian Meding(k), 1x - Skema"
  const titleEl = document.querySelector('#s_m_HeaderContent_MainTitle');
  const titleText = titleEl?.textContent || '';

  let name = '';
  let className = '';

  if (viewed.type === 'student') {
    const match = titleText.match(/^Eleven\s+(.+?)\([^)]+\),\s*(\S+)/);
    if (match) {
      name = match[1].trim();
      className = match[2];
    }
  } else {
    // Teacher: "Læreren John Doe - Skema"
    const match = titleText.match(/^Læreren\s+(.+?)\s*-/);
    if (match) {
      name = match[1].trim();
    }
  }

  // Get the viewed person's picture
  let pictureUrl: string | null = null;
  const profileImg = document.querySelector('#s_m_HeaderContent_picctrlthumbimage') as HTMLImageElement;
  if (profileImg?.src) {
    const url = new URL(profileImg.src, window.location.origin);
    url.searchParams.set('fullsize', '1');
    pictureUrl = url.toString();
  }

  if (!name && !pictureUrl) return null;

  return {
    name: name || 'Ukendt',
    className,
    pictureUrl,
    id: viewed.id,
    type: viewed.type,
  };
}

export function extractProfileFromPage(): Partial<UserProfile> | null {
  // Only extract profile data when viewing our own page
  if (!isViewingOwnPage()) return null;

  const profile: Partial<UserProfile> = {};

  // Try to extract from the title: "Eleven Jonathan Arthur Hojer Bangert(k), 1x - Skema - Lectio - ..."
  const titleMatch = document.title.match(/^Eleven\s+(.+?)\(([^)]+)\),\s*(\S+)\s*-/);
  if (titleMatch) {
    profile.fullName = titleMatch[1].trim();
    profile.name = profile.fullName.split(' ')[0];
    profile.className = titleMatch[3];
  }

  // Get logged-in user's ID
  profile.studentId = getLoggedInUserId();

  // Extract profile picture - only when on own page
  const profileImg = document.querySelector('#s_m_HeaderContent_picctrlthumbimage') as HTMLImageElement;
  if (profileImg?.src) {
    const url = new URL(profileImg.src, window.location.origin);
    url.searchParams.set('fullsize', '1');
    profile.pictureUrl = url.toString();
  }

  // Only return if we have meaningful data
  if (profile.name || profile.pictureUrl) {
    return profile;
  }
  return null;
}

export function updateProfileCache(): void {
  const extracted = extractProfileFromPage();
  if (!extracted) return;

  const existing = getCachedProfile();

  // Merge with existing cache, preferring new non-null values
  const updated: UserProfile = {
    name: extracted.name || existing?.name || 'Bruger',
    fullName: extracted.fullName || existing?.fullName || 'Bruger',
    className: extracted.className || existing?.className || '',
    pictureUrl: extracted.pictureUrl || existing?.pictureUrl || null,
    studentId: extracted.studentId || existing?.studentId || null,
    cachedAt: Date.now(),
  };

  // Only cache if we have at least a name and picture
  if (updated.name !== 'Bruger' || updated.pictureUrl) {
    cacheProfile(updated);
  }
}
