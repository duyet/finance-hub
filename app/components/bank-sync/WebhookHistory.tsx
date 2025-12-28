/**
 * Webhook History Component
 * Shows table of webhook events
 */

interface WebhookEvent {
  id: string;
  provider: string;
  status: string;
  transactionsCreated: number;
  errorMessage: string | null;
  receivedAt: string;
  processedAt: string | null;
}

interface WebhookHistoryProps {
  events: WebhookEvent[];
}

export function WebhookHistory({ events }: WebhookHistoryProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      success: {
        color: "bg-green-100 text-green-800 border-green-200",
        label: "Success",
      },
      failed: {
        color: "bg-red-100 text-red-800 border-red-200",
        label: "Failed",
      },
      pending: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        label: "Pending",
      },
      processing: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        label: "Processing",
      },
      duplicate: {
        color: "bg-gray-100 text-gray-800 border-gray-200",
        label: "Duplicate",
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString();
  };

  const getProviderName = (provider: string) => {
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Webhook History</h3>
        <div className="text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p>No webhook events yet</p>
          <p className="text-sm mt-2">Webhooks will appear here when transactions are synced</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Webhook History</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Provider</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Transactions</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Received</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Processed</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Error</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-sm text-gray-900">
                  {getProviderName(event.provider)}
                </td>
                <td className="py-3 px-4">
                  {getStatusBadge(event.status)}
                </td>
                <td className="py-3 px-4 text-sm text-gray-900">
                  {event.transactionsCreated}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {formatDate(event.receivedAt)}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {formatDate(event.processedAt)}
                </td>
                <td className="py-3 px-4 text-sm text-red-600 max-w-xs truncate">
                  {event.errorMessage || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
