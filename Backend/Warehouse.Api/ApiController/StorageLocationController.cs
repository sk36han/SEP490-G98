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
    public class StorageLocationController : ControllerBase
    {
        private readonly IStorageLocationService _storageLocationService;

        public StorageLocationController(IStorageLocationService storageLocationService)
        {
            _storageLocationService = storageLocationService;
        }

        [HttpGet("list-all-storage-location")]
        public async Task<IActionResult> GetStorageLocations(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] long? warehouseId = null,
            [FromQuery] string? keyword = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] bool? hasStock = null,
            [FromQuery] string? itemCode = null,
            [FromQuery] decimal? minQty = null,
            [FromQuery] decimal? maxQty = null)
        {
            try
            {
                var result = await _storageLocationService.GetStorageLocationsAsync(
                    page, pageSize, warehouseId, keyword, isActive, hasStock, itemCode, minQty, maxQty);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("{id:long}/ledger")]
        public async Task<IActionResult> GetLocationLedger(
            long id,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            try
            {
                var result = await _storageLocationService.GetLocationLedgerAsync(id, page, pageSize);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("get-storage-location-by-id/{id:long}")]
        public async Task<IActionResult> GetStorageLocationById(long id)
        {
            try
            {
                var result = await _storageLocationService.GetStorageLocationByIdAsync(id);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost("create-storage-location")]
        [Authorize(Roles = "GD,KT,Admin,TK,SE")]
        public async Task<IActionResult> CreateStorageLocation([FromBody] CreateStorageLocationRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                    return Unauthorized(new { message = "Không xác định được người dùng." });

                var result = await _storageLocationService.CreateStorageLocationAsync(request, currentUserId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
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

        [HttpPut("update-storage-location/{id:long}")]
        [Authorize(Roles = "GD,KT,Admin,TK,SE")]
        public async Task<IActionResult> UpdateStorageLocation(long id, [FromBody] UpdateStorageLocationRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                    return Unauthorized(new { message = "Không xác định được người dùng." });

                var result = await _storageLocationService.UpdateStorageLocationAsync(id, request, currentUserId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
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

        [HttpPatch("change-status-storage-location/{id:long}")]
        [Authorize(Roles = "GD,KT,Admin,TK,SE")]
        public async Task<IActionResult> ToggleStorageLocationStatus(long id, [FromQuery] bool isActive)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim == null || !long.TryParse(userIdClaim.Value, out var currentUserId))
                    return Unauthorized(new { message = "Không xác định được người dùng." });

                var result = await _storageLocationService.ToggleStorageLocationStatusAsync(id, isActive, currentUserId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
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
