"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Borrow } from "@/types";
import { useAuthStore } from "@/lib/auth";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import SearchableSelect from "@/components/SearchableSelect";

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

export default function BorrowsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  // State
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBorrow, setEditingBorrow] = useState<Borrow | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showReturnConfirm, setShowReturnConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    userId: "",
    bookTitle: "",
    bookAuthor: "",
    bookPublisher: "",
  });

  useEffect(() => {
    fetchBorrows();
  }, [sortOrder]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchBorrows(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, sortOrder]);

  const fetchBorrows = async (query?: string) => {
    try {
      // Only show loading indicator on initial load
      if (isInitialLoad) {
        setIsLoading(true);
      }
      const endpoint = query
        ? `/borrows/search?q=${encodeURIComponent(query)}&sortOrder=${sortOrder}`
        : `/borrows?sortOrder=${sortOrder}`;
      const response = await api.get<Borrow[]>(endpoint);
      setBorrows(response.data);
      setError("");
    } catch (err: any) {
      setError("Failed to fetch borrows");
      console.error(err);
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  };

  const handleUserSearch = useCallback(async (query: string): Promise<Option[]> => {
    try {
      const endpoint = query.trim()
        ? `/users/search-for-borrow?q=${encodeURIComponent(query)}`
        : "/users";
      const response = await api.get<any[]>(endpoint);
      return response.data.map((user) => ({
        value: user.id,
        label: user.name || user.email,
      }));
    } catch (error) {
      console.error("Failed to fetch users:", error);
      return [];
    }
  }, []);

  const handleTitleSearch = useCallback(async (query: string): Promise<Option[]> => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append("q", query);
      if (formData.bookAuthor) params.append("author", formData.bookAuthor);
      if (formData.bookPublisher) params.append("publisher", formData.bookPublisher);

      const endpoint = `/books/search-titles${params.toString() ? "?" + params.toString() : ""}`;
      const response = await api.get<{ title: string }[]>(endpoint);
      return response.data.map((item) => ({
        value: item.title,
        label: item.title,
      }));
    } catch (error) {
      console.error("Failed to search titles:", error);
      return [];
    }
  }, [formData.bookAuthor, formData.bookPublisher]);

  const handleAuthorSearch = useCallback(async (query: string): Promise<Option[]> => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append("q", query);
      if (formData.bookTitle) params.append("title", formData.bookTitle);
      if (formData.bookPublisher) params.append("publisher", formData.bookPublisher);

      const endpoint = `/books/search-authors${params.toString() ? "?" + params.toString() : ""}`;
      const response = await api.get<{ author: string }[]>(endpoint);
      return response.data.map((item) => ({
        value: item.author,
        label: item.author,
      }));
    } catch (error) {
      console.error("Failed to search authors:", error);
      return [];
    }
  }, [formData.bookTitle, formData.bookPublisher]);

  const handlePublisherSearch = useCallback(async (query: string): Promise<Option[]> => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append("q", query);
      if (formData.bookTitle) params.append("title", formData.bookTitle);
      if (formData.bookAuthor) params.append("author", formData.bookAuthor);

      const endpoint = `/books/search-publishers${params.toString() ? "?" + params.toString() : ""}`;
      const response = await api.get<{ publisher: string }[]>(endpoint);
      return response.data
        .filter((item) => item.publisher)
        .map((item) => ({
          value: item.publisher,
          label: item.publisher,
        }));
    } catch (error) {
      console.error("Failed to search publishers:", error);
      return [];
    }
  }, [formData.bookTitle, formData.bookAuthor]);

  
  const handleCreateBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        bookTitle: formData.bookTitle,
        bookAuthor: formData.bookAuthor,
        bookPublisher: formData.bookPublisher,
      };

      if (isAdmin && formData.userId) {
        payload.userId = formData.userId;
      }

      await api.post("/borrows/by-details", payload);
      setShowAddModal(false);
      setFormData({ userId: "", bookTitle: "", bookAuthor: "", bookPublisher: "" });
      fetchBorrows();
    } catch (err: any) {
      setModalMessage(err.response?.data?.message || "Failed to create borrow");
    }
  };

  const handleEditBorrow = (borrow: Borrow) => {
    setEditingBorrow(borrow);
    setEditDueDate(borrow.dueDate.split("T")[0]);
    setShowEditModal(true);
  };

  const handleUpdateBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBorrow) return;

    try {
      await api.patch(`/borrows/${editingBorrow.id}`, {
        dueDate: editDueDate,
      });
      setShowEditModal(false);
      fetchBorrows();
    } catch (err: any) {
      setModalMessage(err.response?.data?.message || "Failed to update borrow");
    }
  };

  const confirmReturnBook = async () => {
    if (!showReturnConfirm) return;

    try {
      await api.patch(`/borrows/${showReturnConfirm}/return`);
      setShowReturnConfirm(null);
      fetchBorrows();
    } catch (err: any) {
      setModalMessage(err.response?.data?.message || "Failed to return book");
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "RETURNED":
        return "bg-blue-100 text-blue-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return <div>Loading borrows...</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Borrows</h1>
          <p className="mt-2 text-sm text-gray-700">Manage book borrowing and returns</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            New Borrow
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mt-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by book title, author, user name, or email..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Book</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">User</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    <button
                      onClick={toggleSortOrder}
                      className="flex items-center gap-2 hover:text-blue-600"
                    >
                      Borrowed
                      {sortOrder === "desc" ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Due Date</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Return Date</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {borrows.map((borrow) => (
                  <tr key={borrow.id}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      {borrow.book?.title || "Unknown"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {borrow.user?.name || borrow.user?.email || "Unknown"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(borrow.borrowedAt).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(borrow.dueDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {borrow.returnedAt ? new Date(borrow.returnedAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(borrow.status)}`}>
                        {borrow.status}
                      </span>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex gap-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleEditBorrow(borrow)}
                              className="text-blue-600 hover:text-blue-900"
                              disabled={borrow.returnedAt !== null}
                            >
                              Edit
                            </button>
                            {!borrow.returnedAt && (
                              <button
                                onClick={() => setShowReturnConfirm(borrow.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Return
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalMessage && (
        <Modal onClose={() => setModalMessage(null)} message={modalMessage} />
      )}

      {showReturnConfirm && (
        <ConfirmModal
          title="Return Book"
          message="Are you sure you want to mark this book as returned? This will calculate any applicable fines."
          onConfirm={confirmReturnBook}
          onCancel={() => setShowReturnConfirm(null)}
          confirmText="Yes, Return Book"
          cancelText="Cancel"
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create New Borrow</h2>
            <form onSubmit={handleCreateBorrow} className="space-y-4">
              {isAdmin && (
                <SearchableSelect
                  label="User"
                  required
                  value={formData.userId}
                  onChange={(value) => setFormData({ ...formData, userId: value })}
                  onSearch={handleUserSearch}
                  options={[]}
                  placeholder="Search by name or email..."
                />
              )}

              <SearchableSelect
                label="Book Title"
                required
                value={formData.bookTitle}
                onChange={(value) => {
                  setFormData({ ...formData, bookTitle: value });
                }}
                onSearch={handleTitleSearch}
                options={[]}
                placeholder="Search by title..."
              />

              <SearchableSelect
                label="Author"
                required
                value={formData.bookAuthor}
                onChange={(value) => {
                  setFormData({ ...formData, bookAuthor: value });
                }}
                onSearch={handleAuthorSearch}
                options={[]}
                placeholder="Search by author..."
              />

              <SearchableSelect
                label="Publisher"
                required
                value={formData.bookPublisher}
                onChange={(value) => {
                  setFormData({ ...formData, bookPublisher: value });
                }}
                onSearch={handlePublisherSearch}
                options={[]}
                placeholder="Search by publisher..."
              />

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Borrow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ userId: "", bookTitle: "", bookAuthor: "", bookPublisher: "" });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingBorrow && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Edit Due Date</h2>
            <form onSubmit={handleUpdateBorrow} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date *</label>
                <input
                  type="date"
                  required
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
