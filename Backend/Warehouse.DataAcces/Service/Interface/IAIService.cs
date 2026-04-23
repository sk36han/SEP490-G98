using System.Collections.Generic;
using System.Threading.Tasks;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IAIService
    {
        /// <summary>
        /// Sử dụng AI để so khớp tên sản phẩm từ Excel với danh sách sản phẩm trong Database.
        /// </summary>
        /// <param name="excelItemName">Tên sản phẩm đọc được từ file Excel.</param>
        /// <param name="dbItems">Danh sách các sản phẩm đang có trong hệ thống (Id và Name).</param>
        /// <returns>Trả về ItemId khớp nhất hoặc null nếu không tìm thấy.</returns>
        Task<long?> MatchItemAsync(string excelItemName, List<KeyValuePair<long, string>> dbItems);

        /// <summary>
        /// Gửi một prompt tùy chỉnh tới AI.
        /// </summary>
        Task<string> GetAIResponseAsync(string prompt);
    }
}
