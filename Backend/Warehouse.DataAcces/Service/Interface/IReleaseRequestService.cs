using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IReleaseRequestService
    {
        /// Tạo yêu cầu xuất kho
        Task<ReleaseRequestDetailResponse> CreateReleaseRequestAsync(long requestedByUserId, CreateReleaseRequestRequest request);

        /// Lấy danh sách yêu cầu xuất kho có phân trang
        Task<PagedResponse<ReleaseRequestResponse>> GetReleaseRequestsAsync(int page, int pageSize);

        /// Lấy chi tiết yêu cầu xuất kho theo ID
        Task<ReleaseRequestDetailResponse?> GetReleaseRequestByIdAsync(long id);

        /// Cập nhật yêu cầu xuất kho
        Task<ReleaseRequestDetailResponse> UpdateReleaseRequestAsync(long id, long userId, UpdateReleaseRequestRequest request);

        /// Gửi (Submit) yêu cầu xuất kho và chốt AllocatedQty
        Task<ReleaseRequestDetailResponse> SubmitReleaseRequestAsync(long id, long userId);

        /// Hủy yêu cầu xuất kho
        Task<bool> CancelReleaseRequestAsync(long id);
    }
}
