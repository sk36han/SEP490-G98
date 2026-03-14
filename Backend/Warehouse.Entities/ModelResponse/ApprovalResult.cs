using System;

namespace Warehouse.Entities.ModelResponse
{
    public class ApprovalResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int StatusCode { get; set; }

        public static ApprovalResult Succeeded(string message = "Success", int statusCode = 200) 
            => new ApprovalResult { Success = true, Message = message, StatusCode = statusCode };
        
        public static ApprovalResult Failed(string message, int statusCode = 400) 
            => new ApprovalResult { Success = false, Message = message, StatusCode = statusCode };
    }
}
