# Item và các bảng liên quan tới giá trị (MKIWMS6)

Tài liệu mô tả bảng **Items** và các bảng chứa **giá trị** của một vật tư (giá tiền, tồn kho, tham số, chính sách kho) trong database **MKIWMS6**.

---

## 1. Bảng chính: Items

Lưu thông tin master của vật tư.

| Cột | Kiểu | Ghi chú |
|-----|------|--------|
| ItemId | bigint PK | ID vật tư |
| ItemCode | nvarchar(50) | Mã vật tư (unique) |
| ItemName | nvarchar(500) | Tên |
| ItemType | nvarchar(50) | Loại (RAW, Product...) |
| Description | nvarchar(1000) | Mô tả |
| CategoryId | bigint FK | → ItemCategories |
| BrandId | bigint FK | → Brands |
| BaseUomId | bigint FK | → UnitOfMeasure |
| PackagingSpecId | bigint FK | → PackagingSpecs |
| RequiresCO | bit | Yêu cầu CO |
| RequiresCQ | bit | Yêu cầu CQ |
| IsActive | bit | Đang dùng |
| DefaultWarehouseId | bigint FK | → Warehouses |
| InventoryAccount | nvarchar(50) | Tài khoản kho (kế toán) |
| RevenueAccount | nvarchar(50) | Tài khoản doanh thu (kế toán) |
| CreatedAt, UpdatedAt | datetime2 | |

---

## 2. Bảng giá trị tiền: ItemPrices

Quan hệ: **Items 1 – n ItemPrices**. Một item có nhiều dòng giá (theo loại giá và thời hiệu lực).

| Cột | Kiểu | Ghi chú |
|-----|------|--------|
| ItemPriceId | bigint PK | |
| ItemId | bigint FK | → Items |
| PriceType | nvarchar(20) | **PURCHASE** \| **COST** \| **SALE** |
| Amount | decimal(18,2) | Đơn giá |
| Currency | nvarchar(10) | VND, USD... |
| EffectiveFrom | date | Hiệu lực từ |
| EffectiveTo | date | Hiệu lực đến |
| IsActive | bit | |
| CreatedAt | datetime2 | |

**Cách dùng:** Với một item, lấy giá theo `PriceType` và ngày hiện tại nằm trong khoảng `EffectiveFrom`–`EffectiveTo`, `IsActive = 1`. Ví dụ: giá nhập = PURCHASE, giá xuất = SALE, giá vốn = COST.

---

## 3. Bảng giá trị tồn kho: InventoryOnHand

Quan hệ: **Items 1 – n InventoryOnHand** (mỗi cặp Warehouse + Item một dòng).

| Cột | Kiểu | Ghi chú |
|-----|------|--------|
| InventoryId | bigint PK | |
| ItemId | bigint FK | → Items |
| WarehouseId | bigint FK | → Warehouses |
| OnHandQty | decimal(18,3) | Tồn thực tế |
| ReservedQty | decimal(18,3) | Đã đặt chỗ |
| UpdatedAt | datetime2 | |

**Số lượng có thể bán:** `OnHandQty - ReservedQty` (theo từng kho hoặc tổng tùy nghiệp vụ).

---

## 4. Bảng giá trị thuộc tính: ItemParameterValues

Quan hệ: **Items 1 – n ItemParameterValues**. Mỗi dòng = một tham số (ParamId) cho một item.

| Cột | Kiểu | Ghi chú |
|-----|------|--------|
| ItemParamValueId | bigint PK | |
| ItemId | bigint FK | → Items |
| ParamId | bigint FK | → ItemParameters (vd: COLOR, SIZE) |
| ParamValue | nvarchar(500) | Giá trị (vd: "Blue", "M") |

Dùng cho thuộc tính mở rộng (màu, size, ...) của item.

---

## 5. Chính sách tồn theo kho: ItemWarehousePolicy

Quan hệ: **Items 1 – n ItemWarehousePolicy** (mỗi cặp Item + Warehouse một dòng).

| Cột | Kiểu | Ghi chú |
|-----|------|--------|
| ItemWarehousePolicyId | bigint PK | |
| ItemId | bigint FK | → Items |
| WarehouseId | bigint FK | → Warehouses |
| MinQty | decimal(18,3) | Tồn tối thiểu |
| ReorderQty | decimal(18,3) | Mức đặt hàng lại |

Dùng cho cảnh báo tồn thấp và gợi ý đặt hàng.

---

## 6. Sơ đồ quan hệ

```
Items (1)
  ├── ItemPrices (n)           → Giá trị tiền: nhập / vốn / bán (Amount, PriceType)
  ├── InventoryOnHand (n)      → Giá trị tồn: OnHandQty, ReservedQty theo Warehouse
  ├── ItemParameterValues (n)  → Giá trị thuộc tính: ParamValue (Color, Size...)
  └── ItemWarehousePolicy (n)  → Giá trị ngưỡng: MinQty, ReorderQty theo Warehouse
```

---

## 7. Ví dụ truy vấn SQL

### Lấy item và giá bán (SALE) hiện tại

```sql
SELECT i.ItemId, i.ItemCode, i.ItemName,
       ip.Amount AS SalePrice, ip.Currency, ip.PriceType
FROM Items i
LEFT JOIN ItemPrices ip ON ip.ItemId = i.ItemId
  AND ip.PriceType = 'SALE' AND ip.IsActive = 1
  AND CAST(GETUTCDATE() AS date) >= ip.EffectiveFrom
  AND (ip.EffectiveTo IS NULL OR CAST(GETUTCDATE() AS date) <= ip.EffectiveTo)
WHERE i.ItemId = @ItemId;
```

### Lấy tồn kho theo từng kho

```sql
SELECT i.ItemCode, w.WarehouseName, inv.OnHandQty, inv.ReservedQty,
       (inv.OnHandQty - inv.ReservedQty) AS SellableQty
FROM Items i
JOIN InventoryOnHand inv ON inv.ItemId = i.ItemId
JOIN Warehouses w ON w.WarehouseId = inv.WarehouseId
WHERE i.ItemId = @ItemId;
```

### Lấy item kèm giá nhập, giá bán và tổng tồn

```sql
SELECT i.ItemId, i.ItemCode, i.ItemName,
       (SELECT TOP 1 Amount FROM ItemPrices
        WHERE ItemId = i.ItemId AND PriceType = 'PURCHASE' AND IsActive = 1
        AND CAST(GETUTCDATE() AS date) >= EffectiveFrom
        AND (EffectiveTo IS NULL OR CAST(GETUTCDATE() AS date) <= EffectiveTo)) AS PurchasePrice,
       (SELECT TOP 1 Amount FROM ItemPrices
        WHERE ItemId = i.ItemId AND PriceType = 'SALE' AND IsActive = 1
        AND CAST(GETUTCDATE() AS date) >= EffectiveFrom
        AND (EffectiveTo IS NULL OR CAST(GETUTCDATE() AS date) <= EffectiveTo)) AS SalePrice,
       (SELECT SUM(OnHandQty - ReservedQty) FROM InventoryOnHand WHERE ItemId = i.ItemId) AS TotalSellableQty
FROM Items i
WHERE i.IsActive = 1;
```

---

## 8. Lưu ý với Frontend / Backend

- **Items** không có cột ảnh (ImageUrl/ThumbnailUrl). Nếu cần ảnh mini trên Item List, thêm cột hoặc bảng phụ (ví dụ ItemImages).
- **ItemPrices**: Backend cần trả đúng PriceType (PURCHASE, COST, SALE) và filter theo ngày hiệu lực khi lấy giá cho một item.
- **InventoryOnHand**: Số lượng có thể bán = `OnHandQty - ReservedQty`; có thể tổng hợp theo warehouse hoặc toàn hệ thống.
- **ItemParameterValues**: Dùng khi cần hiển thị/sửa thuộc tính mở rộng (Color, Size, ...) trên form Item.

---

*Tài liệu tham chiếu schema MKIWMS6, cập nhật theo nội dung đã thảo luận.*
