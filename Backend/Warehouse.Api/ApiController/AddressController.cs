using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.Api.ApiController
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Example authorization requirement
    public class AddressController : ControllerBase
    {
        private readonly IAddressService _addressService;

        public AddressController(IAddressService addressService)
        {
            _addressService = addressService;
        }

        private long GetCurrentUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (long.TryParse(userIdStr, out var uId))
                return uId;
            return 1; // Fallback or throw error depending on design
        }

        [HttpPost]
        public async Task<IActionResult> CreateAddress([FromBody] CreateAddressRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _addressService.CreateAddressAsync(request, userId);
                return CreatedAtAction(nameof(GetAddressById), new { id = result.AddressId }, result);
            }
            catch (ArgumentException ex) { return BadRequest(new { Message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { Message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { Message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { Message = "Lỗi hệ thống.", Detail = ex.Message }); }
        }

        [HttpGet]
        public async Task<IActionResult> GetAddresses(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] long? companyId = null,
            [FromQuery] string? keyword = null,
            [FromQuery] bool? isActive = null)
        {
            try
            {
                var result = await _addressService.GetAddressesAsync(page, pageSize, companyId, keyword, isActive);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { Message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { Message = "Lỗi hệ thống.", Detail = ex.Message }); }
        }

        /// <summary>
        /// Lấy danh sách Địa chỉ theo Công ty (Dùng cho dropdown)
        /// </summary>
        [HttpGet("addressBycompany/{companyId}")]
        public async Task<IActionResult> GetAddressesByCompany(long companyId)
        {
            try
            {
                var result = await _addressService.GetAddressesByCompanyAsync(companyId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Đã xảy ra lỗi hệ thống.", detail = ex.Message });
            }
        }

        [HttpGet("getAddressbyid{id}")]
        public async Task<IActionResult> GetAddressById(long id)
        {
            try
            {
                var result = await _addressService.GetAddressByIdAsync(id);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { Message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { Message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { Message = "Lỗi hệ thống.", Detail = ex.Message }); }
        }

        [HttpPut("UpdateAddress{id}")]
        public async Task<IActionResult> UpdateAddress(long id, [FromBody] UpdateAddressRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _addressService.UpdateAddressAsync(id, request, userId);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { Message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { Message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { Message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { Message = "Lỗi hệ thống.", Detail = ex.Message }); }
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> ToggleAddressStatus(long id, [FromQuery] bool isActive)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _addressService.ToggleAddressStatusAsync(id, isActive, userId);
                return Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { Message = ex.Message }); }
            catch (InvalidOperationException ex) { return BadRequest(new { Message = ex.Message }); }
            catch (KeyNotFoundException ex) { return NotFound(new { Message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { Message = "Lỗi hệ thống.", Detail = ex.Message }); }
        }
    }
}
