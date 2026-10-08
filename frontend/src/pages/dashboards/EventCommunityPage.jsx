import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EventCommunityModal from '../../components/EventCommunityModal';

export default function EventCommunityPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <EventCommunityModal
      eventId={id}
      onClose={() => navigate('/events')}
    />
  );
}
