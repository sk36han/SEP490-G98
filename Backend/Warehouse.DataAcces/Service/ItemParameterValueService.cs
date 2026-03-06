using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Warehouse.DataAcces.Repositories;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Constants;
using Warehouse.Entities.Models;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service
{
	public class ItemParameterValueService : IItemParameterValueService
	{
		private readonly IGenericRepository<ItemParameterValue> _itemParameterValueRepository;
		private readonly IGenericRepository<Item> _itemRepository;
		private readonly IGenericRepository<ItemParameter> _itemParameterRepository;
		private readonly IAuditLogService _auditLogService;

		public ItemParameterValueService(
			IGenericRepository<ItemParameterValue> itemParameterValueRepository,
			IGenericRepository<Item> itemRepository,
			IGenericRepository<ItemParameter> itemParameterRepository,
			IAuditLogService auditLogService)
		{
			_itemParameterValueRepository = itemParameterValueRepository;
			_itemRepository = itemRepository;
			_itemParameterRepository = itemParameterRepository;
			_auditLogService = auditLogService;
		}

		// =====================================================================
		// CREATE
		// =====================================================================
		public async Task<object> CreateItemParameterValueAsync(CreateItemParameterValueRequest request, long currentUserId)
		{
			if (request == null)
				throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

			ValidateUserId(currentUserId);
			ValidateId(request.ItemId, "ID mặt hàng");
			ValidateId(request.ParamId, "ID thông số kỹ thuật");

			// Kiểm tra Item tồn tại
			var item = await _itemRepository.GetByIdAsync(request.ItemId);
			if (item == null)
				throw new KeyNotFoundException($"Không tìm thấy mặt hàng với ID = {request.ItemId}.");

			// Kiểm tra Param tồn tại
			var param = await _itemParameterRepository.GetByIdAsync(request.ParamId);
			if (param == null)
				throw new KeyNotFoundException($"Không tìm thấy thông số kỹ thuật với ID = {request.ParamId}.");

			// Kiểm tra xem Item này đã có giá trị cho Param này chưa
			var existingValues = await _itemParameterValueRepository.GetAllAsync();
			if (existingValues.Any(v => v.ItemId == request.ItemId && v.ParamId == request.ParamId))
				throw new InvalidOperationException($"Mặt hàng này đã có giá trị cho thông số kỹ thuật '{param.ParamName}'.");

			var paramValueStr = request.ParamValue?.Trim();
			if (paramValueStr != null && paramValueStr.Length > 1000)
				throw new ArgumentException("Giá trị thông số không được vượt quá 1000 ký tự.");

			var itemParamValue = new ItemParameterValue
			{
				ItemId = request.ItemId,
				ParamId = request.ParamId,
				ParamValue = paramValueStr
			};

			await _itemParameterValueRepository.CreateAsync(itemParamValue);

			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Create,
				AuditEntity.ItemParameterValue,
				itemParamValue.ItemParamValueId,
				$"Thêm giá trị '{paramValueStr}' cho thông số '{param.ParamName}' của mặt hàng ID {request.ItemId}"
			);

			return await GetResponseAsync(itemParamValue.ItemParamValueId);
		}

		// =====================================================================
		// GET BY ITEM ID
		// =====================================================================
		public async Task<object> GetItemParameterValuesByItemIdAsync(long itemId)
		{
			ValidateId(itemId, "ID mặt hàng");

			// Get all values for this item
			var allValues = await _itemParameterValueRepository.GetAllAsync();
			
			var itemValues = allValues.Where(v => v.ItemId == itemId).ToList();

			var responseList = itemValues.Select(v => new ItemParameterValueResponse
			{
				ItemParamValueId = v.ItemParamValueId,
				ItemId = v.ItemId,
				ParamId = v.ParamId,
				ParamValue = v.ParamValue,
			
			}).ToList();

			return responseList;
		}

		// =====================================================================
		// GET BY ID
		// =====================================================================
		public async Task<object> GetItemParameterValueByIdAsync(long id)
		{
			ValidateId(id, "ID giá trị thông số");

			return await GetResponseAsync(id);
		}

		// =====================================================================
		// UPDATE
		// =====================================================================
		public async Task<object> UpdateItemParameterValueAsync(long id, UpdateItemParameterValueRequest request, long currentUserId)
		{
			ValidateId(id, "ID giá trị thông số");

			if (request == null)
				throw new ArgumentNullException(nameof(request), "Dữ liệu yêu cầu không được để trống.");

			ValidateUserId(currentUserId);

			var paramValueStr = request.ParamValue?.Trim();
			if (paramValueStr != null && paramValueStr.Length > 1000)
				throw new ArgumentException("Giá trị thông số không được vượt quá 1000 ký tự.");

			var itemParamValue = await _itemParameterValueRepository.GetByIdAsync(id);
			if (itemParamValue == null)
				throw new KeyNotFoundException($"Không tìm thấy giá trị thông số với ID = {id}.");

			var oldValues = JsonSerializer.Serialize(new { itemParamValue.ParamValue });

			itemParamValue.ParamValue = paramValueStr;

			await _itemParameterValueRepository.UpdateAsync(itemParamValue);

			var newValues = JsonSerializer.Serialize(new { itemParamValue.ParamValue });
			
			// Try to get more info for logging
			var param = await _itemParameterRepository.GetByIdAsync(itemParamValue.ParamId);
			var paramName = param?.ParamName ?? itemParamValue.ParamId.ToString();

			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Update,
				AuditEntity.ItemParameterValue,
				itemParamValue.ItemParamValueId,
				$"Cập nhật giá trị thông số '{paramName}' cho mặt hàng ID {itemParamValue.ItemId}",
				oldValues,
				newValues
			);

			return await GetResponseAsync(id);
		}

		// =====================================================================
		// DELETE
		// =====================================================================
		public async Task<object> DeleteItemParameterValueAsync(long id, long currentUserId)
		{
			ValidateId(id, "ID giá trị thông số");
			ValidateUserId(currentUserId);

			var itemParamValue = await _itemParameterValueRepository.GetByIdAsync(id);
			if (itemParamValue == null)
				throw new KeyNotFoundException($"Không tìm thấy giá trị thông số với ID = {id}.");

			// Try to get more info for logging before deleting
			var param = await _itemParameterRepository.GetByIdAsync(itemParamValue.ParamId);
			var paramName = param?.ParamName ?? itemParamValue.ParamId.ToString();
			var itemId = itemParamValue.ItemId;

			await _itemParameterValueRepository.DeleteAsync(id);

			await _auditLogService.LogAsync(
				currentUserId,
				AuditAction.Delete,
				AuditEntity.ItemParameterValue,
				id,
				$"Xóa giá trị thông số '{paramName}' của mặt hàng ID {itemId}"
			);

			return new { message = "Xóa thành công", id = id };
		}

		// =====================================================================
		// PRIVATE VALIDATORS
		// =====================================================================
		private static void ValidateId(long id, string fieldName)
		{
			if (id <= 0)
				throw new ArgumentException($"{fieldName} phải là số nguyên dương.");
		}

		private static void ValidateUserId(long userId)
		{
			if (userId <= 0)
				throw new ArgumentException("ID người dùng không hợp lệ.");
		}

		// =====================================================================
		// HELPER
		// =====================================================================
		private async Task<ItemParameterValueResponse> GetResponseAsync(long id)
		{
			// Need to load related Item and Param to get names
			var allValues = await _itemParameterValueRepository.GetAllAsync();
			
			var v = allValues.FirstOrDefault(x => x.ItemParamValueId == id);
			if (v == null)
				throw new KeyNotFoundException($"Không tìm thấy giá trị thông số với ID = {id}.");

			return new ItemParameterValueResponse
			{
				ItemParamValueId = v.ItemParamValueId,
				ItemId = v.ItemId,
				ParamId = v.ParamId,
				ParamValue = v.ParamValue,
				
			};
		}
	}
}
