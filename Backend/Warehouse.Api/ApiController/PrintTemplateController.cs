using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.ApiController
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PrintTemplateController : ControllerBase
    {
        private readonly IPrintTemplateService _printTemplateService;

        public PrintTemplateController(IPrintTemplateService printTemplateService)
        {
            _printTemplateService = printTemplateService;
        }

        /// <summary>
        /// Lấy danh sách tất cả mẫu in, có thể lọc theo loại chứng từ.
        /// </summary>
        [HttpGet("list-all")]
        public async Task<IActionResult> GetAllTemplates([FromQuery] string? documentType = null)
        {
            try
            {
                var result = await _printTemplateService.GetAllTemplatesAsync(documentType);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Lấy chi tiết mẫu in theo ID.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTemplateById(long id)
        {
            try
            {
                var result = await _printTemplateService.GetTemplateByIdAsync(id);
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

        /// <summary>
        /// Lấy mẫu in mặc định theo loại chứng từ (GRN, GDN).
        /// </summary>
        [HttpGet("default/{documentType}")]
        public async Task<IActionResult> GetDefaultTemplate(string documentType)
        {
            try
            {
                var result = await _printTemplateService.GetDefaultTemplateAsync(documentType);
                if (result == null)
                    return NotFound(new { message = $"Không tìm thấy mẫu in mặc định cho loại chứng từ '{documentType}'." });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Tạo mẫu in mới.
        /// </summary>
        [HttpPost("create")]
        public async Task<IActionResult> CreateTemplate([FromBody] CreatePrintTemplateRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _printTemplateService.CreateTemplateAsync(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Cập nhật mẫu in.
        /// </summary>
        [HttpPut("update/{id}")]
        public async Task<IActionResult> UpdateTemplate(long id, [FromBody] UpdatePrintTemplateRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _printTemplateService.UpdateTemplateAsync(id, request);
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

        /// <summary>
        /// Xoá mẫu in theo ID.
        /// </summary>
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> DeleteTemplate(long id)
        {
            try
            {
                await _printTemplateService.DeleteTemplateAsync(id);
                return Ok(new { message = "Xoá mẫu in thành công." });
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

        /// <summary>
        /// Đặt mẫu in làm mặc định cho loại chứng từ tương ứng.
        /// </summary>
        [HttpPatch("set-default/{id}")]
        public async Task<IActionResult> SetDefaultTemplate(long id)
        {
            try
            {
                var result = await _printTemplateService.SetDefaultTemplateAsync(id);
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
    }
}
