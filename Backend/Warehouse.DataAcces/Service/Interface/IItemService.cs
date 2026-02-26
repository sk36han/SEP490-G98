using System.Threading.Tasks;
using Warehouse.Entities.Models;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IItemService
    {
        Task<Item> UpdateItemStatusAsync(long itemId, bool isActive);
    }
}
