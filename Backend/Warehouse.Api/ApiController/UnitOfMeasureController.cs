using System;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.ApiController
{
    [Route("api/[controller]")]
    [ApiController]
    public class UnitOfMeasureController : ControllerBase
    {
        private readonly IUnitOfMeasureService _uomService;

        public UnitOfMeasureController(IUnitOfMeasureService uomService)
        {
            _uomService = uomService;
        }

        private long GetCurrentUserId()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (long.TryParse(idClaim, out var userId))
                return userId;

            throw new UnauthorizedAccessException("Không thể xác định người dùng hiện tại.");
        }

        /// <summary>
        /// Tạo mới đơn vị tính
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUnitOfMeasureRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _uomService.CreateUnitOfMeasureAsync(request, userId);
                return CreatedAtAction(nameof(GetById), new { id = result.UomId }, new
                {
                    success = true,
                    message = "Tạo đơn vị tính thành công.",
                    data = result
                });
            }
            catch (ArgumentException ex) { return BadRequest(new { success = false, message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { success = false, message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { success = false, message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { success = false, message = "Lỗi hệ thống nội bộ.", detail = ex.Message }); }
        }

        /// <summary>
        /// Lấy danh sách đơn vị tính có phân trang và filter
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery, StringLength(255)] string? keyword = null,
            [FromQuery] bool? isActive = null)
        {
            try
            {
                var result = await _uomService.GetUnitsOfMeasureAsync(page, pageSize, keyword, isActive);
                var message = result.Items.Count > 0
                    ? "Lấy danh sách đơn vị tính thành công."
                    : "Không tìm thấy đơn vị tính nào phù hợp.";

                return Ok(new
                {
                    success = true,
                    message = message,
                    data = result
                });
            }
            catch (ArgumentException ex) { return BadRequest(new { success = false, message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { success = false, message = "Lỗi hệ thống nội bộ.", detail = ex.Message }); }
        }

        /// <summary>
        /// Lấy thông tin đơn vị tính theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById([FromRoute] long id)
        {
            try
            {
                var result = await _uomService.GetUnitOfMeasureByIdAsync(id);
                return Ok(new
                {
                    success = true,
                    message = "Lấy thông tin thành công.",
                    data = result
                });
            }
            catch (ArgumentException ex) { return BadRequest(new { success = false, message = ex.Message }); }
            catch (System.Collections.Generic.KeyNotFoundException ex) { return NotFound(new { success = false, message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { success = false, message = "Lỗi hệ thống nội bộ.", detail = ex.Message }); }
        }

        /// <summary>
        /// Cập nhật thông tin đơn vị tính (Chỉ role 1 - Admin)
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "1")]
        public async Task<IActionResult> Update([FromRoute] long id, [FromBody] UpdateUnitOfMeasureRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _uomService.UpdateUnitOfMeasureAsync(id, request, userId);
                return Ok(new
                {
                    success = true,
                    message = "Cập nhật đơn vị tính thành công.",
                    data = result
                });
            }
            catch (ArgumentException ex) { return BadRequest(new { success = false, message = ex.Message }); }
            catch (System.Collections.Generic.KeyNotFoundException ex) { return NotFound(new { success = false, message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { success = false, message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { success = false, message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { success = false, message = "Lỗi hệ thống nội bộ.", detail = ex.Message }); }
        }

        /// <summary>
        /// Vô hiệu hoá / kích hoạt đơn vị tính (Chỉ role 1 - Admin)
        /// </summary>
        [HttpPatch("{id}/status")]
        [Authorize(Roles = "1")]
        public async Task<IActionResult> ToggleStatus([FromRoute] long id, [FromQuery] bool isActive)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _uomService.ToggleUnitOfMeasureStatusAsync(id, isActive, userId);
                var statusText = isActive ? "Kích hoạt" : "Vô hiệu hóa";
                return Ok(new
                {
                    success = true,
                    message = $"{statusText} đơn vị tính thành công.",
                    data = result
                });
            }
            catch (ArgumentException ex) { return BadRequest(new { success = false, message = ex.Message }); }
            catch (System.Collections.Generic.KeyNotFoundException ex) { return NotFound(new { success = false, message = ex.Message }); }
            catch (InvalidOperationException ex) { return Conflict(new { success = false, message = ex.Message }); }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { success = false, message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, new { success = false, message = "Lỗi hệ thống nội bộ.", detail = ex.Message }); }
        }
    }
}
