import { useState, useEffect, useCallback } from 'react';
import { PersonCard } from './PersonCard';
import {
  getStarredPeople,
  toggleStarred,
  isPersonStarred,
  getScheduleUrl,
  addRecentPerson,
  type StarredPerson,
} from '../lib/findskema-storage';

interface Member {
  id: string; // Full ID with prefix (e.g., "S72721771682")
  firstName: string;
  lastName: string;
  classCode: string;
  type: 'S' | 'T'; // Student or Teacher
  pictureUrl: string | null;
}

interface MembersPageProps {
  schoolId: string;
  members: Member[];
}

export function MembersPage({ schoolId, members }: MembersPageProps) {
  const [, setStarred] = useState<StarredPerson[]>([]);

  // Load starred from localStorage
  useEffect(() => {
    setStarred(getStarredPeople());
  }, []);

  // Sort members: teachers first, then students
  const sortedMembers = [...members].sort((a, b) => {
    if (a.type === 'T' && b.type !== 'T') return -1;
    if (a.type !== 'T' && b.type === 'T') return 1;
    return 0;
  });

  // Handle starring
  const handleStarToggle = useCallback((id: string) => {
    const member = members.find(m => m.id === id);
    if (member) {
      const fullName = `${member.firstName} ${member.lastName}`.trim();
      toggleStarred({
        id,
        name: fullName,
        classCode: member.classCode,
        type: member.type,
      });
      setStarred(getStarredPeople());
    }
  }, [members]);

  // Handle card click (add to recents)
  const handleCardClick = useCallback((member: Member) => {
    const fullName = `${member.firstName} ${member.lastName}`.trim();
    addRecentPerson({
      id: member.id,
      name: fullName,
      classCode: member.classCode,
      type: member.type,
      url: getScheduleUrl(member.id, schoolId),
    });
  }, [schoolId]);

  return (
    <div className="findskema-card-grid">
      {sortedMembers.map((member) => {
        const fullName = `${member.firstName} ${member.lastName}`.trim();
        return (
          <PersonCard
            key={member.id}
            id={member.id}
            name={fullName}
            classCode={member.classCode}
            type={member.type}
            href={getScheduleUrl(member.id, schoolId)}
            isStarred={isPersonStarred(member.id)}
            onStarToggle={handleStarToggle}
            onClick={() => handleCardClick(member)}
            schoolId={schoolId}
          />
        );
      })}
    </div>
  );
}

/**
 * Parse members from the Lectio members table (withpics format).
 * Columns: Foto, Type, ID, Fornavn, Efternavn
 */
export function parseMembersFromDOM(): Member[] {
  const members: Member[] = [];
  const table = document.querySelector<HTMLTableElement>(
    '#s_m_Content_Content_laerereleverpanel_alm_gv'
  );

  if (!table) return members;

  // Get all data rows (skip header)
  const rows = table.querySelectorAll('tr:not(:first-child)');

  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 5) continue;

    // Get ID from data-lectioContextCard attribute on photo cell
    const contextCard = cells[0].getAttribute('data-lectioContextCard');
    if (!contextCard) continue;

    const id = contextCard; // e.g., "S72721771682"
    const type = id.charAt(0) as 'S' | 'T';

    // Get picture URL from img src
    const img = cells[0].querySelector('img');
    const pictureUrl = img?.src || null;

    // Get class code (cell 2)
    const classCodeSpan = cells[2].querySelector('.noWrap');
    const classCode = classCodeSpan?.textContent?.trim() || '';

    // Get first name (cell 3)
    const firstNameLink = cells[3].querySelector('a');
    const firstName = firstNameLink?.textContent?.trim() || '';

    // Get last name (cell 4)
    const lastNameSpan = cells[4].querySelector('.noWrap');
    const lastName = lastNameSpan?.textContent?.trim() || '';

    members.push({
      id,
      firstName,
      lastName,
      classCode,
      type,
      pictureUrl,
    });
  }

  return members;
}
