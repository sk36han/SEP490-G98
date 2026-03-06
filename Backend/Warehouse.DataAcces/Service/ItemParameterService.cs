using System;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
	public class ItemParameterService : IItemParameterService
	{
		private readonly IGenericRepository<ItemParameter> _itemParameterRepository;
		private readonly IAuditLogService _auditLogService;

		// Regex for ParamCode: a-z, A-Z, 0-9, _, -
		private static readonly Regex _paramCodeRegex =
			new Regex(@"^[a-zA-Z0-9_\-]+$", RegexOptions.Compiled);

		public ItemParameterService(
			IGenericRepository<ItemParameter> itemParameterRepository,
			IAuditLogService auditLogService)
		{
			_itemParameterRepository = itemParameterRepository;
			_auditLogService = auditLogService;
		}

		// =====================================================================
		// CREATE
		// =====================================================================
		public async Task<object> CreateItemParameterAsync(CreateItemParameterRequest request, long currentUserId)
		{
			if (request == null)
				throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

			ValidateUserId(currentUserId);
			ValidateParamCode(request.ParamCode);
			ValidateParamName(request.ParamName);
			ValidateDataType(request.DataType);

			var paramCode = request.ParamCode.Trim();
			var paramName = request.ParamName.Trim();
			var dataType = request.DataType.Trim();

			var all = await _itemParameterRepository.GetAllAsync();
			if (all.Any(p => p.ParamCode.Equals(paramCode, StringComparison.OrdinalIgnoreCase)))
				throw new InvalidOperationException($"Mã thông số kỹ thuật '{paramCode}' đã tồn tại.");

			var itemParameter = new ItemParameter
			{
				ParamCode = paramCode,
				ParamName = paramName,
				DataType = dataType,
				IsActive = true
			};

			await _itemParameterRepository.CreateAsync(itemParameter);

			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Create,
				AuditEntity.ItemParameter,
				itemParameter.ParamId,
				$"Tạo mới thông số kỹ thuật '{itemParameter.ParamCode}'"
			);

			return ToResponse(itemParameter);
		}

		// =====================================================================
		// GET ALL (paged + filter)
		// =====================================================================
		public async Task<object> GetItemParametersAsync(
			int page,
			int pageSize,
			string? paramName,
			bool? isActive)
		{
			if (page <= 0)
				page = 1;

			if (pageSize <= 0)
				pageSize = 20;
			else if (pageSize > 100)
				throw new ArgumentException("Số lượng item mỗi trang không được vượt quá 100.");

			if (paramName != null && paramName.Trim().Length > 255)
				throw new ArgumentException("Từ khoá tìm kiếm không được vượt quá 255 ký tự.");

			var all = await _itemParameterRepository.GetAllAsync();
			var query = all.AsQueryable();

			if (!string.IsNullOrWhiteSpace(paramName))
			{
				var keyword = paramName.Trim();
				query = query.Where(p =>
					p.ParamName.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
					p.ParamCode.Contains(keyword, StringComparison.OrdinalIgnoreCase));
			}

			if (isActive.HasValue)
				query = query.Where(p => p.IsActive == isActive.Value);

			var totalItems = query.Count();

			var items = query
				.OrderBy(p => p.ParamId)
				.Skip((page - 1) * pageSize)
				.Take(pageSize)
				.Select(p => ToResponse(p))
				.ToList();

			return new PagedResponse<ItemParameterResponse>
			{
				Page = page,
				PageSize = pageSize,
				TotalItems = totalItems,
				Items = items
			};
		}

		// =====================================================================
		// GET BY ID
		// =====================================================================
		public async Task<object> GetItemParameterByIdAsync(long id)
		{
			ValidateParamId(id);

			var itemParameter = await _itemParameterRepository.GetByIdAsync(id);
			if (itemParameter == null)
				throw new KeyNotFoundException($"Không tìm thấy thông số kỹ thuật với ID = {id}.");

			return ToResponse(itemParameter);
		}

		// =====================================================================
		// UPDATE
		// =====================================================================
		public async Task<object> UpdateItemParameterAsync(long id, UpdateItemParameterRequest request, long currentUserId)
		{
			ValidateParamId(id);

			if (request == null)
				throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

			ValidateUserId(currentUserId);
			ValidateParamName(request.ParamName);
			ValidateDataType(request.DataType);

			var itemParameter = await _itemParameterRepository.GetByIdAsync(id);
			if (itemParameter == null)
				throw new KeyNotFoundException($"Không tìm thấy thông số kỹ thuật với ID = {id}.");

			var oldValues = JsonSerializer.Serialize(new { itemParameter.ParamName, itemParameter.DataType, itemParameter.IsActive });

			itemParameter.ParamName = request.ParamName.Trim();
			itemParameter.DataType = request.DataType.Trim();
			itemParameter.IsActive = request.IsActive;

			await _itemParameterRepository.UpdateAsync(itemParameter);

			var newValues = JsonSerializer.Serialize(new { itemParameter.ParamName, itemParameter.DataType, itemParameter.IsActive });
			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Update,
				AuditEntity.ItemParameter,
				itemParameter.ParamId,
				$"Cập nhật thông số kỹ thuật '{itemParameter.ParamCode}'",
				oldValues,
				newValues
			);

			return ToResponse(itemParameter);
		}

		// =====================================================================
		// TOGGLE STATUS
		// =====================================================================
		public async Task<object> ToggleItemParameterStatusAsync(long id, bool isActive)
		{
			ValidateParamId(id);

			var itemParameter = await _itemParameterRepository.GetByIdAsync(id);
			if (itemParameter == null)
				throw new KeyNotFoundException($"Không tìm thấy thông số kỹ thuật với ID = {id}.");

			if (itemParameter.IsActive == isActive)
			{
				var statusText = isActive ? "đang hoạt động" : "đã bị vô hiệu hóa";
				throw new InvalidOperationException($"Thông số kỹ thuật '{itemParameter.ParamCode}' hiện tại {statusText}. Không cần thay đổi.");
			}

			itemParameter.IsActive = isActive;
			await _itemParameterRepository.UpdateAsync(itemParameter);

			return ToResponse(itemParameter);
		}

		// =====================================================================
		// PRIVATE VALIDATORS
		// =====================================================================
		private static void ValidateParamId(long id)
		{
			if (id <= 0)
				throw new ArgumentException("ID thông số kỹ thuật phải là số nguyên dương.");
		}

		private static void ValidateUserId(long userId)
		{
			if (userId <= 0)
				throw new ArgumentException("ID người dùng không hợp lệ.");
		}

		private static void ValidateParamCode(string? paramCode)
		{
			if (string.IsNullOrWhiteSpace(paramCode))
				throw new ArgumentException("Mã thông số kỹ thuật không được để trống.");

			var trimmed = paramCode.Trim();

			if (trimmed.Length > 50)
				throw new ArgumentException("Mã thông số kỹ thuật không được vượt quá 50 ký tự.");

			if (!_paramCodeRegex.IsMatch(trimmed))
				throw new ArgumentException("Mã thông số kỹ thuật chỉ được chứa chữ cái, chữ số, dấu gạch ngang và dấu gạch dưới.");
		}

		private static void ValidateParamName(string? paramName)
		{
			if (string.IsNullOrWhiteSpace(paramName))
				throw new ArgumentException("Tên thông số kỹ thuật không được để trống.");

			var trimmed = paramName.Trim();

			if (trimmed.Length < 2)
				throw new ArgumentException("Tên thông số kỹ thuật phải có ít nhất 2 ký tự.");

			if (trimmed.Length > 255)
				throw new ArgumentException("Tên thông số kỹ thuật không được vượt quá 255 ký tự.");
		}

		private static void ValidateDataType(string? dataType)
		{
			if (string.IsNullOrWhiteSpace(dataType))
				throw new ArgumentException("Kiểu dữ liệu không được để trống.");

			var trimmed = dataType.Trim();

			if (trimmed.Length > 50)
				throw new ArgumentException("Kiểu dữ liệu không được vượt quá 50 ký tự.");
		}

		// =====================================================================
		// HELPER
		// =====================================================================
		private static ItemParameterResponse ToResponse(ItemParameter p) => new ItemParameterResponse
		{
			ParamId = p.ParamId,
			ParamCode = p.ParamCode,
			ParamName = p.ParamName,
			DataType = p.DataType,
			IsActive = p.IsActive
		};
	}
}
