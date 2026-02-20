"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Book } from "@/types";
import { useAuthStore } from "@/lib/auth";
import Modal from "@/components/Modal";

export default function BooksPage() {
  const { user } = useAuthStore();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    publisher: "",
    copies: 1,
  });

  useEffect(() => {
    fetchBooks();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchBooks(searchQuery, true);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const fetchBooks = async (query?: string, isSearching = false) => {
    try {
      if (!isSearching) {
        setIsLoading(true);
      }
      const endpoint = query ? `/books/search?q=${encodeURIComponent(query)}` : '/books';
      const response = await api.get<Book[]>(endpoint);
      setBooks(response.data);
      setError("");
    } catch (err: any) {
      setError("Failed to fetch books");
      console.error(err);
    } finally {
      if (!isSearching) {
        setIsLoading(false);
      }
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.post("/books", {
        ...formData,
      });

      setShowAddModal(false);

      setFormData({
        title: "",
        author: "",
        publisher: "",
        copies: 1,
      });

      fetchBooks();
    } catch (err: any) {
      setModalMessage(err.response?.data?.message || "Failed to delete book");
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm("Are you sure you want to delete this book?")) return;

    try {
      await api.delete(`/books/${id}`);
      fetchBooks();
    } catch (err: any) {
      setModalMessage(err.response?.data?.message || "Failed to delete book");
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading books...</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Books</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all books in the library
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          {user?.role === "ADMIN" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add Book
            </button>
          )}
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
          placeholder="Search by title, author, or publisher..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Title
                    </th>

                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Author
                    </th>

                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Publisher
                    </th>

                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Copies
                    </th>

                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Available
                    </th>

                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {books.map((book) => (
                    <tr key={book.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {book.title}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {book.author}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {book.publisher || '-'}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {book.copies}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {book.isAvailable ? (
                          <span className="text-green-600 font-medium">
                            Available
                          </span>
                        ) : (
                          <span className="text-red-600 font-medium">
                            Not Available
                          </span>
                        )}
                      </td>

                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        {user?.role === "ADMIN" && (
                          <button
                            onClick={() => handleDeleteBook(book.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Add New Book</h2>
            <form onSubmit={handleAddBook} className="space-y-4">
              <div>
                {modalMessage && (
                  <Modal
                    message={modalMessage}
                    onClose={() => setModalMessage(null)}
                  />
                )}

                <label className="block text-sm font-medium text-gray-700">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Author *
                </label>
                <input
                  type="text"
                  required
                  value={formData.author}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Publisher
                </label>
                <input
                  type="text"
                  value={formData.publisher}
                  onChange={(e) =>
                    setFormData({ ...formData, publisher: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Copies *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.copies}
                  onChange={(e) =>
                    setFormData({ ...formData, copies: Number(e.target.value) })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Book
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
