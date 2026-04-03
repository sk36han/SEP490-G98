using System.Threading.Tasks;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IAddressService
    {
        Task<AddressResponse> CreateAddressAsync(CreateAddressRequest request, long currentUserId);
        
        Task<PagedResponse<AddressResponse>> GetAddressesAsync(
            int page,
            int pageSize,
            long? companyId,
            string? keyword,
            bool? isActive);
            
        Task<AddressResponse> GetAddressByIdAsync(long id);
        
        Task<AddressResponse> UpdateAddressAsync(long id, UpdateAddressRequest request, long currentUserId);
        
        Task<AddressResponse> ToggleAddressStatusAsync(long id, bool isActive, long currentUserId);
        
        /// <summary>
        /// Lấy danh sách Địa chỉ theo Công ty (Dùng cho dropdown)
        /// </summary>
        Task<System.Collections.Generic.List<AddressResponse>> GetAddressesByCompanyAsync(long companyId);
    }
}
