import React, { useState } from 'react';
import { eventService } from '../services/eventService';
import { X, Calendar, Clock, Video, Users, User, Building2, Tag, AlertCircle } from 'lucide-react';

const EVENT_TYPES = [
  { value: 'WEBINAR', label: 'Live Webinar' },
  { value: 'WORKSHOP', label: 'Hands-on Workshop' },
  { value: 'NETWORKING', label: 'Networking Session' },
  { value: 'SEMINAR', label: 'Technical Seminar' },
  { value: 'PANEL_DISCUSSION', label: 'Panel Discussion' },
];

const pad2 = (n) => String(n).padStart(2, '0');

// Convert an ISO string from the server into local date/time input values
const toLocalDateTimeParts = (iso) => {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
};

// Combine separate date + time inputs into an ISO string
const toIsoDateTime = (date, time) =>
  date && time ? new Date(`${date}T${time}`).toISOString() : undefined;

export default function CreateEventModal({ eventToEdit = null, event = null, onClose, onSuccess }) {
  const targetEvent = eventToEdit || event;
  const isEditing = Boolean(targetEvent);

  const [title, setTitle] = useState(targetEvent?.title || '');
  const [type, setType] = useState(targetEvent?.type || 'WEBINAR');
  const [description, setDescription] = useState(targetEvent?.description || '');
  const [speakerName, setSpeakerName] = useState(targetEvent?.speakerName || '');
  const [speakerRole, setSpeakerRole] = useState(targetEvent?.speakerRole || '');
  const [speakerCompany, setSpeakerCompany] = useState(targetEvent?.speakerCompany || '');
  const [speakerBio, setSpeakerBio] = useState(targetEvent?.speakerBio || '');
  const initialStart = toLocalDateTimeParts(targetEvent?.startDate);
  const initialEnd = toLocalDateTimeParts(targetEvent?.endDate);
  const initialDeadline = toLocalDateTimeParts(targetEvent?.registrationDeadline);

  const [startDate, setStartDate] = useState(initialStart.date);
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endDate, setEndDate] = useState(initialEnd.date);
  const [endTime, setEndTime] = useState(initialEnd.time);
  const [location, setLocation] = useState(targetEvent?.location || 'Online Webinar');
  const [meetingUrl, setMeetingUrl] = useState(targetEvent?.meetingUrl || '');
  const [maxCapacity, setMaxCapacity] = useState(targetEvent?.maxCapacity || '');
  const [regDate, setRegDate] = useState(initialDeadline.date);
  const [regTime, setRegTime] = useState(initialDeadline.time);
  const [tagsInput, setTagsInput] = useState((targetEvent?.tags || []).join(', '));
  const [isFeatured, setIsFeatured] = useState(Boolean(targetEvent?.isFeatured));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!startDate || !startTime || !endDate || !endTime) {
      setIsSubmitting(false);
      setError('Please choose both the date and the time for the event start and end.');
      return;
    }

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    if (start >= end) {
      setIsSubmitting(false);
      setError('Event end date & time must be after the start date & time.');
      return;
    }

    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);

    const payload = {
      title: title.trim(),
      type,
      description: description.trim(),
      speakerName: speakerName.trim(),
      speakerRole: speakerRole.trim() || undefined,
      speakerCompany: speakerCompany.trim() || undefined,
      speakerBio: speakerBio.trim() || undefined,
      startDate: toIsoDateTime(startDate, startTime),
      endDate: toIsoDateTime(endDate, endTime),
      location: location.trim(),
      meetingUrl: meetingUrl.trim() || undefined,
      maxCapacity: maxCapacity !== '' ? parseInt(maxCapacity, 10) : undefined,
      registrationDeadline: toIsoDateTime(regDate, regTime),
      tags,
      isFeatured,
    };

    try {
      let res;
      if (isEditing) {
        res = await eventService.updateEvent(targetEvent.id, payload);
      } else {
        res = await eventService.createEvent(payload);
      }

      if (res.success) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <span className="text-xs font-semibold px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
            {isEditing ? 'Edit Event' : 'Host New Event / Webinar'}
          </span>
          <h2 className="text-2xl font-bold text-white mt-2">
            {isEditing ? 'Update Event Details' : 'Create Live Webinar or Workshop'}
          </h2>
          <p className="text-xs text-slate-400">
            Share expertise, host live sessions, and engage with students and fellow alumni.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-800/60 rounded-2xl flex items-center gap-3 text-red-300 text-xs">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Event Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Masterclass: System Design Principles for Web Apps"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Event Format *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Location / Platform *</label>
              <input
                type="text"
                required
                placeholder="e.g. Online Webinar or Auditorium Room B"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Speaker Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Morgan"
                value={speakerName}
                onChange={(e) => setSpeakerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Speaker Role & Company</label>
              <input
                type="text"
                placeholder="e.g. Staff Engineer @ Google"
                value={speakerRole}
                onChange={(e) => setSpeakerRole(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">End Time *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Participant Capacity</label>
              <input
                type="number"
                placeholder="e.g. 100 (Leave blank for unlimited)"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>External Webinar / Google Meet / Zoom Link</span>
                <span className="text-[11px] text-slate-400 font-normal">Optional (can also post inside Event Community)</span>
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/xxx-yyyy-zzz or https://zoom.us/j/..."
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Registration Deadline Date</label>
              <input
                type="date"
                value={regDate}
                onChange={(e) => setRegDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Registration Deadline Time</label>
              <input
                type="time"
                value={regTime}
                onChange={(e) => setRegTime(e.target.value)}
                style={{ colorScheme: 'dark' }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Event Description *</label>
              <textarea
                required
                rows={3}
                placeholder="Describe agenda, prerequisites, and takeaway topics..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. React, WebRTC, AI, System Design"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Event' : 'Publish Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
