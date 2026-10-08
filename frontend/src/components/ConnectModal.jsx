import React, { useState } from 'react';
import { connectionService } from '../services/connectionService';

export default function ConnectModal({ alumni, onClose, onSuccess }) {
  if (!alumni) return null;

  const { user, currentCompany, jobRole } = alumni;
  const [message, setMessage] = useState(
    `Hi ${user?.firstName || 'there'}, I would love to connect with you on AlumniConnect to seek guidance and learn about your experience ${
      currentCompany ? `at ${currentCompany}` : ''
    }.`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await connectionService.sendRequest(user.id, message);
      if (res.success) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to send connection request.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-base transition-colors"
        >
          ×
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          {user?.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt={user.firstName}
              className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-bold text-base flex items-center justify-center">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
          )}
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Connect with {user?.firstName} {user?.lastName}
            </h3>
            <p className="text-xs text-slate-500">
              {jobRole ? `${jobRole}` : 'Alumni'} {currentCompany ? `at ${currentCompany}` : ''}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSend}>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Personal Note (Optional)
          </label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Introduce yourself and explain why you'd like to connect..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none shadow-2xs mb-5"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                'Send Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
