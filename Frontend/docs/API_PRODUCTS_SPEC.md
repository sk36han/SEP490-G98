# API Spec - Quản lý sản phẩm (Product Management)

## Dành cho Backend Team

Tài liệu mô tả API cần triển khai cho màn hình **Quản lý sản phẩm** (Warehouse Keeper Home).

---

## 1. Danh sách sản phẩm (Có phân trang, tìm kiếm)

### Request

```
GET /api/products
GET /api/inventory/products
```

**Query Parameters:**

| Param       | Type   | Required | Description                    |
|-------------|--------|----------|--------------------------------|
| pageNumber  | int    | No       | Trang hiện tại (default: 1)   |
| pageSize    | int    | No       | Số item/trang (default: 10)   |
| searchTerm  | string | No       | Tìm theo mã, tên, danh mục, vị trí |
| categoryId  | int    | No       | Lọc theo danh mục             |
| status      | string | No       | IN_STOCK, LOW_STOCK, OUT_OF_STOCK |

### Response

```json
{
  "success": true,
  "message": null,
  "data": {
    "items": [
      {
        "productId": 1,
        "productCode": "SP001",
        "productName": "iPhone 15 Pro Max 256GB",
        "categoryName": "Điện thoại",
        "categoryId": 1,
        "quantity": 45,
        "minQuantity": 10,
        "unit": "Cái",
        "status": "IN_STOCK",
        "location": "Kệ A1-01",
        "lastUpdated": "2025-02-14T08:30:00",
        "isActive": true
      }
    ],
    "totalCount": 100,
    "pageNumber": 1,
    "pageSize": 10
  }
}
```

### Product Model

| Field        | Type    | Description                           |
|--------------|---------|---------------------------------------|
| productId    | number  | ID sản phẩm                           |
| productCode  | string  | Mã sản phẩm (unique)                  |
| productName  | string  | Tên sản phẩm                          |
| categoryId   | number  | ID danh mục                           |
| categoryName | string  | Tên danh mục                          |
| quantity     | number  | Số lượng tồn kho                      |
| minQuantity  | number  | Số lượng tối thiểu (cảnh báo)         |
| unit         | string  | Đơn vị (Cái, Hộp, Thùng, Kg...)       |
| status       | string  | IN_STOCK, LOW_STOCK, OUT_OF_STOCK      |
| location     | string  | Vị trí trong kho                      |
| lastUpdated  | string  | ISO 8601 date time                    |
| isActive     | boolean | Trạng thái hoạt động                  |

### Status Logic

- `IN_STOCK`: quantity > minQuantity
- `LOW_STOCK`: 0 < quantity <= minQuantity
- `OUT_OF_STOCK`: quantity = 0

---

## 2. Xuất Excel (Optional)

```
GET /api/products/export-excel
```

**Query:** Có thể dùng chung searchTerm, categoryId như GET list.

**Response:** File blob (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)

---

## 3. Chi tiết sản phẩm (Optional - cho nút Xem chi tiết)

```
GET /api/products/{productId}
```

---

## 4. Cập nhật sản phẩm (Optional - cho nút Chỉnh sửa)

```
PUT /api/products/{productId}
```

**Body:** Các field có thể cập nhật (productName, minQuantity, location, unit...)

---

## Ghi chú

- Frontend hiện dùng **mock data** trong `ProductManagement.jsx`
- Khi backend triển khai xong, tạo `productService.js` tương tự `adminService.js` và gọi API thay cho MOCK_PRODUCTS
- Role **Thủ kho** (Warehouse Keeper) được redirect tới `/products` sau khi đăng nhập
