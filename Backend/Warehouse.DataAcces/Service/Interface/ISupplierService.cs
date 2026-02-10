using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Warehouse.Entities.ModelResponse;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface ISupplierService
    {
        Task<List<SupplierResponse>> GetSupplierListAsync();
    }
}
