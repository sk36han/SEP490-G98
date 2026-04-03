using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IDocumentAttachmentService
    {
        Task<string> UploadAttachmentAsync(string docType, long docId, IFormFile file, long userId, string attachmentType = "GENERAL");
    }
}
