using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
    public interface IApprovalService
    {
        Task<PagedResult<ApprovalQueueResponse>> GetPendingApprovalsAsync(ApprovalQueueFilterRequest filter);
        Task<ApprovalResult> ApproveRequestAsync(string requestType, long requestId, long currentUserId, string reason = null);
        Task<ApprovalResult> RejectRequestAsync(string requestType, long requestId, long currentUserId, string reason = null);
        Task<object?> GetRequestDetailAsync(string requestType, long requestId);
    }
}
