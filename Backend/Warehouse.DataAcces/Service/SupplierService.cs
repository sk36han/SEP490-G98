using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelResponse;
using Warehouse.Entities.ModelRequest;

namespace Warehouse.DataAcces.Service
{
    public class SupplierService :  ISupplierService
    {
        private readonly IGenericRepository<Supplier> _supplierRepository;
        private readonly Mkiwms5Context _context;

		private readonly INotificationService _notificationService;
		private readonly IAuditLogService _auditLogService;

		// Các role sẽ nhận thông báo về supplier
		private static readonly string[] _notifyRoleCodes = { "ADMIN", "GD", "SALE SP" };

		public SupplierService(IGenericRepository<Supplier> supplierRepository, INotificationService notificationService, IAuditLogService auditLogService)
		{
			_supplierRepository = supplierRepository;
			_notificationService = notificationService;
			_auditLogService = auditLogService;

		}

		public async Task<SupplierResponse> CreateSupplierAsync(CreateSupplierRequest request, long currentUserId)
		{
			// 1️⃣ Check duplicate SupplierCode
			var suppliers = await _supplierRepository.GetAllAsync();
			if (suppliers.Any(s => s.SupplierCode == request.SupplierCode))
			{
				throw new InvalidOperationException("Supplier code already exists");
			}

			// 2️⃣ Create entity
			var supplier = new Supplier
			{
				SupplierCode = request.SupplierCode,
				SupplierName = request.SupplierName,
				TaxCode = request.TaxCode,
				Phone = request.Phone,
				Email = request.Email,
				Address = request.Address,
				City = request.City,
				Ward = request.Ward,
				IsActive = true,
				CreatedAt = DateTime.UtcNow
			};

			// 3️⃣ Save
			await _supplierRepository.CreateAsync(supplier);

			// 4️⃣ Gửi thông báo cho Admin, Giám đốc, Sale Support
			await _notificationService.CreateForRolesAsync(
				_notifyRoleCodes,
				"Nhà cung cấp mới",
				$"Nhà cung cấp '{supplier.SupplierName}' (Mã: {supplier.SupplierCode}) đã được tạo.",
				"SUPPLIER",
				supplier.SupplierId,
				excludeUserId: currentUserId
			);

			// 5️⃣ Ghi audit log
			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Create,
				AuditEntity.Supplier,
				supplier.SupplierId,
				$"Tạo nhà cung cấp '{supplier.SupplierName}' (Mã: {supplier.SupplierCode})"
			);

			// 6️⃣ Return response
			return new SupplierResponse
			{
				SupplierId = supplier.SupplierId,
				SupplierCode = supplier.SupplierCode,
				SupplierName = supplier.SupplierName,
				TaxCode = supplier.TaxCode,
				Phone = supplier.Phone,
				Email = supplier.Email,
				Address = supplier.Address,
				City = supplier.City,
				Ward = supplier.Ward,
				IsActive = supplier.IsActive
			};
		}

		public async Task<PagedResponse<SupplierResponse>> GetSuppliersAsync(
			int page,
			int pageSize,
			string? supplierCode,
			string? supplierName,
			string? taxCode,
			bool? isActive,
			DateTime? fromDate,
			DateTime? toDate)
		{
			// Safety
			if (page <= 0) page = 1;
			if (pageSize <= 0) pageSize = 20;

			// 1. Get all
			var suppliers = await _supplierRepository.GetAllAsync();
			var query = suppliers.AsQueryable();

			// 2. SEARCH (tách field)
			if (!string.IsNullOrWhiteSpace(supplierCode))
			{
				query = query.Where(s =>
					s.SupplierCode != null &&
					s.SupplierCode.Contains(supplierCode));
			}

			if (!string.IsNullOrWhiteSpace(supplierName))
			{
				query = query.Where(s =>
					s.SupplierName.Contains(supplierName));
			}

			if (!string.IsNullOrWhiteSpace(taxCode))
			{
				query = query.Where(s =>
					s.TaxCode != null &&
					s.TaxCode.Contains(taxCode));
			}

			// 3. FILTER
			if (isActive.HasValue)
			{
				query = query.Where(s => s.IsActive == isActive.Value);
			}

			if (fromDate.HasValue)
			{
				query = query.Where(s => s.CreatedAt >= fromDate.Value);
			}

			if (toDate.HasValue)
			{
				query = query.Where(s => s.CreatedAt <= toDate.Value);
			}

			// 4. Total after search + filter
			var totalItems = query.Count();

			// 5. Paging
			var items = query
				.OrderBy(s => s.SupplierName)
				.Skip((page - 1) * pageSize)
				.Take(pageSize)
				.Select(s => new SupplierResponse
				{
					SupplierId = s.SupplierId,
					SupplierCode = s.SupplierCode,
					SupplierName = s.SupplierName,
					TaxCode = s.TaxCode,
					Phone = s.Phone,
					Email = s.Email,
					Address = s.Address,
					City = s.City,
					Ward = s.Ward,
					IsActive = s.IsActive
				})
				.ToList();

			// 6. Return
			return new PagedResponse<SupplierResponse>
			{
				Page = page,
				PageSize = pageSize,
				TotalItems = totalItems,
				Items = items
			};
		}

		public async Task<SupplierResponse> UpdateSupplierAsync(long id, UpdateSupplierRequest request, long currentUserId)
		{
			// 1️⃣ Check supplier exists
			var supplier = await _supplierRepository.GetByIdAsync(id);
			if (supplier == null)
			{
				throw new KeyNotFoundException($"Không tìm thấy nhà cung cấp với ID = {id}");
			}

			// Lưu giá trị cũ trước khi update
			var oldValues = JsonSerializer.Serialize(new
			{
				supplier.SupplierName,
				supplier.TaxCode,
				supplier.Phone,
				supplier.Email,
				supplier.Address,
				supplier.City,
				supplier.Ward,
				supplier.IsActive
			});

			// 2️⃣ Check duplicate Email (if provided and different from current)
			if (!string.IsNullOrWhiteSpace(request.Email))
			{
				var allSuppliers = await _supplierRepository.GetAllAsync();
				var duplicateEmail = allSuppliers.Any(s =>
					s.SupplierId != id &&
					!string.IsNullOrWhiteSpace(s.Email) &&
					s.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase));

				if (duplicateEmail)
				{
					throw new InvalidOperationException("Email đã được sử dụng bởi nhà cung cấp khác");
				}
			}

			// 3️⃣ Map request fields to entity (keep SupplierCode & CreatedAt unchanged)
			supplier.SupplierName = request.SupplierName;
			supplier.TaxCode = request.TaxCode;
			supplier.Phone = request.Phone;
			supplier.Email = request.Email;
			supplier.Address = request.Address;
			supplier.City = request.City;
			supplier.Ward = request.Ward;
			supplier.IsActive = request.IsActive;

			// 4️⃣ Save
			await _supplierRepository.UpdateAsync(supplier);

			// 5️⃣ Gửi thông báo cho Admin, Giám đốc, Sale Support
			await _notificationService.CreateForRolesAsync(
				_notifyRoleCodes,
				"Cập nhật nhà cung cấp",
				$"Nhà cung cấp '{supplier.SupplierName}' (Mã: {supplier.SupplierCode}) đã được cập nhật.",
				"SUPPLIER",
				supplier.SupplierId,
				excludeUserId: currentUserId
			);

			// 6️⃣ Ghi audit log
			var newValues = JsonSerializer.Serialize(new
			{
				supplier.SupplierName,
				supplier.TaxCode,
				supplier.Phone,
				supplier.Email,
				supplier.Address,
				supplier.City,
				supplier.Ward,
				supplier.IsActive
			});
			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Update,
				AuditEntity.Supplier,
				supplier.SupplierId,
				$"Cập nhật nhà cung cấp '{supplier.SupplierName}' (Mã: {supplier.SupplierCode})",
				oldValues,
				newValues
			);

			// 7️⃣ Return response
			return new SupplierResponse
			{
				SupplierId = supplier.SupplierId,
				SupplierCode = supplier.SupplierCode,
				SupplierName = supplier.SupplierName,
				TaxCode = supplier.TaxCode,
				Phone = supplier.Phone,
				Email = supplier.Email,
				Address = supplier.Address,
				City = supplier.City,
				Ward = supplier.Ward,
				IsActive = supplier.IsActive
			};
		}

		public async Task<SupplierResponse> ToggleSupplierStatusAsync(long id, bool isActive)
		{
			// 1️⃣ Check supplier exists
			var supplier = await _supplierRepository.GetByIdAsync(id);
			if (supplier == null)
			{
				throw new KeyNotFoundException($"Không tìm thấy nhà cung cấp với ID = {id}");
			}

			// 2️⃣ Check new status differs from current status
			if (supplier.IsActive == isActive)
			{
				var statusText = isActive ? "đang hoạt động" : "đã bị vô hiệu hóa";
				throw new InvalidOperationException(
					$"Nhà cung cấp '{supplier.SupplierName}' hiện tại {statusText}. Không cần thay đổi.");
			}

			// 3️⃣ Update only IsActive (keep all other fields unchanged)
			supplier.IsActive = isActive;

			// 4️⃣ Save
			await _supplierRepository.UpdateAsync(supplier);

			// 5️⃣ Return response
			return new SupplierResponse
			{
				SupplierId = supplier.SupplierId,
				SupplierCode = supplier.SupplierCode,
				SupplierName = supplier.SupplierName,
				TaxCode = supplier.TaxCode,
				Phone = supplier.Phone,
				Email = supplier.Email,
				Address = supplier.Address,
				City = supplier.City,
				Ward = supplier.Ward,
				IsActive = supplier.IsActive
			};
		}
		public async Task<SupplierResponse> GetSupplierByIdAsync(long id)
		{
			var supplier = await _supplierRepository.GetByIdAsync(id);
			if (supplier == null)
			{
				throw new KeyNotFoundException($"Không tìm thấy nhà cung cấp với ID = {id}");
			}

			return new SupplierResponse
			{
				SupplierId = supplier.SupplierId,
				SupplierCode = supplier.SupplierCode,
				SupplierName = supplier.SupplierName,
				TaxCode = supplier.TaxCode,
				Phone = supplier.Phone,
				Email = supplier.Email,
				Address = supplier.Address,
				City = supplier.City,
				Ward = supplier.Ward,
				IsActive = supplier.IsActive
			};
		}

		public async Task<SupplierTransactionUnifiedResponse> GetSupplierTransactionsAsync(
			long supplierId,
			int page,
			int pageSize,
			string? transactionType,
			string? status,
			DateTime? fromDate,
			DateTime? toDate,
			string? detailType,
			long? detailDocId)
		{
			var response = new SupplierTransactionUnifiedResponse();

			// 1. DETAIL (If requested)
			if (detailDocId.HasValue && !string.IsNullOrWhiteSpace(detailType))
			{
				if (detailType.ToUpper() == "PO")
				{
					var po = await _context.PurchaseOrders.FindAsync(detailDocId.Value);
					var poLines = _context.PurchaseOrderLines.Where(l => l.PurchaseOrderId == detailDocId.Value).ToList();
					if (po != null) response.Detail = new { Header = po, Lines = poLines };
				}
				else if (detailType.ToUpper() == "GRN")
				{
					var grn = await _context.GoodsReceiptNotes.FindAsync(detailDocId.Value);
					var grnLines = _context.GoodsReceiptNoteLines.Where(l => l.Grnid == detailDocId.Value).ToList();
					if (grn != null) response.Detail = new { Header = grn, Lines = grnLines };
				}
				return response;
			}

			// 2. SUMMARY
			var totalPo = _context.PurchaseOrders.Count(x => x.SupplierId == supplierId);
			var totalGrn = _context.GoodsReceiptNotes.Count(x => x.SupplierId == supplierId);
			var totalQtyReceived = _context.GoodsReceiptNoteLines.Where(x => x.Grn.SupplierId == supplierId).Sum(x => (decimal?)x.ActualQty) ?? 0;
			var totalQtyOrdered = _context.PurchaseOrderLines.Where(x => x.PurchaseOrder.SupplierId == supplierId).Sum(x => (decimal?)x.OrderedQty) ?? 0;

			response.Summary = new SupplierTransactionSummaryDto
			{
				TotalPurchaseOrders = totalPo,
				TotalGoodsReceiptNotes = totalGrn,
				TotalQuantityReceived = totalQtyReceived,
				TotalQuantityOrdered = totalQtyOrdered
			};

			// 3. HISTORY (List) - Fixed: Fetch separately then union in memory to avoid EF Translation issues
			if (page <= 0) page = 1;
			if (pageSize <= 0) pageSize = 20;

			// Define PO Query
			var poQuery = _context.PurchaseOrders.Where(x => x.SupplierId == supplierId);
			if (!string.IsNullOrWhiteSpace(status)) poQuery = poQuery.Where(x => x.Status.ToUpper() == status.ToUpper());

			var poList = poQuery.Select(x => new SupplierTransactionDto
			{
				TransactionId = x.PurchaseOrderId,
				TransactionDate = x.RequestedDate.HasValue
					? x.RequestedDate.Value.ToDateTime(TimeOnly.MinValue)
					: x.CreatedAt.Date,
				TransactionCode = x.Pocode,
				TransactionType = "PO",
				Status = x.Status,
				Note = x.Justification,
				WarehouseName = null,
				CreatedBy = x.RequestedByNavigation.FullName,
				ItemCount = x.PurchaseOrderLines.Count,
				TotalQuantity = x.PurchaseOrderLines.Sum(l => l.OrderedQty),
				CreatedAt = x.CreatedAt
			}).ToList();

			// Define GRN Query
			var grnQuery = _context.GoodsReceiptNotes.Where(x => x.SupplierId == supplierId);
			if (!string.IsNullOrWhiteSpace(status)) grnQuery = grnQuery.Where(x => x.Status.ToUpper() == status.ToUpper());

			var grnList = grnQuery.Select(x => new SupplierTransactionDto
			{
				TransactionId = x.Grnid,
				TransactionDate = x.ReceiptDate.ToDateTime(TimeOnly.MinValue),
				TransactionCode = x.Grncode,
				TransactionType = "GRN",
				Status = x.Status,
				Note = x.Note,
				WarehouseName = x.Warehouse.WarehouseName,
				CreatedBy = x.CreatedByNavigation.FullName,
				ItemCount = x.GoodsReceiptNoteLines.Count,
				TotalQuantity = x.GoodsReceiptNoteLines.Sum(l => (decimal?)l.ActualQty) ?? 0,
				CreatedAt = x.SubmittedAt ?? x.PostedAt ?? x.ApprovedAt ?? DateTime.UtcNow
			}).ToList();

			// Merge and Filter further in memory
			var merged = poList.Concat(grnList).AsQueryable();

			if (!string.IsNullOrWhiteSpace(transactionType))
				merged = merged.Where(x => x.TransactionType.ToUpper() == transactionType.ToUpper());

			if (fromDate.HasValue)
				merged = merged.Where(x => x.TransactionDate >= fromDate.Value.Date);

			if (toDate.HasValue)
				merged = merged.Where(x => x.TransactionDate <= toDate.Value.Date);

			var totalItems = merged.Count();
			var items = merged
				.OrderByDescending(x => x.CreatedAt)
				.Skip((page - 1) * pageSize)
				.Take(pageSize)
				.ToList();

			response.History = new PagedResponse<SupplierTransactionDto>
			{
				Page = page,
				PageSize = pageSize,
				TotalItems = totalItems,
				Items = items
			};

			return response;
		}
	}
}
