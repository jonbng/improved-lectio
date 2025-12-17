import { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft } from 'lucide-react';

interface ViewingScheduleHeaderProps {
  name: string;
  className?: string;
  pictureUrl: string | null;
  type: 'student' | 'teacher';
  schoolId: string;
}

export function ViewingScheduleHeader({
  name,
  className,
  pictureUrl,
  type,
  schoolId,
}: ViewingScheduleHeaderProps) {
  const [imageEnlarged, setImageEnlarged] = useState(false);
  const firstName = name.split(' ')[0];

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

  return (
    <div className="bg-muted/50 border-b border-border px-4 py-3">
      <div className="flex items-center gap-4">
        <a
          href={`/lectio/${schoolId}/SkemaNy.aspx`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Tilbage til dit skema</span>
        </a>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-3">
          <Avatar
            className={`h-10 w-10 rounded-lg ${pictureUrl ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''}`}
            onClick={() => pictureUrl && setImageEnlarged(true)}
          >
            {pictureUrl ? (
              <AvatarImage src={pictureUrl} alt={name} className="object-cover object-top" />
            ) : null}
            <AvatarFallback className="rounded-lg">
              {firstName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col">
            <span className="font-medium text-base">{name}</span>
            <div className="flex items-center gap-2">
              {className && (
                <span className="text-sm text-muted-foreground">{className}</span>
              )}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                type === 'student'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
              }`}>
                {type === 'student' ? 'Elev' : 'Lærer'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enlarged profile picture overlay */}
      {imageEnlarged && pictureUrl && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center cursor-pointer backdrop-blur-sm"
          onClick={() => setImageEnlarged(false)}
        >
          <img
            src={pictureUrl}
            alt={name}
            className="max-w-[80vw] max-h-[80vh] rounded-xl shadow-2xl object-contain animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
