using Microsoft.Extensions.Configuration;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Warehouse.DataAcces.Service.Interface;

namespace Warehouse.DataAcces.Service
{
    public class GeminiService : IAIService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _modelId;

        public GeminiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _apiKey = configuration["GeminiSettings:ApiKey"] ?? "";
            _modelId = configuration["GeminiSettings:ModelId"] ?? "gemini-1.5-flash";
        }

        public async Task<long?> MatchItemAsync(string excelItemName, List<KeyValuePair<long, string>> dbItems)
        {
            if (string.IsNullOrWhiteSpace(excelItemName) || dbItems == null || dbItems.Count == 0)
                return null;

            // Xây dựng danh sách gợi ý cho AI
            var itemListBuilder = new StringBuilder();
            foreach (var item in dbItems)
            {
                itemListBuilder.AppendLine($"- ID: {item.Key}, Name: {item.Value}");
            }

            string prompt = $@"
Bạn là một trợ lý quản lý kho thông minh. 
Dưới đây là danh sách các sản phẩm đang có trong Database của tôi:
{itemListBuilder}

Hãy tìm sản phẩm khớp nhất với tên sau đây từ file Excel: '{excelItemName}'.
Lưu ý:
- Phải ưu tiên sự tương đồng về ngữ nghĩa (ví dụ: 'Milk' và 'Sữa', hoặc 'Vinamilk ít đường' và 'Vinamilk Low Sugar').
- Chỉ trả về duy nhất ID của sản phẩm dưới dạng số.
- Nếu không tìm thấy sản phẩm nào khớp trên 70%, hãy trả về chuỗi 'NULL'.
";

            var responseText = await GetAIResponseAsync(prompt);
            
            if (long.TryParse(responseText.Trim(), out long matchedId))
            {
                return matchedId;
            }

            return null;
        }

        public async Task<string> GetAIResponseAsync(string prompt)
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_modelId}:generateContent?key={_apiKey}";

            var requestBody = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = prompt } } }
                }
            };

            var response = await _httpClient.PostAsJsonAsync(url, requestBody);
            
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                throw new Exception($"Lỗi khi gọi Gemini API: {response.StatusCode} - {error}");
            }

            var jsonResponse = await response.Content.ReadFromJsonAsync<JsonElement>();
            
            try
            {
                // Truy cập vào cấu trúc: candidates[0].content.parts[0].text
                var text = jsonResponse.GetProperty("candidates")[0]
                                       .GetProperty("content")
                                       .GetProperty("parts")[0]
                                       .GetProperty("text")
                                       .GetString();
                
                return text ?? "";
            }
            catch (Exception ex)
            {
                throw new Exception("Lỗi khi phân tích phản hồi từ Gemini API.", ex);
            }
        }
    }
}
