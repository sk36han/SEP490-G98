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
	public class CategoryService : ICategoryService
	{
		private readonly IGenericRepository<ItemCategory> _categoryRepository;
		private readonly IAuditLogService _auditLogService;

		// Chỉ cho phép chữ cái (unicode), chữ số, khoảng trắng, gạch ngang, dấu chấm, & và /
		private static readonly Regex _categoryNameRegex =
			new Regex(@"^[\p{L}\p{N}\s\-\.\&/]+$", RegexOptions.Compiled);

		// Chỉ cho phép chữ cái, chữ số, gạch dưới và gạch ngang
		private static readonly Regex _categoryCodeRegex =
			new Regex(@"^[A-Za-z0-9_\-]+$", RegexOptions.Compiled);

		public CategoryService(
			IGenericRepository<ItemCategory> categoryRepository,
			IAuditLogService auditLogService)
		{
			_categoryRepository = categoryRepository;
			_auditLogService = auditLogService;
		}

		// =====================================================================
		// CREATE
		// =====================================================================
		public async Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request, long currentUserId)
		{
			// 1️⃣ Validate input
			if (request == null)
				throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

			ValidateUserId(currentUserId);
			ValidateCategoryCode(request.CategoryCode);
			ValidateCategoryName(request.CategoryName);

			var categoryCode = request.CategoryCode.Trim();
			var categoryName = request.CategoryName.Trim();

			// 2️⃣ Kiểm tra mã danh mục trùng (case-insensitive)
			var all = await _categoryRepository.GetAllAsync();
			if (all.Any(c => c.CategoryCode.Trim().Equals(categoryCode, StringComparison.OrdinalIgnoreCase)))
				throw new InvalidOperationException($"Mã danh mục '{categoryCode}' đã tồn tại.");

			// 3️⃣ Kiểm tra tên danh mục trùng (case-insensitive) trong cùng cấp
			if (all.Any(c =>
				c.ParentId == request.ParentId &&
				c.CategoryName.Trim().Equals(categoryName, StringComparison.OrdinalIgnoreCase)))
			{
				throw new InvalidOperationException($"Tên danh mục '{categoryName}' đã tồn tại trong cùng cấp cha.");
			}

			// 4️⃣ Kiểm tra ParentId tồn tại nếu có
			if (request.ParentId.HasValue)
			{
				var parent = await _categoryRepository.GetByIdAsync(request.ParentId.Value);
				if (parent == null)
					throw new KeyNotFoundException($"Không tìm thấy danh mục cha với ID = {request.ParentId.Value}.");
			}

			// 5️⃣ Tạo entity
			var category = new ItemCategory
			{
				CategoryCode = categoryCode,
				CategoryName = categoryName,
				ParentId = request.ParentId,
				IsActive = true
			};

			// 6️⃣ Lưu
			await _categoryRepository.CreateAsync(category);

			// 7️⃣ Ghi audit log
			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Create,
				AuditEntity.Category,
				category.CategoryId,
				$"Tạo danh mục '{category.CategoryName}' (mã: {category.CategoryCode})"
			);

			// 8️⃣ Load parent để lấy tên
			var allAfter = await _categoryRepository.GetAllAsync();
			var parentEntity = category.ParentId.HasValue
				? allAfter.FirstOrDefault(c => c.CategoryId == category.ParentId.Value)
				: null;

			return ToResponse(category, parentEntity);
		}

		// =====================================================================
		// GET ALL (paged + filter)
		// =====================================================================
		public async Task<PagedResponse<CategoryResponse>> GetCategoriesAsync(
			int page,
			int pageSize,
			string? categoryName,
			bool? isActive)
		{
			// Validate & normalize pagination
			if (page <= 0)
				page = 1;

			if (pageSize <= 0)
				pageSize = 20;
			else if (pageSize > 100)
				throw new ArgumentException("Số lượng item mỗi trang không được vượt quá 100.");

			// Validate filter nếu có
			if (categoryName != null && categoryName.Trim().Length > 255)
				throw new ArgumentException("Từ khoá tìm kiếm không được vượt quá 255 ký tự.");

			var all = await _categoryRepository.GetAllAsync();
			var query = all.AsQueryable();

			// Tìm kiếm theo tên (partial, không phân biệt hoa thường)
			if (!string.IsNullOrWhiteSpace(categoryName))
			{
				var keyword = categoryName.Trim();
				query = query.Where(c =>
					c.CategoryName.Contains(keyword, StringComparison.OrdinalIgnoreCase) ||
					c.CategoryCode.Contains(keyword, StringComparison.OrdinalIgnoreCase));
			}

			// Lọc theo trạng thái
			if (isActive.HasValue)
				query = query.Where(c => c.IsActive == isActive.Value);

			var totalItems = query.Count();

			// Build a lookup for parent names
			var parentLookup = all.ToDictionary(c => c.CategoryId, c => c.CategoryName);

			var items = query
				.OrderBy(c => c.CategoryCode)
				.Skip((page - 1) * pageSize)
				.Take(pageSize)
				.Select(c => ToResponse(c, c.ParentId.HasValue && parentLookup.ContainsKey(c.ParentId.Value)
					? new ItemCategory { CategoryName = parentLookup[c.ParentId.Value] }
					: null))
				.ToList();

			return new PagedResponse<CategoryResponse>
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
		public async Task<CategoryResponse> GetCategoryByIdAsync(long id)
		{
			ValidateCategoryId(id);

			var all = await _categoryRepository.GetAllAsync();
			var category = all.FirstOrDefault(c => c.CategoryId == id);
			if (category == null)
				throw new KeyNotFoundException($"Không tìm thấy danh mục với ID = {id}.");

			var parentEntity = category.ParentId.HasValue
				? all.FirstOrDefault(c => c.CategoryId == category.ParentId.Value)
				: null;

			return ToResponse(category, parentEntity);
		}

		// =====================================================================
		// UPDATE
		// =====================================================================
		public async Task<CategoryResponse> UpdateCategoryAsync(long id, UpdateCategoryRequest request, long currentUserId)
		{
			// 1️⃣ Validate input
			ValidateCategoryId(id);

			if (request == null)
				throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

			ValidateUserId(currentUserId);
			ValidateCategoryCode(request.CategoryCode);
			ValidateCategoryName(request.CategoryName);

			var categoryCode = request.CategoryCode.Trim();
			var categoryName = request.CategoryName.Trim();

			// 2️⃣ Kiểm tra tồn tại
			var all = await _categoryRepository.GetAllAsync();
			var category = all.FirstOrDefault(c => c.CategoryId == id);
			if (category == null)
				throw new KeyNotFoundException($"Không tìm thấy danh mục với ID = {id}.");

			// Lưu giá trị cũ để audit log
			var oldValues = JsonSerializer.Serialize(new
			{
				category.CategoryCode,
				category.CategoryName,
				category.ParentId,
				category.IsActive
			});

			// 3️⃣ Kiểm tra mã trùng với danh mục khác
			if (all.Any(c =>
				c.CategoryId != id &&
				c.CategoryCode.Trim().Equals(categoryCode, StringComparison.OrdinalIgnoreCase)))
			{
				throw new InvalidOperationException($"Mã danh mục '{categoryCode}' đã tồn tại.");
			}

			// 4️⃣ Kiểm tra tên trùng trong cùng cấp cha
			if (all.Any(c =>
				c.CategoryId != id &&
				c.ParentId == request.ParentId &&
				c.CategoryName.Trim().Equals(categoryName, StringComparison.OrdinalIgnoreCase)))
			{
				throw new InvalidOperationException($"Tên danh mục '{categoryName}' đã tồn tại trong cùng cấp cha.");
			}

			// 5️⃣ Kiểm tra ParentId tồn tại nếu có
			if (request.ParentId.HasValue)
			{
				if (request.ParentId.Value == id)
					throw new InvalidOperationException("Danh mục không thể là cha của chính nó.");

				var parent = all.FirstOrDefault(c => c.CategoryId == request.ParentId.Value);
				if (parent == null)
					throw new KeyNotFoundException($"Không tìm thấy danh mục cha với ID = {request.ParentId.Value}.");
			}

			// 6️⃣ Cập nhật
			category.CategoryCode = categoryCode;
			category.CategoryName = categoryName;
			category.ParentId = request.ParentId;
			category.IsActive = request.IsActive;

			// 7️⃣ Lưu
			await _categoryRepository.UpdateAsync(category);

			// 8️⃣ Ghi audit log
			var newValues = JsonSerializer.Serialize(new
			{
				category.CategoryCode,
				category.CategoryName,
				category.ParentId,
				category.IsActive
			});
			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Update,
				AuditEntity.Category,
				category.CategoryId,
				$"Cập nhật danh mục '{category.CategoryName}' (mã: {category.CategoryCode})",
				oldValues,
				newValues
			);

			var parentEntity = category.ParentId.HasValue
				? all.FirstOrDefault(c => c.CategoryId == category.ParentId.Value)
				: null;

			return ToResponse(category, parentEntity);
		}

		// =====================================================================
		// TOGGLE STATUS
		// =====================================================================
		public async Task<CategoryResponse> ToggleCategoryStatusAsync(long id, bool isActive, long currentUserId)
		{
			// 1️⃣ Validate
			ValidateCategoryId(id);
			ValidateUserId(currentUserId);

			// 2️⃣ Kiểm tra tồn tại
			var all = await _categoryRepository.GetAllAsync();
			var category = all.FirstOrDefault(c => c.CategoryId == id);
			if (category == null)
				throw new KeyNotFoundException($"Không tìm thấy danh mục với ID = {id}.");

			// 3️⃣ Kiểm tra trùng trạng thái
			if (category.IsActive == isActive)
			{
				var statusText = isActive ? "đang hoạt động" : "đã bị vô hiệu hóa";
				throw new InvalidOperationException(
					$"Danh mục '{category.CategoryName}' hiện tại {statusText}. Không cần thay đổi.");
			}

			// 4️⃣ Cập nhật IsActive
			category.IsActive = isActive;

			// 5️⃣ Lưu
			await _categoryRepository.UpdateAsync(category);

			// 6️⃣ Ghi audit log
			var statusLabel = isActive ? "kích hoạt" : "vô hiệu hóa";
			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Update,
				AuditEntity.Category,
				category.CategoryId,
				$"Đã {statusLabel} danh mục '{category.CategoryName}' (mã: {category.CategoryCode})"
			);

			var parentEntity = category.ParentId.HasValue
				? all.FirstOrDefault(c => c.CategoryId == category.ParentId.Value)
				: null;

			return ToResponse(category, parentEntity);
		}

		// =====================================================================
		// PRIVATE VALIDATORS
		// =====================================================================

		/// <summary>
		/// Validate ID danh mục phải > 0.
		/// </summary>
		private static void ValidateCategoryId(long id)
		{
			if (id <= 0)
				throw new ArgumentException("ID danh mục phải là số nguyên dương.");
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
		/// Validate CategoryCode:
		///   - Không null / whitespace
		///   - Độ dài từ 2 đến 50 ký tự (sau khi trim)
		///   - Chỉ chứa chữ cái, chữ số, gạch dưới, gạch ngang
		/// </summary>
		private static void ValidateCategoryCode(string? categoryCode)
		{
			if (string.IsNullOrWhiteSpace(categoryCode))
				throw new ArgumentException("Mã danh mục không được để trống.");

			var trimmed = categoryCode.Trim();

			if (trimmed.Length < 2)
				throw new ArgumentException("Mã danh mục phải có ít nhất 2 ký tự.");

			if (trimmed.Length > 50)
				throw new ArgumentException("Mã danh mục không được vượt quá 50 ký tự.");

			if (!_categoryCodeRegex.IsMatch(trimmed))
				throw new ArgumentException(
					"Mã danh mục chỉ được chứa chữ cái, chữ số, dấu gạch dưới (_) và dấu gạch ngang (-).");
		}

		/// <summary>
		/// Validate CategoryName:
		///   - Không null / whitespace
		///   - Độ dài từ 2 đến 255 ký tự (sau khi trim)
		///   - Chỉ chứa chữ cái, chữ số, khoảng trắng, gạch ngang, dấu chấm, ký tự &amp; và /
		/// </summary>
		private static void ValidateCategoryName(string? categoryName)
		{
			if (string.IsNullOrWhiteSpace(categoryName))
				throw new ArgumentException("Tên danh mục không được để trống.");

			var trimmed = categoryName.Trim();

			if (trimmed.Length < 2)
				throw new ArgumentException("Tên danh mục phải có ít nhất 2 ký tự.");

			if (trimmed.Length > 255)
				throw new ArgumentException("Tên danh mục không được vượt quá 255 ký tự.");

			if (!_categoryNameRegex.IsMatch(trimmed))
				throw new ArgumentException(
					"Tên danh mục chỉ được chứa chữ cái, chữ số, khoảng trắng, dấu gạch ngang (-), dấu chấm (.), ký tự & và /.");
		}

		// =====================================================================
		// HELPER
		// =====================================================================
		private static CategoryResponse ToResponse(ItemCategory c, ItemCategory? parent) => new CategoryResponse
		{
			CategoryId = c.CategoryId,
			CategoryCode = c.CategoryCode,
			CategoryName = c.CategoryName,
			ParentId = c.ParentId,
			ParentName = parent?.CategoryName,
			IsActive = c.IsActive
		};
	}
}
