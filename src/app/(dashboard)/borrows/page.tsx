"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Borrow, Book, User } from "@/types";
import { useAuthStore } from "@/lib/auth";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import SearchableSelect from "@/components/SearchableSelect";

export default function BorrowsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBorrow, setEditingBorrow] = useState<Borrow | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showReturnConfirm, setShowReturnConfirm] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    userId: "",
    bookId: "",
  });

  useEffect(() => {
    fetchData();
  }, [sortOrder]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [borrowsRes, booksRes, usersRes] = await Promise.all([
        api.get<Borrow[]>(`/borrows?sortOrder=${sortOrder}`),
        api.get<Book[]>("/books"),
        api.get<User[]>("/users"),
      ]);
      setBorrows(borrowsRes.data);
      setBooks(booksRes.data);
      setUsers(usersRes.data);
      setError("");
    } catch (err: any) {
      setError("Failed to fetch data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "desc" ? "asc" : "desc");
  };

  const handleCreateBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/borrows", formData);
      setShowAddModal(false);
      setFormData({ userId: "", bookId: "" });
      fetchData();
    } catch (err: any) {
      setModalMessage(err.response?.data?.message || "Failed to create borrow");
    }
  };

  const handleEditBorrow = (borrow: Borrow) => {
    if (!isAdmin) {
      setModalMessage("Only admins can edit borrows");
      return;
    }
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
      setEditingBorrow(null);
      fetchData();
    } catch (err: any) {
      setModalMessage(err.response?.data?.message || "Failed to update borrow");
    }
  };

  const handleReturnBook = async (id: string) => {
    if (!isAdmin) {
      setModalMessage("Only admins can mark books as returned");
      return;
    }

    setShowReturnConfirm(id);
  };

  const confirmReturnBook = async () => {
    if (!showReturnConfirm) return;

    try {
      await api.patch(`/borrows/${showReturnConfirm}/return`);
      setShowReturnConfirm(null);
      fetchData();
    } catch (err: any) {
      setModalMessage(err.response?.data?.message || "Failed to return book");
      setShowReturnConfirm(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-blue-100 text-blue-800";
      case "RETURNED":
        return "bg-green-100 text-green-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getAvailableCopies = (book: Book) => {
    const activeBorrows = book.borrows?.filter(b => !b.returnedAt).length || 0;
    return book.copies - activeBorrows;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading borrows...</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Borrows</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage book borrowing and returns
          </p>
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

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Book
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      User
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      <button
                        onClick={toggleSortOrder}
                        className="flex items-center gap-1 hover:text-blue-600"
                      >
                        Borrow Date
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
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Due Date
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Return Date
                    </th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
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
                        {borrow.returnedAt
                          ? new Date(borrow.returnedAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(borrow.status)}`}
                        >
                          {borrow.status}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex gap-3 justify-end">
                          {isAdmin && borrow.status !== "RETURNED" && (
                            <button
                              onClick={() => handleEditBorrow(borrow)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                          )}

                          {isAdmin && borrow.status === "ACTIVE" && (
                            <button
                              onClick={() => handleReturnBook(borrow.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Return
                            </button>
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
      </div>

      {modalMessage && (
        <Modal message={modalMessage} onClose={() => setModalMessage(null)} />
      )}

      {showReturnConfirm && (
        <ConfirmModal
          title="Confirm Return"
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
                  options={users.map((user) => ({
                    value: user.id,
                    label: user.name || user.email,
                  }))}
                  placeholder="Search by name or email..."
                />
              )}
              
              <SearchableSelect
                label="Book"
                required
                value={formData.bookId}
                onChange={(value) => setFormData({ ...formData, bookId: value })}
                options={books.map((book) => {
                  const availableCopies = getAvailableCopies(book);
                  return {
                    value: book.id,
                    label: `${book.title} - ${book.author}${book.publisher ? ` (${book.publisher})` : ''} - ${availableCopies > 0 ? `${availableCopies} available` : 'Not Available'}`,
                    disabled: availableCopies === 0,
                  };
                })}
                placeholder="Search by title, author, or publisher..."
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
                    setFormData({ userId: "", bookId: "" });
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
                <label className="block text-sm font-medium text-gray-700">
                  Due Date *
                </label>
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
