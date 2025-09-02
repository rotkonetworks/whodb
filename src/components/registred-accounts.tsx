import React from 'react';
import { CheckCircle, Fingerprint, GitMerge, Twitter, Calendar } from 'lucide-react';
import { Profile, ProfileResults, useSearchContext } from "@/contexts/web-socket-provider"
import { ArrowLeft, Mail, Wallet, Shield, Globe, Github,  AtSign } from "lucide-react"
import { SOCIAL_ICONS } from '@/assets/icons';

const RegistredAccounts: React.FC<Profile> = ({ profile }) => {

  return (
    <div className="mt-8 mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Linked Accounts Label */}
      <div className="md:col-span-2 mt-6 mb-4">
        <h3 className="text-lg font-semibold text-white mb-4">Linked Accounts</h3>
        <div className="border-t border-gray-600"></div>
      </div>

      {/* Email */}
      {profile.email && (
        <div className="bg-gray-700/50 rounded-lg px-4 py-3 border border-gray-700 flex items-center">
          <Mail className="w-4 h-4 mr-3 text-pink-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-400 mr-4 flex-shrink-0 w-20">Email</span>
          <span className="text-white text-sm">{profile.email}</span>
        </div>
      )}

      {/* Wallet Address */}
      <div className="bg-gray-700/50 rounded-lg px-4 py-3 border border-gray-700 flex items-center">
        <Wallet className="w-4 h-4 mr-3 text-pink-400 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-400 mr-4 flex-shrink-0 w-20">Wallet</span>
        <span className="font-mono text-sm text-white break-all">{profile.wallet_id}</span>
      </div>

      {/* Discord */}
      {profile.discord && (
        <div className="bg-gray-700/50 rounded-lg px-4 py-3 border border-gray-700 flex items-center">
          {SOCIAL_ICONS.discord && <span className="mr-3 text-pink-400 flex-shrink-0">{SOCIAL_ICONS.discord}</span>}
          <span className="text-sm font-medium text-gray-400 mr-4 flex-shrink-0 w-20">Discord</span>
          <span className="text-white text-sm">{profile.discord}</span>
        </div>
      )}

      {/* Twitter/X */}
      {profile.twitter && (
        <div className="bg-gray-700/50 rounded-lg px-4 py-3 border border-gray-700 flex items-center">
          {SOCIAL_ICONS.twitter && <span className="mr-3 text-pink-400 flex-shrink-0">{SOCIAL_ICONS.twitter}</span>}
          <span className="text-sm font-medium text-gray-400 mr-4 flex-shrink-0 w-20">Twitter</span>
          <a
            href={`https://twitter.com/${profile.twitter}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:text-pink-300 transition-colors text-sm"
          >
            @{profile.twitter}
          </a>
        </div>
      )}

      {/* GitHub */}
      {profile.github && (
        <div className="bg-gray-700/50 rounded-lg px-4 py-3 border border-gray-700 flex items-center">
          <Github className="w-4 h-4 mr-3 text-pink-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-400 mr-4 flex-shrink-0 w-20">GitHub</span>
          <a
            href={`https://github.com/${profile.github}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:text-pink-300 transition-colors text-sm"
          >
            @{profile.github}
          </a>
        </div>
      )}

      {/* Matrix */}
      {profile.matrix && (
        <div className="bg-gray-700/50 rounded-lg px-4 py-3 border border-gray-700 flex items-center">
          <AtSign className="w-4 h-4 mr-3 text-pink-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-400 mr-4 flex-shrink-0 w-20">Matrix</span>
          <span className="text-white font-mono text-sm">{profile.matrix}</span>
        </div>
      )}

      {/* Website */}
      {profile.web && (
        <div className="bg-gray-700/50 rounded-lg px-4 py-3 border border-gray-700 flex items-center">
          <Globe className="w-4 h-4 mr-3 text-pink-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-400 mr-4 flex-shrink-0 w-20">Website</span>
          <a
            href={profile.web.startsWith('http') ? profile.web : `https://${profile.web}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:text-pink-300 transition-colors text-sm break-all"
          >
            {profile.web}
          </a>
        </div>
      )}

      {/* PGP Fingerprint */}
      {profile.pgp_fingerprint && (
        <div className="bg-gray-700/50 rounded-lg px-4 py-3 border border-gray-700 flex items-center">
          <Fingerprint className="w-4 h-4 mr-3 text-pink-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-400 mr-4 flex-shrink-0 w-20">PGP</span>
          <span className="font-mono text-sm text-white break-all flex-1">{profile.pgp_fingerprint}</span>
          <a
            href={`https://keys.openpgp.org/search?q=${encodeURIComponent(profile.pgp_fingerprint.replace(/\s+/g, ""))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 hover:text-pink-300 transition-colors text-xs ml-2 flex-shrink-0"
          >
            View
          </a>
        </div>
      )}
      {/* Verification Status */}
      <div className="bg-gray-700/50 rounded-lg px-4 py-3 border border-gray-700 flex items-center justify-between md:col-span-2">
        <div className="flex items-center">
          <Shield className="w-4 h-4 mr-3 text-pink-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-400">Verification</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${profile.verified
          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
          : 'bg-gray-600/50 text-gray-400 border border-gray-600'
          }`}>
          {profile.verified ? "Verified" : "Unverified"}
        </div>
      </div>
    </div>
  );
};

export default RegistredAccounts;
