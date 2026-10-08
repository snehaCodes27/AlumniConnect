import React from 'react';
import { MessageCircle, Search, Users, Sparkles } from 'lucide-react';
import './network-pages.css';

export default function NetworkPageHero({ directory = false }) {
  const Icon = directory ? Users : MessageCircle;
  return <section className="network-hero">
    <div className="network-hero-copy">
      <span className="network-hero-label"><Icon size={16} />{directory ? 'Alumni Directory' : 'Messages & Direct Chat'}</span>
      <h1>{directory ? 'Find & Connect with Alumni' : 'Connect Through Conversations'}</h1>
      <p>{directory ? 'Search verified alumni, explore their profiles, and connect for mentorship, career guidance and collaboration opportunities.' : 'Chat with students, alumni and mentors. Share ideas, seek guidance, and build meaningful connections.'}</p>
    </div>
    <div className={`network-illustration ${directory ? 'network-illustration-directory' : ''}`} aria-hidden="true">
      <Sparkles className="network-spark" size={25} />
      <div className="network-art-back"><Icon size={55} strokeWidth={1.5} /></div>
      <div className="network-art-front">{directory ? <Search size={62} strokeWidth={2.5} /> : <span>•••</span>}</div>
    </div>
  </section>;
}
