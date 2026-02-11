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

        [HttpPost]
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

        [HttpGet]
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

        [HttpPut("{id}")]
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

        [HttpPatch("{id}/status")]
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
    }
}
