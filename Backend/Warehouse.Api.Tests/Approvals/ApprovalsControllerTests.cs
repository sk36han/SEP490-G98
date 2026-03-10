using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using System.Threading.Tasks;
using Warehouse.Api.ApiController;
using Warehouse.DataAcces.Service;
using Warehouse.Entities.ModelRequest;
using Warehouse.Entities.ModelResponse;
using Xunit;

namespace Warehouse.Api.Tests.Approvals
{
    public class ApprovalsControllerTests
    {
        private readonly Mock<IApprovalService> _mockApprovalService;
        private readonly ApprovalsController _controller;

        public ApprovalsControllerTests()
        {
            _mockApprovalService = new Mock<IApprovalService>();
            _controller = new ApprovalsController(_mockApprovalService.Object);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "1")
            }, "mock"));

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }

        [Fact]
        public async Task GetPendingApprovals_ReturnsOkResult()
        {
            // Arrange
            var filter = new ApprovalQueueFilterRequest();
            var pagedResult = new PagedResult<ApprovalQueueResponse>(new System.Collections.Generic.List<ApprovalQueueResponse>(), 0, 1, 20);
            _mockApprovalService.Setup(s => s.GetPendingApprovalsAsync(filter)).ReturnsAsync(pagedResult);

            // Act
            var result = await _controller.GetPendingApprovals(filter);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task ApproveRequest_WhenSuccess_ReturnsOkResult()
        {
            // Arrange
            long id = 1;
            string requestType = "Release";
            var request = new ApprovalDecisionRequest { Reason = "Ok" };
            _mockApprovalService.Setup(s => s.ApproveRequestAsync(requestType, id, 1, request.Reason)).ReturnsAsync(true);

            // Act
            var result = await _controller.ApproveRequest(requestType, id, request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task RejectRequest_WhenReasonIsEmpty_ReturnsBadRequest()
        {
            // Arrange
            long id = 99;
            string requestType = "Release";
            var request = new ApprovalDecisionRequest { Reason = "" };

            // Act
            var result = await _controller.RejectRequest(requestType, id, request);

            // Assert
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.NotNull(badRequestResult.Value);
        }

        [Fact]
        public async Task RejectRequest_WhenNotFound_ReturnsNotFound()
        {
            // Arrange
            long id = 99;
            string requestType = "Release";
            var request = new ApprovalDecisionRequest { Reason = "Reject reason" };
            _mockApprovalService.Setup(s => s.RejectRequestAsync(requestType, id, 1, request.Reason)).ReturnsAsync(false);

            // Act
            var result = await _controller.RejectRequest(requestType, id, request);

            // Assert
            var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
            Assert.NotNull(notFoundResult.Value);
        }

        [Fact]
        public async Task GetRequestDetail_WhenFound_ReturnsOkResult()
        {
            // Arrange
            string requestType = "PurchaseOrder";
            long id = 1;
            var detail = new { Id = 1, RequestType = "PurchaseOrder" };
            _mockApprovalService.Setup(s => s.GetRequestDetailAsync(requestType, id)).ReturnsAsync(detail);

            // Act
            var result = await _controller.GetRequestDetail(requestType, id);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.NotNull(okResult.Value);
        }

        [Fact]
        public async Task GetRequestDetail_WhenNotFound_ReturnsNotFound()
        {
            // Arrange
            string requestType = "PurchaseOrder";
            long id = 99;
            _mockApprovalService.Setup(s => s.GetRequestDetailAsync(requestType, id)).ReturnsAsync((object)null);

            // Act
            var result = await _controller.GetRequestDetail(requestType, id);

            // Assert
            var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
            Assert.NotNull(notFoundResult.Value);
        }
    }
}
