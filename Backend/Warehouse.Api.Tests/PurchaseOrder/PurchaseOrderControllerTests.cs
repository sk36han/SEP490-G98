using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Warehouse.Api.ApiController;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.Tests;

public class PurchaseOrderControllerTests
{
    private readonly Mock<IPurchaseOrderService> _purchaseOrderServiceMock = new();

    private static PurchaseOrderController CreateControllerWithUser(IPurchaseOrderService service, ClaimsPrincipal? user = null)
    {
        var controller = new PurchaseOrderController(service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user ?? new ClaimsPrincipal(new ClaimsIdentity()) }
            }
        };

        return controller;
    }

    // =========================================================
    // 1. GetPurchaseOrders (5 tests)
    // =========================================================

    [Fact]
    public async Task GetPurchaseOrders_ShouldReturnOk_WithDefaultPaging()
    {
        var controller = new PurchaseOrderController(_purchaseOrderServiceMock.Object);
        _purchaseOrderServiceMock
            .Setup(x => x.GetPurchaseOrdersAsync(1, 20, null, null, null, null, null, null))
            .ReturnsAsync(new PagedResponse<PurchaseOrderResponse>
            {
                Page = 1,
                PageSize = 20,
                Items = new List<PurchaseOrderResponse>()
            });

        var result = await controller.GetPurchaseOrders(1, 20);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = ok.Value.Should().BeOfType<PagedResponse<PurchaseOrderResponse>>().Subject;
        response.Page.Should().Be(1);
        response.PageSize.Should().Be(20);
    }

    [Fact]
    public async Task GetPurchaseOrders_ShouldFilterByPoCode()
    {
        var controller = new PurchaseOrderController(_purchaseOrderServiceMock.Object);
        _purchaseOrderServiceMock
            .Setup(x => x.GetPurchaseOrdersAsync(1, 20, "PO-001", null, null, null, null, null))
            .ReturnsAsync(new PagedResponse<PurchaseOrderResponse>
            {
                Items = new List<PurchaseOrderResponse> { new PurchaseOrderResponse { Pocode = "PO-001" } }
            });

        var result = await controller.GetPurchaseOrders(1, 20, "PO-001");

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = ok.Value.Should().BeOfType<PagedResponse<PurchaseOrderResponse>>().Subject;
        response.Items[0].Pocode.Should().Be("PO-001");
    }

    [Fact]
    public async Task GetPurchaseOrders_ShouldFilterByStatusAndSupplierName()
    {
        var controller = new PurchaseOrderController(_purchaseOrderServiceMock.Object);
        _purchaseOrderServiceMock
            .Setup(x => x.GetPurchaseOrdersAsync(1, 20, null, "NCC A", "APPROVED", null, null, null))
            .ReturnsAsync(new PagedResponse<PurchaseOrderResponse>
            {
                Items = new List<PurchaseOrderResponse> { new PurchaseOrderResponse { Status = "APPROVED", SupplierName = "NCC A" } }
            });

        var result = await controller.GetPurchaseOrders(1, 20, null, "NCC A", "APPROVED");

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = ok.Value.Should().BeOfType<PagedResponse<PurchaseOrderResponse>>().Subject;
        response.Items[0].Status.Should().Be("APPROVED");
        response.Items[0].SupplierName.Should().Be("NCC A");
    }

    [Fact]
    public async Task GetPurchaseOrders_ShouldFilterByDateRangeAndRequestedByName()
    {
        var controller = new PurchaseOrderController(_purchaseOrderServiceMock.Object);
        var fromDate = new DateTime(2026, 1, 1);
        var toDate = new DateTime(2026, 2, 1);

        _purchaseOrderServiceMock
            .Setup(x => x.GetPurchaseOrdersAsync(1, 20, null, null, null, fromDate, toDate, "Admin"))
            .ReturnsAsync(new PagedResponse<PurchaseOrderResponse> { Items = new List<PurchaseOrderResponse>() });

        var result = await controller.GetPurchaseOrders(1, 20, null, null, null, fromDate, toDate, "Admin");

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetPurchaseOrders_ShouldPassAllParams_ToService()
    {
        var controller = new PurchaseOrderController(_purchaseOrderServiceMock.Object);
        var fromDate = new DateTime(2026, 1, 1);
        var toDate = new DateTime(2026, 1, 31);

        _purchaseOrderServiceMock
            .Setup(x => x.GetPurchaseOrdersAsync(2, 50, "PO", "NCC", "DRAFT", fromDate, toDate, "Sale"))
            .ReturnsAsync(new PagedResponse<PurchaseOrderResponse> { Items = new List<PurchaseOrderResponse>() })
            .Verifiable();

        await controller.GetPurchaseOrders(2, 50, "PO", "NCC", "DRAFT", fromDate, toDate, "Sale");

        _purchaseOrderServiceMock.Verify(x => x.GetPurchaseOrdersAsync(2, 50, "PO", "NCC", "DRAFT", fromDate, toDate, "Sale"), Times.Once);
    }

    // =========================================================
    // 2. GetPurchaseOrder(id) (3 tests)
    // =========================================================

    [Fact]
    public async Task GetPurchaseOrder_ShouldReturnOk_WhenFound()
    {
        var controller = new PurchaseOrderController(_purchaseOrderServiceMock.Object);
        _purchaseOrderServiceMock
            .Setup(x => x.GetPurchaseOrderByIdAsync(1))
            .ReturnsAsync(new PurchaseOrderDetailResponse { PurchaseOrderId = 1, Pocode = "PO-001" });

        var result = await controller.GetPurchaseOrder(1);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = ok.Value.Should().BeOfType<PurchaseOrderDetailResponse>().Subject;
        response.PurchaseOrderId.Should().Be(1);
    }

    [Fact]
    public async Task GetPurchaseOrder_ShouldReturnNotFound_WhenNotFound()
    {
        var controller = new PurchaseOrderController(_purchaseOrderServiceMock.Object);
        _purchaseOrderServiceMock.Setup(x => x.GetPurchaseOrderByIdAsync(99)).ReturnsAsync((PurchaseOrderDetailResponse?)null);

        var result = await controller.GetPurchaseOrder(99);

        var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFound.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy đơn hàng với ID = 99" });
    }

    [Fact]
    public async Task GetPurchaseOrder_ShouldCallServiceWithCorrectId()
    {
        var controller = new PurchaseOrderController(_purchaseOrderServiceMock.Object);
        _purchaseOrderServiceMock
            .Setup(x => x.GetPurchaseOrderByIdAsync(123))
            .ReturnsAsync(new PurchaseOrderDetailResponse { PurchaseOrderId = 123 })
            .Verifiable();

        await controller.GetPurchaseOrder(123);

        _purchaseOrderServiceMock.Verify(x => x.GetPurchaseOrderByIdAsync(123), Times.Once);
    }

    // =========================================================
    // 3. UpdatePurchaseOrder (5 tests)
    // =========================================================

    [Fact]
    public async Task UpdatePurchaseOrder_ShouldReturnOk_WhenSuccessful()
    {
        var controller = new PurchaseOrderController(_purchaseOrderServiceMock.Object);
        var request = new UpdatePurchaseOrderRequest { Pocode = "PO-001", Status = "DRAFT" };

        _purchaseOrderServiceMock
            .Setup(x => x.UpdatePurchaseOrderAsync(1, request))
            .ReturnsAsync(new PurchaseOrderDetailResponse { PurchaseOrderId = 1, Pocode = "PO-001" });

        var result = await controller.UpdatePurchaseOrder(1, request);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = ok.Value.Should().BeOfType<PurchaseOrderDetailResponse>().Subject;
        response.Pocode.Should().Be("PO-001");
    }

    [Fact]
    public async Task UpdatePurchaseOrder_ShouldReturnBadRequest_WhenModelStateInvalid()
    {
        var controller = new PurchaseOrderController(_purchaseOrderServiceMock.Object);
        controller.ModelState.AddModelError("Pocode", "Required");

        var result = await controller.UpdatePurchaseOrder(1, new UpdatePurchaseOrderRequest());

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UpdatePurchaseOrder_ShouldReturnNotFound_WhenServiceReturnsNull()
    {
        var controller = new PurchaseOrderController(_purchaseOrderServiceMock.Object);
        var request = new UpdatePurchaseOrderRequest { Pocode = "PO-001", Status = "DRAFT" };
        _purchaseOrderServiceMock.Setup(x => x.UpdatePurchaseOrderAsync(88, request)).ReturnsAsync((PurchaseOrderDetailResponse?)null);

        var result = await controller.UpdatePurchaseOrder(88, request);

        var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFound.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy đơn hàng với ID = 88" });
    }

    [Fact]
    public async Task UpdatePurchaseOrder_ShouldReturnBadRequest_WhenInvalidOperationExceptionOccurs()
    {
        var controller = new PurchaseOrderController(_purchaseOrderServiceMock.Object);
        var request = new UpdatePurchaseOrderRequest { Pocode = "PO-001", Status = "DRAFT" };
        _purchaseOrderServiceMock
            .Setup(x => x.UpdatePurchaseOrderAsync(1, request))
            .ThrowsAsync(new InvalidOperationException("Không thể update ở trạng thái hiện tại"));

        var result = await controller.UpdatePurchaseOrder(1, request);

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { message = "Không thể update ở trạng thái hiện tại" });
    }

    [Fact]
    public async Task UpdatePurchaseOrder_ShouldReturn500_WhenUnhandledExceptionOccurs()
    {
        var controller = new PurchaseOrderController(_purchaseOrderServiceMock.Object);
        var request = new UpdatePurchaseOrderRequest { Pocode = "PO-001", Status = "DRAFT" };
        _purchaseOrderServiceMock
            .Setup(x => x.UpdatePurchaseOrderAsync(1, request))
            .ThrowsAsync(new Exception("DB down"));

        var result = await controller.UpdatePurchaseOrder(1, request);

        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);
    }

    // =========================================================
    // 4. CreatePurchaseOrder (7 tests)
    // =========================================================

    [Fact]
    public async Task CreatePurchaseOrder_ShouldReturnCreatedAtAction_WhenSuccessful()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "2")
        }, "TestAuth"));

        var controller = CreateControllerWithUser(_purchaseOrderServiceMock.Object, user);

        var request = new CreatePurchaseOrderRequest
        {
            Pocode = "PO-NEW-001",
            Status = "DRAFT",
            OrderLines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 1, OrderedQty = 10, UomId = 1 }
            }
        };

        _purchaseOrderServiceMock
            .Setup(x => x.CreatePurchaseOrderAsync(2, request))
            .ReturnsAsync(new PurchaseOrderDetailResponse { PurchaseOrderId = 10, Pocode = "PO-NEW-001" });

        var result = await controller.CreatePurchaseOrder(request);

        var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        created.ActionName.Should().Be(nameof(PurchaseOrderController.GetPurchaseOrder));
        created.RouteValues!["id"].Should().Be(10L);
    }

    [Fact]
    public async Task CreatePurchaseOrder_ShouldReturnBadRequest_WhenModelStateInvalid()
    {
        var controller = CreateControllerWithUser(_purchaseOrderServiceMock.Object);
        controller.ModelState.AddModelError("Pocode", "Required");

        var result = await controller.CreatePurchaseOrder(new CreatePurchaseOrderRequest());

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreatePurchaseOrder_ShouldReturnUnauthorized_WhenMissingNameIdentifierClaim()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity());
        var controller = CreateControllerWithUser(_purchaseOrderServiceMock.Object, user);

        var request = new CreatePurchaseOrderRequest { Pocode = "PO-X", Status = "DRAFT" };

        var result = await controller.CreatePurchaseOrder(request);

        var unauthorized = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorized.Value.Should().BeEquivalentTo(new { message = "Không tìm thấy thông tin người dùng trong token." });
    }

    [Fact]
    public async Task CreatePurchaseOrder_ShouldReturnBadRequest_WhenUserIdClaimInvalid()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "abc")
        }, "TestAuth"));

        var controller = CreateControllerWithUser(_purchaseOrderServiceMock.Object, user);

        var result = await controller.CreatePurchaseOrder(new CreatePurchaseOrderRequest { Pocode = "PO-X", Status = "DRAFT" });

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { message = "ID người dùng không hợp lệ." });
    }

    [Fact]
    public async Task CreatePurchaseOrder_ShouldReturnBadRequest_WhenInvalidOperationExceptionOccurs()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "3")
        }, "TestAuth"));

        var controller = CreateControllerWithUser(_purchaseOrderServiceMock.Object, user);
        var request = new CreatePurchaseOrderRequest { Pocode = "PO-ERR", Status = "DRAFT" };

        _purchaseOrderServiceMock
            .Setup(x => x.CreatePurchaseOrderAsync(3, request))
            .ThrowsAsync(new InvalidOperationException("Mã PO đã tồn tại"));

        var result = await controller.CreatePurchaseOrder(request);

        var badRequest = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.Value.Should().BeEquivalentTo(new { message = "Mã PO đã tồn tại" });
    }

    [Fact]
    public async Task CreatePurchaseOrder_ShouldReturn500_WhenUnhandledExceptionOccurs()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "3")
        }, "TestAuth"));

        var controller = CreateControllerWithUser(_purchaseOrderServiceMock.Object, user);
        var request = new CreatePurchaseOrderRequest { Pocode = "PO-500", Status = "DRAFT" };

        _purchaseOrderServiceMock
            .Setup(x => x.CreatePurchaseOrderAsync(3, request))
            .ThrowsAsync(new Exception("DB timeout"));

        var result = await controller.CreatePurchaseOrder(request);

        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task CreatePurchaseOrder_ShouldPassUserIdAndPayload_ToServiceCorrectly()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "7")
        }, "TestAuth"));

        var controller = CreateControllerWithUser(_purchaseOrderServiceMock.Object, user);
        var request = new CreatePurchaseOrderRequest
        {
            Pocode = "PO-VERIFY",
            Status = "DRAFT",
            OrderLines = new List<CreatePurchaseOrderLineRequest>
            {
                new CreatePurchaseOrderLineRequest { ItemId = 100, OrderedQty = 5, UomId = 1 }
            }
        };

        _purchaseOrderServiceMock
            .Setup(x => x.CreatePurchaseOrderAsync(7, request))
            .ReturnsAsync(new PurchaseOrderDetailResponse { PurchaseOrderId = 77, Pocode = "PO-VERIFY" })
            .Verifiable();

        await controller.CreatePurchaseOrder(request);

        _purchaseOrderServiceMock.Verify(
            x => x.CreatePurchaseOrderAsync(7, It.Is<CreatePurchaseOrderRequest>(r =>
                r.Pocode == "PO-VERIFY" &&
                r.Status == "DRAFT" &&
                r.OrderLines.Count == 1 &&
                r.OrderLines[0].ItemId == 100 &&
                r.OrderLines[0].OrderedQty == 5)),
            Times.Once);
    }
}
