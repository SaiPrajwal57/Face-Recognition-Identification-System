import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import ConfirmationModal from '../components/common/ConfirmationModal';

export default function PeopleDatabase() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const { people, loadingPeople, peopleError, refreshPeople, showToast, history } = useApp();

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'name'

  // Delete Modal State
  const [personToDelete, setPersonToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered & Sorted People
  const filteredPeople = useMemo(() => {
    let list = [...people];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.id?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      // default: newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return list;
  }, [people, searchTerm, sortBy]);

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!personToDelete) return;
    setIsDeleting(true);

    try {
      await api.deletePerson(personToDelete.id);
      showToast(`Person "${personToDelete.name}" deleted from database`, 'success');
      setPersonToDelete(null);
      refreshPeople();
    } catch (err) {
      console.error('Delete error:', err);
      showToast(err.message || 'Failed to delete person', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-8 max-w-7xl mx-auto">
      {/* Top Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#F4EFE6] text-[#7D5A44] font-mono text-xs font-semibold uppercase tracking-wider">
              Biometric Registry V4.9
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4EA] text-[#059669] font-mono text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse"></span>
              Vector Matrix Synced
            </span>
          </div>
          <h1 className="font-display-lg text-3xl sm:text-4xl text-[#2A1810] font-bold mt-1">
            Enrolled People &amp; Face Database
          </h1>
          <p className="text-sm text-[#7D5A44]">
            Manage verified biometric identities and deep vector embeddings persisted in database
          </p>
        </div>

        {/* Global Action CTAs */}
        <div className="flex items-center gap-3 self-start lg:self-end">
          <button
            type="button"
            onClick={refreshPeople}
            disabled={loadingPeople}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FFFFFF] text-[#7D5A44] hover:text-[#2A1810] hover:bg-[#FAF7F2] border border-[#7D5A44]/20 transition-all text-xs font-bold shadow-sm"
          >
            <span className={`material-symbols-outlined text-[18px] ${loadingPeople ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>Sync VectorDB</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/enroll')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FAF7F2] hover:bg-[#3D251A] hover:scale-105 transition-all text-xs font-bold shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Enroll New Person</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-[#8E603E] font-semibold">Total Identities</span>
            <div className="text-2xl font-bold text-[#2A1810] mt-1">{people.length}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F4EFE6] flex items-center justify-center text-[#8E603E]">
            <span className="material-symbols-outlined text-[20px]">group</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-[#8E603E] font-semibold">512-D Vectors Indexed</span>
            <div className="text-2xl font-bold text-[#2A1810] mt-1">{people.length}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F4EFE6] flex items-center justify-center text-[#059669]">
            <span className="material-symbols-outlined text-[20px]">data_object</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-[#8E603E] font-semibold">Filtered Matches</span>
            <div className="text-2xl font-bold text-[#2A1810] mt-1">{filteredPeople.length}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#F4EFE6] flex items-center justify-center text-[#7D5A44]">
            <span className="material-symbols-outlined text-[20px]">filter_alt</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md flex items-center">
          <span className="material-symbols-outlined absolute left-4 text-[#7D5A44] text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or UUID..."
            className="w-full pl-11 pr-4 py-2.5 rounded-full bg-[#F8F4EC] text-xs font-medium text-[#2A1810] placeholder:text-[#7D5A44]/60 outline-none focus:ring-2 focus:ring-[#7D5A44]/30"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 text-[#7D5A44] hover:text-[#2A1810] text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <span className="text-xs text-[#7D5A44]">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-full bg-[#F8F4EC] border border-[#7D5A44]/20 text-xs font-medium text-[#2A1810] outline-none cursor-pointer"
          >
            <option value="newest">Newest Enrolled</option>
            <option value="oldest">Oldest Enrolled</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Error Alert if any */}
      {peopleError && (
        <div className="p-4 rounded-2xl bg-[#FFDAD6]/60 border border-[#BA1A1A]/30 text-xs text-[#BA1A1A] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{peopleError}</span>
        </div>
      )}

      {/* People Table / Cards */}
      <div className="rounded-3xl bg-[#FFFFFF] border border-[#7D5A44]/15 shadow-xl overflow-hidden">
        {loadingPeople ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <span className="w-8 h-8 rounded-full border-2 border-[#2A1810] border-t-transparent animate-spin"></span>
            <span className="text-xs text-[#7D5A44] font-medium">Loading biometric database...</span>
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-center px-4">
            <div className="w-14 h-14 rounded-full bg-[#F4EFE6] flex items-center justify-center text-[#7D5A44]">
              <span className="material-symbols-outlined text-[28px]">person_search</span>
            </div>
            <h3 className="text-base font-bold text-[#2A1810]">No Enrolled Identities Found</h3>
            <p className="text-xs text-[#7D5A44] max-w-sm">
              {searchTerm
                ? `No people matched "${searchTerm}". Try another search term.`
                : 'Your database currently has no enrolled persons. Enroll your first subject now!'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/enroll')}
              className="mt-2 px-6 py-2.5 rounded-full bg-[#2A1810] text-[#FAF7F2] text-xs font-bold hover:bg-[#3D251A] transition-all shadow-md"
            >
              Enroll Person
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#7D5A44]/15 bg-[#F8F4EC]/60 text-[#7D5A44] font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-4 px-6">Person</th>
                  <th className="py-4 px-6">System Person ID</th>
                  <th className="py-4 px-6">Enrollment Date</th>
                  <th className="py-4 px-6">Biometric Vector</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#7D5A44]/10 text-xs">
                {filteredPeople.map((person) => {
                  const personInitials = person.name
                    ? person.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()
                    : 'ID';

                  // Count session detections for this person
                  const sessionHits = history.filter(
                    (h) => h.identified && h.person?.id === person.id
                  ).length;

                  return (
                    <tr
                      key={person.id}
                      className="hover:bg-[#F8F4EC]/50 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/people/${person.id}`)}
                    >
                      {/* Person Identity */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#2A1810] text-[#FAF7F2] flex items-center justify-center font-bold text-xs shadow-sm">
                            {personInitials}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[#2A1810] group-hover:text-[#8E603E] transition-colors">
                              {person.name}
                            </span>
                            <span className="text-[11px] text-[#7D5A44]">
                              {sessionHits > 0 ? `${sessionHits} session detection${sessionHits === 1 ? '' : 's'}` : 'No session activity'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Person UUID */}
                      <td className="py-4 px-6 font-mono text-xs text-[#7D5A44]">
                        <span className="bg-[#F8F4EC] px-2.5 py-1 rounded-md border border-[#7D5A44]/15">
                          {person.id}
                        </span>
                      </td>

                      {/* Enrollment Date */}
                      <td className="py-4 px-6 text-[#2A1810]">
                        {new Date(person.created_at).toLocaleDateString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Vector Status */}
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#137333] font-mono text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]"></span>
                          512-D UNIT
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/people/${person.id}`)}
                            className="px-3.5 py-1.5 rounded-full bg-[#F4EFE6] text-[#2A1810] hover:bg-[#2A1810] hover:text-white transition-all text-xs font-semibold"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setPersonToDelete(person)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#BA1A1A] hover:bg-[#FFDAD6] transition-colors"
                            title={`Delete ${person.name}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!personToDelete}
        title="Delete Enrolled Identity?"
        message={`Are you sure you want to delete ${personToDelete?.name}? This will permanently remove their 512-D face vector from the database.`}
        confirmText="Delete Record"
        cancelText="Keep Record"
        isDestructive={true}
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPersonToDelete(null)}
      />
    </div>
  );
}
