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
	public class UnitOfMeasureService : IUnitOfMeasureService
	{
		private readonly IGenericRepository<UnitOfMeasure> _uomRepository;
		private readonly IAuditLogService _auditLogService;

		// Chỉ cho phép chữ cái (unicode), chữ số, khoảng trắng, gạch ngang, dấu chấm, & và /
		private static readonly Regex _uomNameRegex =
			new Regex(@"^[\p{L}\p{N}\s\-\.\&/]+$", RegexOptions.Compiled);

		public UnitOfMeasureService(
			IGenericRepository<UnitOfMeasure> uomRepository,
			IAuditLogService auditLogService)
		{
			_uomRepository = uomRepository;
			_auditLogService = auditLogService;
		}

		// =====================================================================
		// CREATE
		// =====================================================================
		public async Task<UnitOfMeasureResponse> CreateUnitOfMeasureAsync(CreateUnitOfMeasureRequest request, long currentUserId)
		{
			if (request == null)
				throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

			ValidateUserId(currentUserId);
			ValidateUomName(request.UomName);

			var uomName = request.UomName.Trim();

			var all = await _uomRepository.GetAllAsync();

			if (all.Any(u => u.UomName.Trim().Equals(uomName, StringComparison.OrdinalIgnoreCase)))
				throw new InvalidOperationException($"Tên đơn vị tính '{uomName}' đã tồn tại.");

			var unitOfMeasure = new UnitOfMeasure
			{
				UomName = uomName,
				IsActive = true
			};

			await _uomRepository.CreateAsync(unitOfMeasure);

			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Create,
				AuditEntity.UnitOfMeasure,
				unitOfMeasure.UomId,
				$"Tạo đơn vị tính '{unitOfMeasure.UomName}'"
			);

			return ToResponse(unitOfMeasure);
		}

		// =====================================================================
		// GET ALL (paged + filter)
		// =====================================================================
		public async Task<PagedResponse<UnitOfMeasureResponse>> GetUnitsOfMeasureAsync(
			int page,
			int pageSize,
			string? keyword,
			bool? isActive)
		{
			if (page <= 0) page = 1;
			if (pageSize <= 0) pageSize = 20;
			else if (pageSize > 100)
				throw new ArgumentException("Số lượng item mỗi trang không được vượt quá 100.");

			if (keyword != null && keyword.Trim().Length > 255)
				throw new ArgumentException("Từ khoá tìm kiếm không được vượt quá 255 ký tự.");

			var all = await _uomRepository.GetAllAsync();
			var query = all.AsQueryable();

			if (!string.IsNullOrWhiteSpace(keyword))
			{
				var trimKeyword = keyword.Trim();
				query = query.Where(u =>
					u.UomName.Contains(trimKeyword, StringComparison.OrdinalIgnoreCase));
			}

			if (isActive.HasValue)
				query = query.Where(u => u.IsActive == isActive.Value);

			var totalItems = query.Count();

			var items = query
				.OrderBy(u => u.UomName)
				.Skip((page - 1) * pageSize)
				.Take(pageSize)
				.Select(u => ToResponse(u))
				.ToList();

			return new PagedResponse<UnitOfMeasureResponse>
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
		public async Task<UnitOfMeasureResponse> GetUnitOfMeasureByIdAsync(long id)
		{
			ValidateUomId(id);

			var all = await _uomRepository.GetAllAsync();
			var unitOfMeasure = all.FirstOrDefault(u => u.UomId == id);
			if (unitOfMeasure == null)
				throw new KeyNotFoundException($"Không tìm thấy đơn vị tính với ID = {id}.");

			return ToResponse(unitOfMeasure);
		}

		// =====================================================================
		// UPDATE
		// =====================================================================
		public async Task<UnitOfMeasureResponse> UpdateUnitOfMeasureAsync(long id, UpdateUnitOfMeasureRequest request, long currentUserId)
		{
			ValidateUomId(id);

			if (request == null)
				throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

			ValidateUserId(currentUserId);
			ValidateUomName(request.UomName);

			var uomName = request.UomName.Trim();

			var all = await _uomRepository.GetAllAsync();
			var unitOfMeasure = all.FirstOrDefault(u => u.UomId == id);
			if (unitOfMeasure == null)
				throw new KeyNotFoundException($"Không tìm thấy đơn vị tính với ID = {id}.");

			var oldValues = JsonSerializer.Serialize(new
			{
				unitOfMeasure.UomName,
				unitOfMeasure.IsActive
			});

			if (all.Any(u => u.UomId != id && u.UomName.Trim().Equals(uomName, StringComparison.OrdinalIgnoreCase)))
				throw new InvalidOperationException($"Tên đơn vị tính '{uomName}' đã tồn tại.");

			unitOfMeasure.UomName = uomName;
			unitOfMeasure.IsActive = request.IsActive;

			await _uomRepository.UpdateAsync(unitOfMeasure);

			var newValues = JsonSerializer.Serialize(new
			{
				unitOfMeasure.UomName,
				unitOfMeasure.IsActive
			});
			
			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Update,
				AuditEntity.UnitOfMeasure,
				unitOfMeasure.UomId,
				$"Cập nhật đơn vị tính '{unitOfMeasure.UomName}'",
				oldValues,
				newValues
			);

			return ToResponse(unitOfMeasure);
		}

		// =====================================================================
		// TOGGLE STATUS
		// =====================================================================
		public async Task<UnitOfMeasureResponse> ToggleUnitOfMeasureStatusAsync(long id, bool isActive, long currentUserId)
		{
			ValidateUomId(id);
			ValidateUserId(currentUserId);

			var all = await _uomRepository.GetAllAsync();
			var unitOfMeasure = all.FirstOrDefault(u => u.UomId == id);
			if (unitOfMeasure == null)
				throw new KeyNotFoundException($"Không tìm thấy đơn vị tính với ID = {id}.");

			if (unitOfMeasure.IsActive == isActive)
			{
				var statusText = isActive ? "đang hoạt động" : "đã bị vô hiệu hóa";
				throw new InvalidOperationException($"Đơn vị tính '{unitOfMeasure.UomName}' hiện tại {statusText}. Không cần thay đổi.");
			}

			unitOfMeasure.IsActive = isActive;
			await _uomRepository.UpdateAsync(unitOfMeasure);

			var statusLabel = isActive ? "kích hoạt" : "vô hiệu hóa";
			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Update,
				AuditEntity.UnitOfMeasure,
				unitOfMeasure.UomId,
				$"Đã {statusLabel} đơn vị tính '{unitOfMeasure.UomName}'"
			);

			return ToResponse(unitOfMeasure);
		}

		// =====================================================================
		// PRIVATE VALIDATORS
		// =====================================================================
		private static void ValidateUomId(long id)
		{
			if (id <= 0)
				throw new ArgumentException("ID đơn vị tính phải là số nguyên dương.");
		}

		private static void ValidateUserId(long userId)
		{
			if (userId <= 0)
				throw new ArgumentException("ID người dùng không hợp lệ.");
		}

		private static void ValidateUomName(string? uomName)
		{
			if (string.IsNullOrWhiteSpace(uomName))
				throw new ArgumentException("Tên đơn vị tính không được để trống.");

			var trimmed = uomName.Trim();

			if (trimmed.Length < 1)
				throw new ArgumentException("Tên đơn vị tính phải có ít nhất 1 ký tự.");

			if (trimmed.Length > 255)
				throw new ArgumentException("Tên đơn vị tính không được vượt quá 255 ký tự.");

			if (!_uomNameRegex.IsMatch(trimmed))
				throw new ArgumentException("Tên đơn vị tính chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.), ký tự & và /.");
		}

		// =====================================================================
		// HELPER
		// =====================================================================
		private static UnitOfMeasureResponse ToResponse(UnitOfMeasure u) => new UnitOfMeasureResponse
		{
			UomId = u.UomId,
			UomName = u.UomName,
			IsActive = u.IsActive
		};
	}
}
