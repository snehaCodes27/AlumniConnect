import React from 'react';
import EventCommunityModal from './EventCommunityModal';

/**
 * WebinarLiveRoom (Repurposed Architecture)
 * WebRTC live meeting room and browser camera/mic permissions are replaced by
 * the private Event Community with external webinar links (Google Meet / Zoom),
 * real-time announcements, resources, and post-webinar AI Knowledge / RAG hub.
 */
export default function WebinarLiveRoom(props) {
  return <EventCommunityModal {...props} />;
}