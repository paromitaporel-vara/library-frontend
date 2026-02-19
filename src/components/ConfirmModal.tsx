interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {confirmText}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}
