using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.Api.ApiController
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SupplierController : ControllerBase
    {
        private readonly ISupplierService _supplierService;

        public SupplierController(ISupplierService supplierService)
        {
            _supplierService = supplierService;
        }

        [HttpPost("create")]
        [Authorize]
        public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                {
                    return Unauthorized(new { message = "Không xác định được người dùng." });
                }

                var result = await _supplierService.CreateSupplierAsync(request, currentUserId);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("list-all")]
        public async Task<IActionResult> GetSuppliers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? supplierCode = null,
            [FromQuery] string? supplierName = null,
            [FromQuery] string? taxCode = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var result = await _supplierService.GetSuppliersAsync(
                page,
                pageSize,
                supplierCode,
                supplierName,
                taxCode,
                isActive,
                fromDate,
                toDate
            );

            return Ok(result);
        }

        [HttpPut("update/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateSupplier(long id, [FromBody] UpdateSupplierRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                {
                    return Unauthorized(new { message = "Không xác định được người dùng." });
                }

                var result = await _supplierService.UpdateSupplierAsync(id, request, currentUserId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("change-status/{id}")]
        [Authorize]
        public async Task<IActionResult> ToggleSupplierStatus(long id, [FromQuery] bool isActive)
        {
            try
            {
                var result = await _supplierService.ToggleSupplierStatusAsync(id, isActive);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy thông tin chi tiết nhà cung cấp (Get Supplier By ID)
        /// </summary>
        /// <param name="id">ID của nhà cung cấp</param>
        [HttpGet("get-supplier-by-id/{id}")]
        public async Task<IActionResult> GetSupplierById(long id)
        {
            try
            {
                var result = await _supplierService.GetSupplierByIdAsync(id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xem lịch sử giao dịch của nhà cung cấp (View Transaction History)
        /// </summary>
        /// <param name="id">ID của nhà cung cấp</param>
        /// <param name="page">Số trang</param>
        /// <param name="pageSize">Số lượng item mỗi trang</param>
        /// <param name="transactionType">Loại giao dịch (PO/GRN)</param>
        /// <param name="status">Trạng thái giao dịch</param>
        /// <param name="fromDate">Từ ngày</param>
        /// <param name="toDate">Đến ngày</param>
        /// <param name="detailType">Loại chi tiết (PO/GRN)</param>
        /// <param name="detailDocId">ID chứng từ chi tiết</param>
        [HttpGet("view-transaction-history/{id}")]
        public async Task<IActionResult> ViewTransactionHistory(
            long id,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? transactionType = null,
            [FromQuery] string? status = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? detailType = null,
            [FromQuery] long? detailDocId = null)
        {
            try
            {
                var result = await _supplierService.GetSupplierTransactionsAsync(
                    id, page, pageSize, transactionType, status, fromDate, toDate, detailType, detailDocId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
