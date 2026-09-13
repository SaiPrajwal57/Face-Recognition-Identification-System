import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import ConfirmationModal from '../components/common/ConfirmationModal';

export default function PersonDetails() {
  const { personId } = useParams();
  const navigate = useNavigate();
  const { history, refreshPeople, showToast } = useApp();

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch person details directly from backend
  useEffect(() => {
    let isMounted = true;
    async function loadPerson() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getPerson(personId);
        if (isMounted) {
          setPerson(data);
        }
      } catch (err) {
        console.error('Fetch person error:', err);
        if (isMounted) {
          setError(err.message || 'Person record not found.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (personId) {
      loadPerson();
    }
    return () => {
      isMounted = false;
    };
  }, [personId]);

  // Detections for this person in current session history
  const personHistory = history.filter(
    (h) => h.identified && (h.person?.id === personId || h.person?.name === person?.name)
  );

  // Handle Delete
  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await api.deletePerson(personId);
      showToast(`Person "${person.name}" deleted successfully`, 'success');
      refreshPeople();
      navigate('/people');
    } catch (err) {
      console.error('Delete error:', err);
      showToast(err.message || 'Failed to delete person', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <span className="w-8 h-8 rounded-full border-2 border-[#2A1810] border-t-transparent animate-spin"></span>
        <span className="text-xs text-[#7D5A44] font-medium">Retrieving identity profile...</span>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="p-8 rounded-3xl bg-[#FFFFFF] border border-[#BA1A1A]/30 shadow-xl max-w-xl mx-auto text-center flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-[#FFDAD6] text-[#BA1A1A] flex items-center justify-center">
          <span className="material-symbols-outlined text-[28px]">person_off</span>
        </div>
        <h2 className="text-xl font-bold text-[#2A1810]">Identity Profile Not Found</h2>
        <p className="text-xs text-[#7D5A44]">{error || `No record found with ID ${personId}`}</p>
        <button
          type="button"
          onClick={() => navigate('/people')}
          className="mt-2 px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] transition-all"
        >
          Return to People Database
        </button>
      </div>
    );
  }

  const initials = person.name
    ? person.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'ID';

  return (
    <div className="flex flex-col w-full gap-8 max-w-5xl mx-auto">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/people')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFFFFF] border border-[#7D5A44]/20 text-xs font-bold text-[#7D5A44] hover:text-[#2A1810] hover:bg-[#FAF7F2] transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to People Database</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#059669]"></span>
          <span className="font-mono text-xs font-semibold text-[#7D5A44]">
            ENROLLED IDENTITY • ACTIVE
          </span>
        </div>
      </div>

      {/* Main Profile Bento Header Card */}
      <div className="rounded-3xl bg-[#FFFFFF] p-8 border border-[#7D5A44]/15 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-[#2A1810] text-[#FAF7F2] flex items-center justify-center font-bold text-2xl shadow-lg shrink-0">
            {initials}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#137333] font-mono text-[10px] font-semibold">
                VERIFIED BIOMETRIC
              </span>
              <span className="text-xs text-[#7D5A44]">ArcFace 512-D</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2A1810]">{person.name}</h1>
            <span className="font-mono text-xs text-[#7D5A44] break-all">{person.id}</span>
          </div>
        </div>

        {/* Profile Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
          <button
            type="button"
            onClick={() => navigate('/identify')}
            className="px-5 py-2.5 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] hover:scale-105 transition-all shadow-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">center_focus_strong</span>
            <span>Identify Face</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2.5 rounded-full bg-[#FFDAD6] text-[#BA1A1A] hover:bg-[#ffb4ab] transition-all text-xs font-bold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            <span>Delete Person</span>
          </button>
        </div>
      </div>

      {/* Profile Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-sm flex flex-col justify-between">
          <span className="font-mono text-xs text-[#8E603E] uppercase font-semibold">
            Registration Date
          </span>
          <div className="text-lg font-bold text-[#2A1810] mt-2">
            {new Date(person.created_at).toLocaleDateString([], {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <span className="text-xs text-[#7D5A44] mt-1">
            Time: {new Date(person.created_at).toLocaleTimeString()}
          </span>
        </div>

        <div className="p-6 rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-sm flex flex-col justify-between">
          <span className="font-mono text-xs text-[#8E603E] uppercase font-semibold">
            Session Detections
          </span>
          <div className="text-2xl font-bold text-[#2A1810] mt-2">
            {personHistory.length}
          </div>
          <span className="text-xs text-[#7D5A44] mt-1">
            Recorded in current active session
          </span>
        </div>

        <div className="p-6 rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-sm flex flex-col justify-between">
          <span className="font-mono text-xs text-[#8E603E] uppercase font-semibold">
            Biometric Vector Storage
          </span>
          <div className="text-lg font-bold text-[#059669] mt-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[20px]">verified</span>
            <span>512-D L2 Normalized</span>
          </div>
          <span className="text-xs text-[#7D5A44] mt-1">
            Embeddings omitted from public view for privacy
          </span>
        </div>
      </div>

      {/* Recent Session Recognition Activity for this Person */}
      <div className="p-8 rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-xl flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#7D5A44]/15">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#8E603E] text-[20px]">history</span>
            <h3 className="text-base font-bold text-[#2A1810]">
              Session Recognition History for {person.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/history?search=${encodeURIComponent(person.id)}`)}
            className="text-xs font-semibold text-[#8E603E] hover:text-[#2A1810] transition-colors"
          >
            Open in Full History →
          </button>
        </div>

        {personHistory.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[#7D5A44] text-[32px]">history_toggle_off</span>
            <span className="text-xs text-[#7D5A44]">
              No recognitions have been logged for {person.name} in this session yet.
            </span>
            <button
              type="button"
              onClick={() => navigate('/identify')}
              className="mt-2 px-5 py-2 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] transition-all"
            >
              Test Identification Now
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#7D5A44]/10">
            {personHistory.map((rec) => (
              <div
                key={rec.id}
                onClick={() => navigate(`/history?selected=${rec.id}`)}
                className="py-3 flex items-center justify-between hover:bg-[#F8F4EC]/50 px-2 rounded-xl cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  {rec.queryImage ? (
                    <img
                      src={rec.queryImage}
                      alt="Query"
                      className="w-10 h-10 rounded-full object-cover border border-[#7D5A44]/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#2A1810] text-white flex items-center justify-center text-xs font-bold">
                      {initials}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#2A1810]">
                      Match Verified ({rec.mode})
                    </span>
                    <span className="font-mono text-[10px] text-[#7D5A44]">
                      {new Date(rec.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-[#059669]">
                    {(rec.similarity * 100).toFixed(2)}% Similarity
                  </span>
                  <span className="text-xs text-[#7D5A44]">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title={`Delete Profile for ${person.name}?`}
        message="This action will permanently remove this individual and their 512-D ArcFace feature embedding from the database. This cannot be undone."
        confirmText="Delete Profile"
        cancelText="Cancel"
        isDestructive={true}
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
