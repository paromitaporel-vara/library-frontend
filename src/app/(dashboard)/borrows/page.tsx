"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Borrow, PaginatedResponse, PaginationMeta } from "@/types";
import { useAuthStore } from "@/lib/auth";
import { useDebounce } from "@/hooks/use-debounce";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import SearchableSelect from "@/components/SearchableSelect";
import DataPagination from "@/components/DataPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

export default function BorrowsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const [formData, setFormData] = useState({
    userId: "",
    bookTitle: "",
    bookAuthor: "",
    bookPublisher: "",
  });

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, sortOrder]);

  useEffect(() => {
    fetchBorrows(debouncedSearch);
  }, [debouncedSearch, sortOrder, currentPage]);

  const fetchBorrows = async (query?: string) => {
    try {
      if (isInitialLoad) {
        setIsLoading(true);
      }
      const params = new URLSearchParams();
      params.append('sortOrder', sortOrder);
      params.append('page', String(currentPage));
      params.append('limit', '10');
      if (query) params.append('q', query);
      const endpoint = query
        ? `/borrows/search?${params}`
        : `/borrows?${params}`;
      const response = await api.get<PaginatedResponse<Borrow>>(endpoint);
      setBorrows(response.data.data);
      setPaginationMeta(response.data.meta);
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
      const endpoint = `/users/search-for-borrow${query.trim() ? `?q=${encodeURIComponent(query)}` : ""}`;
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
          <Button onClick={() => setShowAddModal(true)}>
            New Borrow
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mt-4">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by book title, author, user name, or email..."
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
                      Borrowed Date
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
                      <Badge
                        variant={
                          borrow.status === "ACTIVE" ? "default" :
                          borrow.status === "RETURNED" ? "secondary" :
                          borrow.status === "OVERDUE" ? "destructive" : "outline"
                        }
                      >
                        {borrow.status}
                      </Badge>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex gap-2">
                        {isAdmin && (
                          <>
                            {!borrow.returnedAt && (
                              <button
                                onClick={() => handleEditBorrow(borrow)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                            )}

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

      {paginationMeta && (
        <DataPagination meta={paginationMeta} onPageChange={setCurrentPage} />
      )}

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

      <Dialog open={showAddModal} onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false);
          setFormData({ userId: "", bookTitle: "", bookAuthor: "", bookPublisher: "" });
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Borrow</DialogTitle>
          </DialogHeader>
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
              onChange={(value) => setFormData({ ...formData, bookTitle: value })}
              onSearch={handleTitleSearch}
              options={[]}
              placeholder="Search by title..."
            />

            <SearchableSelect
              label="Author"
              required
              value={formData.bookAuthor}
              onChange={(value) => setFormData({ ...formData, bookAuthor: value })}
              onSearch={handleAuthorSearch}
              options={[]}
              placeholder="Search by author..."
            />

            <SearchableSelect
              label="Publisher"
              required
              value={formData.bookPublisher}
              onChange={(value) => setFormData({ ...formData, bookPublisher: value })}
              onSearch={handlePublisherSearch}
              options={[]}
              placeholder="Search by publisher..."
            />

            <DialogFooter>
              <Button type="submit">Create Borrow</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ userId: "", bookTitle: "", bookAuthor: "", bookPublisher: "" });
                }}
              >
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal && !!editingBorrow} onOpenChange={(open) => !open && setShowEditModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Due Date</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateBorrow} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                required
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Update</Button>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
