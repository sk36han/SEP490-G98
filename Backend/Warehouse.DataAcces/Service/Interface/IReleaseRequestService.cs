using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IReleaseRequestService
    {
        /// <summary>
        /// Tạo yêu cầu xuất kho
        /// </summary>
        Task<ReleaseRequestDetailResponse> CreateReleaseRequestAsync(long requestedByUserId, CreateReleaseRequestRequest request);

        /// <summary>
        /// Lấy danh sách yêu cầu xuất kho có phân trang
        /// </summary>
        Task<PagedResponse<ReleaseRequestResponse>> GetReleaseRequestsAsync(int page, int pageSize);

        /// <summary>
        /// Lấy chi tiết yêu cầu xuất kho theo ID
        /// </summary>
        Task<ReleaseRequestDetailResponse?> GetReleaseRequestByIdAsync(long id);

        /// <summary>
        /// Cập nhật yêu cầu xuất kho
        /// </summary>
        Task<ReleaseRequestDetailResponse> UpdateReleaseRequestAsync(long id, long userId, UpdateReleaseRequestRequest request);

        /// <summary>
        /// Gửi (Submit) yêu cầu xuất kho và chốt AllocatedQty
        /// </summary>
        Task<ReleaseRequestDetailResponse> SubmitReleaseRequestAsync(long id, long userId);
    }
}
