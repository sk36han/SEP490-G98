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
	public class BrandService : IBrandService
	{
		private readonly IGenericRepository<Brand> _brandRepository;
		private readonly IAuditLogService _auditLogService;

		// Chỉ cho phép chữ cái (unicode), chữ số, khoảng trắng, gạch ngang, chấm, &
		private static readonly Regex _brandNameRegex =
			new Regex(@"^[\p{L}\p{N}\s\-\.\&]+$", RegexOptions.Compiled);

		public BrandService(
			IGenericRepository<Brand> brandRepository,
			IAuditLogService auditLogService)
		{
			_brandRepository = brandRepository;
			_auditLogService = auditLogService;
		}

		// =====================================================================
		// CREATE
		// =====================================================================
		public async Task<BrandResponse> CreateBrandAsync(CreateBrandRequest request, long currentUserId)
		{
			// 1️⃣ Validate input
			if (request == null)
				throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

			ValidateUserId(currentUserId);
			ValidateBrandName(request.BrandName);

			var brandName = request.BrandName.Trim();

			// 2️⃣ Kiểm tra trùng tên (case-insensitive)
			var all = await _brandRepository.GetAllAsync();
			if (all.Any(b => b.BrandName.Trim().Equals(brandName, StringComparison.OrdinalIgnoreCase)))
				throw new InvalidOperationException($"Thương hiệu '{brandName}' đã tồn tại.");

			// 3️⃣ Tạo entity
			var brand = new Brand
			{
				BrandName = brandName,
				IsActive = true
			};

			// 4️⃣ Lưu
			await _brandRepository.CreateAsync(brand);

			// 5️⃣ Ghi audit log
			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Create,
				AuditEntity.Brand,
				brand.BrandId,
				$"Tạo thương hiệu '{brand.BrandName}'"
			);

			return ToResponse(brand);
		}

		// =====================================================================
		// GET ALL (paged + filter)
		// =====================================================================
		public async Task<PagedResponse<BrandResponse>> GetBrandsAsync(
			int page,
			int pageSize,
			string? brandName,
			bool? isActive)
		{
			// Validate & normalize pagination
			if (page <= 0)
				page = 1;

			if (pageSize <= 0)
				pageSize = 20;
			else if (pageSize > 100)
				throw new ArgumentException("Số lượng item mỗi trang không được vượt quá 100.");

			// Validate brandName filter nếu có
			if (brandName != null)
			{
				if (brandName.Trim().Length > 255)
					throw new ArgumentException("Từ khoá tìm kiếm không được vượt quá 255 ký tự.");
			}

			var all = await _brandRepository.GetAllAsync();
			var query = all.AsQueryable();

			// Tìm kiếm theo tên (partial, không phân biệt hoa thường)
			if (!string.IsNullOrWhiteSpace(brandName))
			{
				var keyword = brandName.Trim();
				query = query.Where(b =>
					b.BrandName.Contains(keyword, StringComparison.OrdinalIgnoreCase));
			}

			// Lọc theo trạng thái
			if (isActive.HasValue)
				query = query.Where(b => b.IsActive == isActive.Value);

			var totalItems = query.Count();

			var items = query
				.OrderBy(b => b.BrandName)
				.Skip((page - 1) * pageSize)
				.Take(pageSize)
				.Select(b => ToResponse(b))
				.ToList();

			return new PagedResponse<BrandResponse>
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
		public async Task<BrandResponse> GetBrandByIdAsync(long id)
		{
			ValidateBrandId(id);

			var brand = await _brandRepository.GetByIdAsync(id);
			if (brand == null)
				throw new KeyNotFoundException($"Không tìm thấy thương hiệu với ID = {id}.");

			return ToResponse(brand);
		}

		// =====================================================================
		// UPDATE
		// =====================================================================
		public async Task<BrandResponse> UpdateBrandAsync(long id, UpdateBrandRequest request, long currentUserId)
		{
			// 1️⃣ Validate input
			ValidateBrandId(id);

			if (request == null)
				throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

			ValidateUserId(currentUserId);
			ValidateBrandName(request.BrandName);

			var brandName = request.BrandName.Trim();

			// 2️⃣ Kiểm tra tồn tại
			var brand = await _brandRepository.GetByIdAsync(id);
			if (brand == null)
				throw new KeyNotFoundException($"Không tìm thấy thương hiệu với ID = {id}.");

			// Lưu giá trị cũ để audit log
			var oldValues = JsonSerializer.Serialize(new { brand.BrandName, brand.IsActive });

			// 3️⃣ Kiểm tra trùng tên với brand khác (case-insensitive)
			var all = await _brandRepository.GetAllAsync();
			if (all.Any(b =>
				b.BrandId != id &&
				b.BrandName.Trim().Equals(brandName, StringComparison.OrdinalIgnoreCase)))
			{
				throw new InvalidOperationException($"Thương hiệu '{brandName}' đã tồn tại.");
			}

			// 4️⃣ Cập nhật
			brand.BrandName = brandName;
			brand.IsActive = request.IsActive;

			// 5️⃣ Lưu
			await _brandRepository.UpdateAsync(brand);

			// 6️⃣ Ghi audit log
			var newValues = JsonSerializer.Serialize(new { brand.BrandName, brand.IsActive });
			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Update,
				AuditEntity.Brand,
				brand.BrandId,
				$"Cập nhật thương hiệu '{brand.BrandName}'",
				oldValues,
				newValues
			);

			return ToResponse(brand);
		}

		// =====================================================================
		// TOGGLE STATUS
		// =====================================================================
		public async Task<BrandResponse> ToggleBrandStatusAsync(long id, bool isActive)
		{
			// 1️⃣ Validate ID
			ValidateBrandId(id);

			// 2️⃣ Kiểm tra tồn tại
			var brand = await _brandRepository.GetByIdAsync(id);
			if (brand == null)
				throw new KeyNotFoundException($"Không tìm thấy thương hiệu với ID = {id}.");

			// 3️⃣ Kiểm tra trùng trạng thái
			if (brand.IsActive == isActive)
			{
				var statusText = isActive ? "đang hoạt động" : "đã bị vô hiệu hóa";
				throw new InvalidOperationException(
					$"Thương hiệu '{brand.BrandName}' hiện tại {statusText}. Không cần thay đổi.");
			}

			// 4️⃣ Chỉ cập nhật IsActive
			brand.IsActive = isActive;

			// 5️⃣ Lưu
			await _brandRepository.UpdateAsync(brand);

			return ToResponse(brand);
		}

		// =====================================================================
		// PRIVATE VALIDATORS
		// =====================================================================

		/// <summary>
		/// Validate ID thương hiệu phải > 0.
		/// </summary>
		private static void ValidateBrandId(long id)
		{
			if (id <= 0)
				throw new ArgumentException("ID thương hiệu phải là số nguyên dương.");
		}

		/// <summary>
		/// Validate người dùng thực hiện thao tác phải có ID hợp lệ.
		/// </summary>
		private static void ValidateUserId(long userId)
		{
			if (userId <= 0)
				throw new ArgumentException("ID người dùng không hợp lệ.");
		}

		/// <summary>
		/// Validate BrandName:
		///   - Không null / whitespace
		///   - Độ dài từ 2 đến 255 ký tự (sau khi trim)
		///   - Chỉ chứa chữ cái, chữ số, khoảng trắng, gạch ngang, dấu chấm, ký tự &
		///   - Không bắt đầu hoặc kết thúc bằng khoảng trắng (sau trim sẽ OK, nhưng log thêm rõ)
		/// </summary>
		private static void ValidateBrandName(string? brandName)
		{
			if (string.IsNullOrWhiteSpace(brandName))
				throw new ArgumentException("Tên thương hiệu không được để trống.");

			var trimmed = brandName.Trim();

			if (trimmed.Length < 2)
				throw new ArgumentException("Tên thương hiệu phải có ít nhất 2 ký tự.");

			if (trimmed.Length > 255)
				throw new ArgumentException("Tên thương hiệu không được vượt quá 255 ký tự.");

			if (!_brandNameRegex.IsMatch(trimmed))
				throw new ArgumentException(
					"Tên thương hiệu chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.) và ký tự &.");
		}

		// =====================================================================
		// HELPER
		// =====================================================================
		private static BrandResponse ToResponse(Brand b) => new BrandResponse
		{
			BrandId = b.BrandId,
			BrandName = b.BrandName,
			IsActive = b.IsActive
		};
	}
}
