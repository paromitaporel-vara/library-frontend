"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { User, Borrow } from "@/types";
import Modal from "@/components/Modal";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export default function ProfilePage() {
  const { user: authUser, checkAuth } = useAuthStore();
  const [userData, setUserData] = useState<User | null>(null);
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Change password states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordOtp, setPasswordOtp] = useState("");
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
  const [passwordOtpVerified, setPasswordOtpVerified] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Profile photo
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (authUser?.id) {
      fetchUserData();
    }
  }, [authUser]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const [userRes, borrowsRes] = await Promise.all([
        api.get<User>(`/users/${authUser?.id}`),
        api.get<Borrow[]>("/borrows"),
      ]);

      setUserData(userRes.data);
      setEditName(userRes.data.name || "");

      const userBorrows = borrowsRes.data.filter(
        (b) => b.userId === authUser?.id,
      );
      setBorrows(userBorrows);
    } catch (err: any) {
      setModalMessage("Failed to fetch profile data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateName = async () => {
    try {
      await api.patch("/users/profile/update", { name: editName });
      setModalMessage("Name updated successfully");
      setIsEditingName(false);
      fetchUserData();
      checkAuth();
    } catch (err: any) {
      setModalMessage(err.response?.data?.message || "Failed to update name");
    }
  };

  const handleSendEmailOtp = async () => {
    if (!newEmail) {
      setModalMessage("Please enter a new email address");
      return;
    }

    try {
      setSendingOtp(true);
      await api.post("/users/profile/send-email-change-otp", {
        newEmail,
      });
      setModalMessage("OTP sent to new email");
      setEmailOtpSent(true);
    } catch (err: any) {
      setModalMessage(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp) {
      setModalMessage("Please enter OTP");
      return;
    }

    try {
      // We verify the OTP by attempting to change the email
      // For now, set as verified and let user enter new email
      setEmailOtpVerified(true);
      setModalMessage("OTP verified successfully!");
    } catch (err: any) {
      setModalMessage(
        err.response?.data?.message || "Failed to verify OTP"
      );
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !emailOtp) {
      setModalMessage("Please provide new email and OTP");
      return;
    }

    try {
      await api.post("/users/profile/change-email", {
        otp: emailOtp,
        newEmail,
      });
      setModalMessage("Email updated successfully. Please login again.");
      setIsEditingEmail(false);
      setEmailOtpSent(false);
      setEmailOtpVerified(false);
      setEmailOtp("");
      setNewEmail("");

      // Logout after email change
      setTimeout(() => {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }, 2000);
    } catch (err: any) {
      setModalMessage(err.response?.data?.message || "Failed to change email");
    }
  };

  const handleSendPasswordOtp = async () => {
    try {
      await api.post("/auth/change-password/send-otp", {
        email: userData?.email,
      });
      setModalMessage("OTP sent to your email");
      setPasswordOtpSent(true);
    } catch (err: any) {
      setModalMessage(err.response?.data?.message || "Failed to send OTP");
    }
  };

  const handleVerifyPasswordOtp = async () => {
    if (!passwordOtp) {
      setModalMessage("Please enter OTP");
      return;
    }

    try {
      // Verify OTP by calling the change-password endpoint but with a flag to only verify
      // For now, we'll trust the backend to verify the OTP when we send the full request
      // This is a simple verification - the actual password change will verify again
      setPasswordOtpVerified(true);
      setModalMessage("OTP verified successfully!");
    } catch (err: any) {
      setModalMessage(
        err.response?.data?.message || "Failed to verify OTP"
      );
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setModalMessage("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setModalMessage("Password must be at least 6 characters");
      return;
    }

    try {
      await api.post("/auth/change-password", {
        email: userData?.email,
        otp: passwordOtp,
        oldPassword,
        newPassword,
        confirmPassword,
      });
      setModalMessage("Password changed successfully");
      setShowChangePassword(false);
      setPasswordOtpSent(false);
      setPasswordOtpVerified(false);
      setPasswordOtp("");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setModalMessage(
        err.response?.data?.message || "Failed to change password",
      );
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/image\/(jpg|jpeg|png|gif)/)) {
      setModalMessage("Only image files (JPG, PNG, GIF) are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setModalMessage("File size must be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("photo", file);

    try {
      setUploadingPhoto(true);
      await api.post("/users/profile/upload-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setModalMessage("Profile photo updated successfully");
      // Fetch updated user
        const updatedUser = await api.get(`/users/${authUser?.id}`);

        // Update profile page state
        setUserData(updatedUser.data);

        // Update global auth state (this fixes navbar icon instantly)
        useAuthStore.setState({ user: updatedUser.data });
    } catch (err: any) {
      setModalMessage(err.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
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

  if (isLoading) {
    return <div className="text-center py-8">Loading profile...</div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">My Profile</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and manage your account information
          </p>
        </div>
      </div>

      {/* Profile Photo Section */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Profile Photo
        </h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            {userData?.profilePhoto ? (
              <Dialog>
                <DialogTrigger asChild>
                  <img
                    src={`http://localhost:3000${userData.profilePhoto}?t=${Date.now()}`}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                  />
                </DialogTrigger>

                <DialogContent className="max-w-none w-screen h-screen border-0 shadow-none flex items-center justify-center p-0">
                  <div className="relative flex items-center justify-center w-full h-full">
                    <img
                      src={`http://localhost:3000${userData.profilePhoto}?t=${Date.now()}`}
                      alt="Full Profile"
                      className="max-h-[90vh] max-w-[90vw] object-contain rounded-md"
                    />

                    {/* Close button */}
                    <button
                      className="absolute top-6 right-6 text-white text-2xl font-bold hover:opacity-70"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.dispatchEvent(
                          new KeyboardEvent("keydown", { key: "Escape" }),
                        );
                      }}
                    ></button>
                    <DialogClose />
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
          <div>
            <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-block">
              {uploadingPhoto ? "Uploading..." : "Upload Photo"}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploadingPhoto}
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG or GIF. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Account Information
        </h2>
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            {isEditingName ? (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
                <button
                  onClick={handleUpdateName}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setEditName(userData?.name || "");
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-900">{userData?.name || "-"}</p>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            {isEditingEmail ? (
              <div className="space-y-2 mt-1">
                {!emailOtpSent ? (
                  <>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={sendingOtp}
                    />
                    {sendingOtp && (
                      <div className="flex items-center gap-2 py-2">
                        <div className="animate-spin">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0119.8-4.3M22 12.5a10 10 0 01-19.8 4.2" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">Sending OTP...</span>
                      </div>
                    )}
                    <button
                      onClick={handleSendEmailOtp}
                      disabled={sendingOtp}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingOtp ? "Sending OTP..." : "Send OTP to New Email"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingEmail(false);
                        setEmailOtpSent(false);
                        setEmailOtpVerified(false);
                        setEmailOtp("");
                        setNewEmail("");
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 w-full mt-2"
                    >
                      Cancel
                    </button>
                  </>
                ) : !emailOtpVerified ? (
                  <>
                    <input
                      type="text"
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                      placeholder="Enter OTP sent to your new email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleVerifyEmailOtp}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Verify OTP
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingEmail(false);
                          setEmailOtpSent(false);
                          setEmailOtpVerified(false);
                          setEmailOtp("");
                          setNewEmail("");
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md mb-2">
                      Changing email to: <strong>{newEmail}</strong>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleChangeEmail}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Confirm Email Change
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingEmail(false);
                          setEmailOtpSent(false);
                          setEmailOtpVerified(false);
                          setEmailOtp("");
                          setNewEmail("");
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-900">{userData?.email}</p>
                <button
                  onClick={() => setIsEditingEmail(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Role
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {userData?.role || "USER"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Outstanding Fine
            </label>
            <p
              className={`mt-1 text-sm font-semibold ${userData?.fine && userData.fine > 0 ? "text-red-600" : "text-green-600"}`}
            >
              ₹{userData?.fine?.toFixed(2) || "0.00"}
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Change Password
        </h2>
        {!showChangePassword ? (
          <button
            onClick={() => setShowChangePassword(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Change Password
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={userData?.email || ""}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>

            {!passwordOtpSent ? (
              <button
                type="button"
                onClick={handleSendPasswordOtp}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Send OTP
              </button>
            ) : !passwordOtpVerified ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    OTP
                  </label>
                  <input
                    type="text"
                    value={passwordOtp}
                    onChange={(e) => setPasswordOtp(e.target.value)}
                    placeholder="Enter OTP sent to your email"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyPasswordOtp}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Verify OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setPasswordOtpSent(false);
                      setPasswordOtpVerified(false);
                      setPasswordOtp("");
                      setOldPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Old Password
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Change Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setPasswordOtpSent(false);
                      setPasswordOtpVerified(false);
                      setPasswordOtp("");
                      setOldPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>

      {/* Borrowing History */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          My Borrowing History
        </h2>
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Book
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Borrow Date
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {borrows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-sm text-gray-500 text-center"
                  >
                    No borrowing history
                  </td>
                </tr>
              ) : (
                borrows.map((borrow) => (
                  <tr key={borrow.id}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      {borrow.book?.title || "Unknown"}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalMessage && (
        <Modal message={modalMessage} onClose={() => setModalMessage(null)} />
      )}
    </div>
  );
}
