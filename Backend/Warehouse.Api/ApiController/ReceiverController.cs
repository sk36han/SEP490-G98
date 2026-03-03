using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.Api.ApiController
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReceiverController : ControllerBase
    {
        private readonly IReceiverService _receiverService;

        public ReceiverController(IReceiverService receiverService)
        {
            _receiverService = receiverService;
        }

        [HttpPost("create")]
        [Authorize]
        public async Task<IActionResult> CreateReceiver([FromBody] CreateReceiverRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var result = await _receiverService.CreateReceiverAsync(request);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("list-all")]
        public async Task<IActionResult> GetReceivers(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? receiverCode = null,
            [FromQuery] string? receiverName = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var result = await _receiverService.GetReceiversAsync(
                page,
                pageSize,
                receiverCode,
                receiverName,
                isActive,
                fromDate,
                toDate
            );

            return Ok(result);
        }

        [HttpPut("update/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateReceiver(long id, [FromBody] UpdateReceiverRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var result = await _receiverService.UpdateReceiverAsync(id, request);
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
        public async Task<IActionResult> ToggleReceiverStatus(long id, [FromQuery] bool isActive)
        {
            try
            {
                var result = await _receiverService.ToggleReceiverStatusAsync(id, isActive);
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
        /// Lấy thông tin chi tiết người nhận (Get Receiver By ID)
        /// </summary>
        /// <param name="id">ID của người nhận</param>
        [HttpGet("get-receiver-by-id/{id}")]
        public async Task<IActionResult> GetReceiverById(long id)
        {
            try
            {
                var result = await _receiverService.GetReceiverByIdAsync(id);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xem lịch sử giao dịch của người nhận (View Transaction History)
        /// </summary>
        /// <param name="id">ID của người nhận</param>
        /// <param name="page">Số trang</param>
        /// <param name="pageSize">Số lượng item mỗi trang</param>
        /// <param name="transactionType">Loại giao dịch (RR/GDN)</param>
        /// <param name="status">Trạng thái giao dịch</param>
        /// <param name="fromDate">Từ ngày</param>
        /// <param name="toDate">Đến ngày</param>
        /// <param name="detailType">Loại chi tiết (RR/GDN)</param>
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
                var result = await _receiverService.GetReceiverTransactionsAsync(
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
