import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import EventCommunityModal from "../../components/EventCommunityModal";

export default function EventCommunityPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <EventCommunityModal
      embedded={["ALUMNI", "STUDENT"].includes(user?.role)}
      eventId={id}
      onClose={() => navigate("/events")}
    />
  );
}
