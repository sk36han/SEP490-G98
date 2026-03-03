using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Warehouse.Api.ApiController;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.Api.Tests;

public class ReceiverControllerTests
{
    private readonly Mock<IReceiverService> _receiverServiceMock = new();

    // =========================================================
    // 1. CreateReceiver (6 Tests)
    // =========================================================

    [Fact]
    public async Task CreateReceiver_ShouldReturnOk_WhenSuccessful()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        var request = new CreateReceiverRequest { ReceiverCode = "RCV01", ReceiverName = "Receiver 01" };
        var expectedResponse = new ReceiverResponse { ReceiverId = 1, ReceiverCode = "RCV01", ReceiverName = "Receiver 01", IsActive = true };

        _receiverServiceMock.Setup(x => x.CreateReceiverAsync(request)).ReturnsAsync(expectedResponse);

        var result = await controller.CreateReceiver(request);
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ReceiverResponse>().Subject;
        response.ReceiverCode.Should().Be("RCV01");
        response.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task CreateReceiver_ShouldReturnBadRequest_WhenModelStateIsInvalid()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        controller.ModelState.AddModelError("ReceiverCode", "ReceiverCode is required");

        var result = await controller.CreateReceiver(new CreateReceiverRequest());

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateReceiver_ShouldReturnBadRequest_WhenServiceThrowsInvalidOperationException_DuplicateCode()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        var request = new CreateReceiverRequest { ReceiverCode = "RCV01", ReceiverName = "Receiver" };
        _receiverServiceMock
            .Setup(x => x.CreateReceiverAsync(request))
            .ThrowsAsync(new InvalidOperationException("Mã người nhận đã tồn tại"));

        var result = await controller.CreateReceiver(request);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { message = "Mã người nhận đã tồn tại" });
    }

    [Fact]
    public async Task CreateReceiver_ShouldReturnOk_WithOptionalFields_IncludingCityWard()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        var request = new CreateReceiverRequest
        {
            ReceiverCode = "RCV02",
            ReceiverName = "Receiver 02",
            Phone = "0909",
            Email = "r2@local",
            Address = "HCM",
            City = "Ho Chi Minh",
            Ward = "Ward 1",
            Notes = "note"
        };
        var expectedResponse = new ReceiverResponse
        {
            ReceiverId = 2,
            ReceiverCode = "RCV02",
            City = "Ho Chi Minh",
            Ward = "Ward 1",
            Address = "HCM"
        };

        _receiverServiceMock.Setup(x => x.CreateReceiverAsync(It.IsAny<CreateReceiverRequest>())).ReturnsAsync(expectedResponse);

        var result = await controller.CreateReceiver(request);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ReceiverResponse>().Subject;
        response.City.Should().Be("Ho Chi Minh");
        response.Ward.Should().Be("Ward 1");
        response.Address.Should().Be("HCM");
    }

    [Fact]
    public async Task CreateReceiver_ShouldPassRequestData_ToServiceCorrectly()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        var request = new CreateReceiverRequest { ReceiverCode = "RCV03", ReceiverName = "ABC", City = "Da Nang", Ward = "Hai Chau" };
        _receiverServiceMock
            .Setup(x => x.CreateReceiverAsync(request))
            .ReturnsAsync(new ReceiverResponse { ReceiverName = "ABC" })
            .Verifiable();

        await controller.CreateReceiver(request);

        _receiverServiceMock.Verify(
            x => x.CreateReceiverAsync(It.Is<CreateReceiverRequest>(r =>
                r.ReceiverCode == "RCV03" &&
                r.ReceiverName == "ABC" &&
                r.City == "Da Nang" &&
                r.Ward == "Hai Chau")),
            Times.Once);
    }

    [Fact]
    public async Task CreateReceiver_ShouldRethrow_WhenUnhandledExceptionOccurs()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        _receiverServiceMock.Setup(x => x.CreateReceiverAsync(It.IsAny<CreateReceiverRequest>())).ThrowsAsync(new Exception("Database error"));

        Func<Task> act = async () => await controller.CreateReceiver(new CreateReceiverRequest());

        await act.Should().ThrowAsync<Exception>().WithMessage("Database error");
    }

    // =========================================================
    // 2. GetReceivers (6 Tests)
    // =========================================================

    [Fact]
    public async Task GetReceivers_ShouldReturnOk_WithDefaultPagination()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        _receiverServiceMock
            .Setup(x => x.GetReceiversAsync(1, 20, null, null, null, null, null))
            .ReturnsAsync(new PagedResponse<ReceiverResponse>
            {
                Page = 1,
                PageSize = 20,
                Items = new List<ReceiverResponse>()
            });

        var result = await controller.GetReceivers(1, 20);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<PagedResponse<ReceiverResponse>>().Subject;
        response.Page.Should().Be(1);
        response.PageSize.Should().Be(20);
    }

    [Fact]
    public async Task GetReceivers_ShouldFilterByReceiverCode()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        _receiverServiceMock
            .Setup(x => x.GetReceiversAsync(1, 20, "RCV01", null, null, null, null))
            .ReturnsAsync(new PagedResponse<ReceiverResponse>
            {
                Items = new List<ReceiverResponse> { new ReceiverResponse { ReceiverCode = "RCV01" } }
            });

        var result = await controller.GetReceivers(1, 20, "RCV01");

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<PagedResponse<ReceiverResponse>>().Subject;
        response.Items.Should().HaveCount(1);
        response.Items[0].ReceiverCode.Should().Be("RCV01");
    }

    [Fact]
    public async Task GetReceivers_ShouldFilterByReceiverName()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        _receiverServiceMock
            .Setup(x => x.GetReceiversAsync(1, 20, null, "Factory", null, null, null))
            .ReturnsAsync(new PagedResponse<ReceiverResponse>
            {
                Items = new List<ReceiverResponse> { new ReceiverResponse { ReceiverName = "Factory Team" } }
            });

        var result = await controller.GetReceivers(1, 20, null, "Factory");

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<PagedResponse<ReceiverResponse>>().Subject;
        response.Items[0].ReceiverName.Should().Contain("Factory");
    }

    [Fact]
    public async Task GetReceivers_ShouldFilterByIsActive_AndDateRange()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        var fromDate = new DateTime(2026, 1, 1);
        var toDate = new DateTime(2026, 12, 31);

        _receiverServiceMock
            .Setup(x => x.GetReceiversAsync(1, 20, null, null, true, fromDate, toDate))
            .ReturnsAsync(new PagedResponse<ReceiverResponse>
            {
                Items = new List<ReceiverResponse> { new ReceiverResponse { IsActive = true } }
            });

        var result = await controller.GetReceivers(1, 20, null, null, true, fromDate, toDate);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<PagedResponse<ReceiverResponse>>().Subject;
        response.Items[0].IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task GetReceivers_ShouldReturnEmpty_WhenNoMatchesFound()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        _receiverServiceMock
            .Setup(x => x.GetReceiversAsync(1, 20, "NO_MATCH", null, null, null, null))
            .ReturnsAsync(new PagedResponse<ReceiverResponse> { Items = new List<ReceiverResponse>() });

        var result = await controller.GetReceivers(1, 20, "NO_MATCH");

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<PagedResponse<ReceiverResponse>>().Subject;
        response.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task GetReceivers_ShouldPassAllQueryParams_ToServiceCorrectly()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        var fromDate = new DateTime(2025, 5, 1);
        var toDate = new DateTime(2025, 6, 1);

        _receiverServiceMock
            .Setup(x => x.GetReceiversAsync(2, 50, "RCV", "Prod", false, fromDate, toDate))
            .ReturnsAsync(new PagedResponse<ReceiverResponse> { Items = new List<ReceiverResponse>() })
            .Verifiable();

        await controller.GetReceivers(2, 50, "RCV", "Prod", false, fromDate, toDate);

        _receiverServiceMock.Verify(x => x.GetReceiversAsync(2, 50, "RCV", "Prod", false, fromDate, toDate), Times.Once);
    }

    // =========================================================
    // 3. UpdateReceiver (5 Tests)
    // =========================================================

    [Fact]
    public async Task UpdateReceiver_ShouldReturnOk_WhenSuccessful()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        var request = new UpdateReceiverRequest { ReceiverName = "Updated Receiver", City = "Ha Noi", Ward = "Cau Giay" };
        var expectedResponse = new ReceiverResponse { ReceiverId = 1, ReceiverName = "Updated Receiver", City = "Ha Noi", Ward = "Cau Giay" };

        _receiverServiceMock.Setup(x => x.UpdateReceiverAsync(1, request)).ReturnsAsync(expectedResponse);

        var result = await controller.UpdateReceiver(1, request);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ReceiverResponse>().Subject;
        response.ReceiverName.Should().Be("Updated Receiver");
        response.City.Should().Be("Ha Noi");
        response.Ward.Should().Be("Cau Giay");
    }

    [Fact]
    public async Task UpdateReceiver_ShouldReturnBadRequest_WhenModelStateIsInvalid()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        controller.ModelState.AddModelError("ReceiverName", "ReceiverName is required");

        var result = await controller.UpdateReceiver(1, new UpdateReceiverRequest());

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UpdateReceiver_ShouldReturnNotFound_WhenReceiverDoesNotExist()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        var request = new UpdateReceiverRequest { ReceiverName = "Any" };
        _receiverServiceMock.Setup(x => x.UpdateReceiverAsync(99, request)).ThrowsAsync(new KeyNotFoundException("Receiver not found"));

        var result = await controller.UpdateReceiver(99, request);

        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeEquivalentTo(new { message = "Receiver not found" });
    }

    [Fact]
    public async Task UpdateReceiver_ShouldReturnBadRequest_WhenLogicThrowsInvalidOperationException()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        var request = new UpdateReceiverRequest { ReceiverName = "Any" };
        _receiverServiceMock.Setup(x => x.UpdateReceiverAsync(1, request)).ThrowsAsync(new InvalidOperationException("Invalid update"));

        var result = await controller.UpdateReceiver(1, request);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { message = "Invalid update" });
    }

    [Fact]
    public async Task UpdateReceiver_ShouldPassIdAndPayload_ToServiceCorrectly()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        var request = new UpdateReceiverRequest { ReceiverName = "R", City = "Can Tho", Ward = "Ninh Kieu", IsActive = true };

        _receiverServiceMock
            .Setup(x => x.UpdateReceiverAsync(123, request))
            .ReturnsAsync(new ReceiverResponse { ReceiverId = 123 })
            .Verifiable();

        await controller.UpdateReceiver(123, request);

        _receiverServiceMock.Verify(
            x => x.UpdateReceiverAsync(123, It.Is<UpdateReceiverRequest>(r =>
                r.ReceiverName == "R" &&
                r.City == "Can Tho" &&
                r.Ward == "Ninh Kieu" &&
                r.IsActive)),
            Times.Once);
    }

    // =========================================================
    // 4. ToggleReceiverStatus (3 Tests)
    // =========================================================

    [Fact]
    public async Task ToggleReceiverStatus_ShouldReturnOk_WhenStatusChangedSuccessfully()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        _receiverServiceMock.Setup(x => x.ToggleReceiverStatusAsync(1, false)).ReturnsAsync(new ReceiverResponse { ReceiverId = 1, IsActive = false });

        var result = await controller.ToggleReceiverStatus(1, false);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ReceiverResponse>().Subject;
        response.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task ToggleReceiverStatus_ShouldReturnNotFound_WhenReceiverDoesNotExist()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        _receiverServiceMock.Setup(x => x.ToggleReceiverStatusAsync(88, true)).ThrowsAsync(new KeyNotFoundException("Receiver not found"));

        var result = await controller.ToggleReceiverStatus(88, true);

        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeEquivalentTo(new { message = "Receiver not found" });
    }

    [Fact]
    public async Task ToggleReceiverStatus_ShouldReturnBadRequest_WhenStatusAlreadyApplied()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        _receiverServiceMock.Setup(x => x.ToggleReceiverStatusAsync(1, true)).ThrowsAsync(new InvalidOperationException("Status already applied"));

        var result = await controller.ToggleReceiverStatus(1, true);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { message = "Status already applied" });
    }

    // =========================================================
    // 5. GetReceiverById (2 Tests)
    // =========================================================

    [Fact]
    public async Task GetReceiverById_ShouldReturnOk_WhenReceiverExists()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        var expectedResponse = new ReceiverResponse { ReceiverId = 1, ReceiverCode = "RCV01", ReceiverName = "Receiver 01" };
        _receiverServiceMock.Setup(x => x.GetReceiverByIdAsync(1)).ReturnsAsync(expectedResponse);

        var result = await controller.GetReceiverById(1);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ReceiverResponse>().Subject;
        response.ReceiverId.Should().Be(1);
        response.ReceiverCode.Should().Be("RCV01");
    }

    [Fact]
    public async Task GetReceiverById_ShouldReturnNotFound_WhenReceiverDoesNotExist()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        _receiverServiceMock.Setup(x => x.GetReceiverByIdAsync(999)).ThrowsAsync(new KeyNotFoundException("Receiver not found"));

        var result = await controller.GetReceiverById(999);

        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeEquivalentTo(new { message = "Receiver not found" });
    }

    // =========================================================
    // 6. ViewTransactionHistory (3 Tests)
    // =========================================================

    [Fact]
    public async Task ViewTransactionHistory_ShouldReturnOk_WithUnifiedResponse()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        var expectedResponse = new ReceiverTransactionUnifiedResponse
        {
            Summary = new ReceiverTransactionSummaryDto { TotalReleaseRequests = 4 },
            History = new PagedResponse<ReceiverTransactionDto> { Items = new List<ReceiverTransactionDto>(), TotalItems = 0 }
        };

        _receiverServiceMock
            .Setup(x => x.GetReceiverTransactionsAsync(1, 1, 20, null, null, null, null, null, null))
            .ReturnsAsync(expectedResponse);

        var result = await controller.ViewTransactionHistory(1, 1, 20);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ReceiverTransactionUnifiedResponse>().Subject;
        response.Summary.Should().NotBeNull();
        response.Summary!.TotalReleaseRequests.Should().Be(4);
    }

    [Fact]
    public async Task ViewTransactionHistory_ShouldReturnDetail_WhenDetailParametersProvided()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        var expectedResponse = new ReceiverTransactionUnifiedResponse
        {
            Detail = new { Header = new { Id = 567 }, Lines = new List<object>() }
        };

        _receiverServiceMock
            .Setup(x => x.GetReceiverTransactionsAsync(1, 1, 20, null, null, null, null, "RR", 567))
            .ReturnsAsync(expectedResponse);

        var result = await controller.ViewTransactionHistory(1, 1, 20, null, null, null, null, "RR", 567);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ReceiverTransactionUnifiedResponse>().Subject;
        response.Detail.Should().NotBeNull();
    }

    [Fact]
    public async Task ViewTransactionHistory_ShouldReturnBadRequest_WhenServiceThrowsException()
    {
        var controller = new ReceiverController(_receiverServiceMock.Object);
        _receiverServiceMock
            .Setup(x => x.GetReceiverTransactionsAsync(1, 1, 20, null, null, null, null, null, null))
            .ThrowsAsync(new Exception("Receiver not found"));

        var result = await controller.ViewTransactionHistory(1, 1, 20);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { message = "Receiver not found" });
    }
}
