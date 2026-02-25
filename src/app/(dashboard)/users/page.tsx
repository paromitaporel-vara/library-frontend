'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { User, PaginatedResponse, PaginationMeta } from '@/types';
import { useDebounce } from '@/hooks/use-debounce';
import ConfirmModal from '@/components/ConfirmModal';
import Modal from '@/components/Modal';
import DataPagination from '@/components/DataPagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showActiveBorrowsModal, setShowActiveBorrowsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers(debouncedSearch, true);
  }, [debouncedSearch, currentPage]);

  const fetchUsers = async (query?: string, isSearching = false) => {
    try {
      if (!isSearching) {
        setIsLoading(true);
      }
      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('limit', '10');
      if (query) params.append('q', query);
      const endpoint = query ? `/users/search?${params}` : `/users?${params}`;
      const response = await api.get<PaginatedResponse<User>>(endpoint);
      setUsers(response.data.data);
      setPaginationMeta(response.data.meta);
      setError('');
    } catch (err: any) {
      setError('Failed to fetch users');
      console.error(err);
    } finally {
      if (!isSearching) {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId || isDeleting) return;
    
    try {
      setIsDeleting(true);
      await api.delete(`/users/${deleteUserId}`);
      setDeleteUserId(null);
      fetchUsers();
    } catch (err: any) {
      setDeleteUserId(null);
      if (err.response?.data?.message?.includes('active borrows')) {
        setShowActiveBorrowsModal(true);
      } else {
        setError(err.response?.data?.message || 'Failed to delete user');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading users...</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all users registered in the system
          </p>
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
          placeholder="Search by name or email..."
        />
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Name</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Fine (₹)</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Created</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {user.name || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.email}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {user.role || 'User'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {user.fine ? `₹${user.fine.toFixed(2)}` : '₹0.00'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteUserId(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {paginationMeta && (
        <DataPagination meta={paginationMeta} onPageChange={setCurrentPage} />
      )}

      {deleteUserId && (
        <ConfirmModal
          title="Delete User"
          message="Are you sure you want to delete this user? This action cannot be undone and will also delete all their borrow history."
          onConfirm={handleDeleteUser}
          onCancel={() => setDeleteUserId(null)}
          confirmText={isDeleting ? "Deleting..." : "Delete"}
          cancelText="Cancel"
        />
      )}

      {showActiveBorrowsModal && (
        <Modal
          message="This user has active borrows and cannot be deleted. Please ensure all books are returned before deleting the user."
          onClose={() => setShowActiveBorrowsModal(false)}
        />
      )}
    </div>
  );
}
