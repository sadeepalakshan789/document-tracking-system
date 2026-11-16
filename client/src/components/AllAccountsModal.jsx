import React, { useEffect, useMemo, useState } from "react";
import UserProfileControlDrawer from "./UserProfileControlDrawer";

function Alert({ type, message, onClose }) {
  if (!message) return null;

  const styles = {
    success: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200",
    error: "bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200",
    info: "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200",
  };

  return (
    <div
      className={`flex items-start gap-3 border rounded-xl px-4 py-3 text-sm mb-4 shadow-sm ${styles[type] ?? styles.info}`}
    >
      <span className="flex-1 font-medium">{message}</span>
      <button
        onClick={onClose}
        className="text-current opacity-60 hover:opacity-100 transition ml-2 shrink-0 cursor-pointer"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

function RoleBadge({ role }) {
  const normalizedRole = role ? role.toUpperCase().replace(/-/g, "_") : "NORMAL_USER";
  const isVioletRole = ["SUPER_ADMIN", "SUB_ADMIN", "ADMIN"].includes(normalizedRole);

  if (isVioletRole) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800">
        {normalizedRole}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
      {normalizedRole}
    </span>
  );
}

function StatusBadge({ status }) {
  return status === "active" ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      Blocked
    </span>
  );
}

export default function AllAccountsModal({
  isOpen,
  onClose,
  users = [],
  loadingUsers = false,
  usersError = "",
  fetchUsers,
  currentUserId,
  actionLoadingId,
  requestToggleStatus,
  requestDelete,
  tableAlert,
  setTableAlert,
  positions = [],
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedUser(null);
      return;
    }
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (selectedUser) {
          setSelectedUser(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, selectedUser]);

  const filteredUsers = useMemo(() => {
    return (users || []).filter((u) => {
      const matchesSearch =
        (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase());

      const matchesRole =
        roleFilter === "all" ||
        (u.role && u.role.toUpperCase().replace(/-/g, "_") === roleFilter.toUpperCase());

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full max-w-6xl max-h-[90vh] rounded-3xl p-5 sm:p-7 md:p-8 shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">All Accounts</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {users.length} total
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                View and manage all user &amp; admin accounts. Click any row for profile details &amp; control.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-shrink-0">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none transition"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition cursor-pointer"
          >
            <option value="all" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">All Roles</option>
            <option value="SUPER_ADMIN" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Super Admin</option>
            <option value="SUB_ADMIN" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Sub Admin</option>
            <option value="NORMAL_USER" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">User</option>
          </select>

          <button
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/70 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            <svg className={`w-4 h-4 text-slate-500 dark:text-slate-400 ${loadingUsers ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </div>

        {tableAlert && tableAlert.message && (
          <div className="mb-3 flex-shrink-0">
            <Alert
              type={tableAlert.type}
              message={tableAlert.message}
              onClose={() => setTableAlert && setTableAlert({ type: "", message: "" })}
            />
          </div>
        )}

        {/* Table Content Container with both X and Y scroll */}
        <div className="flex-1 overflow-x-auto overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl scrollbar-thin">
          {loadingUsers ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : usersError ? (
            <div className="py-16 text-center">
              <p className="text-red-500 dark:text-red-400 text-sm">{usersError}</p>
              <button
                onClick={fetchUsers}
                className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Try again
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
              {search || roleFilter !== "all" ? "No accounts match your filters." : "No accounts found."}
            </div>
          ) : (
            <table className="w-full min-w-[680px] text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredUsers.map((user) => {
                  const isSelf = user._id === currentUserId;
                  const isSuperAdminRow = user.role && user.role.toUpperCase().replace(/-/g, "_") === "SUPER_ADMIN";
                  const actionsDisabled = isSelf || isSuperAdminRow;
                  const isActionLoading = actionLoadingId === user._id;

                  return (
                    <tr
                      key={user._id}
                      onClick={() => setSelectedUser(user)}
                      className={`group cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-slate-800/70 transition-all duration-200 ${
                        isSelf ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                      }`}
                      title="Click to view User Profile &amp; Control"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                            {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                              {user.name}
                              {isSelf && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 font-semibold">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 md:hidden">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-slate-600 dark:text-slate-400">{user.email}</td>
                      <td className="px-5 py-3.5"><RoleBadge role={user.role} /></td>
                      <td className="px-5 py-3.5"><StatusBadge status={user.status || "active"} /></td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestToggleStatus(user);
                            }}
                            disabled={actionsDisabled || isActionLoading}
                            title={
                              isSelf
                                ? "You cannot change your own status"
                                : isSuperAdminRow
                                ? "Super-admin accounts cannot be blocked"
                                : user.status === "active"
                                ? "Block this user"
                                : "Unblock this user"
                            }
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                              actionsDisabled
                                ? "opacity-30 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                                : user.status === "active"
                                ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900/60"
                            }`}
                          >
                            {isActionLoading ? (
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                            ) : user.status === "active" ? (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Block
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Unblock
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDelete(user);
                            }}
                            disabled={actionsDisabled || isActionLoading}
                            title={
                              isSelf
                                ? "You cannot delete your own account"
                                : isSuperAdminRow
                                ? "Super-admin accounts cannot be deleted"
                                : "Delete this user"
                            }
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                              actionsDisabled
                                ? "opacity-30 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                                : "bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-200 dark:hover:bg-rose-900/60"
                            }`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Delete
                          </button>

                          <span className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all text-base font-bold pl-1">
                            ›
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {filteredUsers.length} of {users.length} account{users.length !== 1 ? "s" : ""} shown
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Smooth Layered / Slide-Over Drawer for User Profile & Control */}
        {selectedUser && (
          <UserProfileControlDrawer
            user={selectedUser}
            onBack={() => setSelectedUser(null)}
            onClose={onClose}
            currentUserId={currentUserId}
            onUserUpdated={(updatedUser) => {
              if (fetchUsers) fetchUsers();
              setSelectedUser(updatedUser);
            }}
            onUserDeleted={(deletedId) => {
              if (fetchUsers) fetchUsers();
              setSelectedUser(null);
              if (setTableAlert) {
                setTableAlert({
                  type: "success",
                  message: "User account deleted successfully.",
                });
              }
            }}
            positions={positions}
            allUsers={users}
          />
        )}
      </div>
    </div>
  );
}
