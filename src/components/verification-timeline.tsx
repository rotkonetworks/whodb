import React from 'react';
import { CheckCircle, Fingerprint, GitMerge, Twitter, Calendar } from 'lucide-react';

interface TimelineEvent {
  date: string;
  event: string;
}

interface VerificationTimelineProps {
  timeline: TimelineEvent[];
}

// TODO: add more event styling
const eventDetails: { [key: string]: { icon: React.ElementType; label: string; color: string; bgColor: string } } = {
  created: { icon: Calendar, label: 'Account Created', color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-400' },
  pgpfingerprint: { icon: Fingerprint, label: 'PGP Fingerprint Added', color: 'text-purple-400', bgColor: 'bg-purple-500/20 border-purple-400' },
  twitter: { icon: Twitter, label: 'Twitter Verified', color: 'text-sky-400', bgColor: 'bg-sky-500/20 border-sky-400' },
  verified: { icon: CheckCircle, label: 'Identity Verified', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-400' },
  github: { icon: GitMerge, label: 'GitHub Verified', color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-400' },
};

const VerificationTimeline: React.FC<VerificationTimelineProps> = ({ timeline }) => {
  
  // Sort timeline by date in ascending order
  const sortedTimeline = timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-foreground mb-4">Verification Timeline</h3>
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 h-full w-0.5 bg-gradient-to-b from-blue-400 via-purple-400 to-green-400" />

        {sortedTimeline.map((item, index) => {
          const { icon: Icon, label, color, bgColor } = eventDetails[item.event] || { 
            icon: CheckCircle, 
            label: item.event, 
            color: 'text-gray-400', 
            bgColor: 'bg-gray-500/20 border-gray-400' 
          };
          const isLastItem = index === sortedTimeline.length - 1;

          return (
            <div key={index} className={`relative pb-8 ${isLastItem ? 'pb-0' : ''}`}>
              {/* Icon */}
              <div className="absolute left-0 top-0 -translate-x-1/2 transform">
                <div className={`w-8 h-8 ${bgColor} border-2 rounded-full flex items-center justify-center shadow-lg`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>

              {/* Content */}
              <div className="ml-4">
                <p className={`font-semibold ${color}`}>{label}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(item.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric'
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VerificationTimeline;
