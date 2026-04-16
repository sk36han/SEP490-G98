using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Warehouse.DataAcces.Service.Interface;
using Warehouse.Entities.Models;
using Warehouse.Entities.Constants;

namespace Warehouse.DataAcces.Service
{
    public class DocumentAttachmentService : IDocumentAttachmentService
    {
        private readonly Mkiwms5Context _context;
        private readonly IWebHostEnvironment _env;
        private readonly IAuditLogService _auditLogService;

        public DocumentAttachmentService(Mkiwms5Context context, IWebHostEnvironment env, IAuditLogService auditLogService)
        {
            _context = context;
            _env = env;
            _auditLogService = auditLogService;
        }

        public async Task<string> UploadAttachmentAsync(string docType, long docId, IFormFile file, long userId, string attachmentType = "GENERAL")
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("File không hợp lệ hoặc rỗng.");

            // Kiểm tra định dạng file (Hỗ trợ: Ảnh, Văn phòng)
            var allowedExtensions = new[] 
            { 
                ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".tiff", // Ảnh
                ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv" // Văn phòng
            };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
                throw new ArgumentException("Định dạng tệp không được hỗ trợ. Vui lòng sử dụng tệp ảnh hoặc tài liệu văn phòng.");

            // Giới hạn dung lượng file (tối đa 50MB)
            if (file.Length > 50 * 1024 * 1024)
                throw new ArgumentException("Dung lượng file không được vượt quá 50MB.");

            // Tạo thư mục nếu chưa có
            var uploadsFolder = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "evidence");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            // Tạo tên file duy nhất
            var extension = Path.GetExtension(file.FileName);
            var uniqueFileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            // Lưu file vật lý
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // URL tương đối để lưu DB
            var fileUrl = $"/uploads/evidence/{uniqueFileName}";

            // Lưu vào bảng DocumentAttachment
            var attachment = new DocumentAttachment
            {
                DocType = docType,
                DocId = docId,
                AttachmentType = attachmentType,
                FileName = file.FileName,
                FileUrlOrPath = fileUrl,
                UploadedBy = userId,
                UploadedAt = DateTime.UtcNow
            };

            _context.DocumentAttachments.Add(attachment);

            try
            {
                await _context.SaveChangesAsync();

                await _auditLogService.LogAsync(
                    userId,
                    AuditAction.Create,
                    AuditEntity.DocumentAttachment,
                    docId,
                    $"Tải lên tệp đính kèm '{file.FileName}' cho {docType}"
                );
            }
            catch (Exception)
            {
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
                throw;
            }

            return fileUrl;
        }
    }
}
