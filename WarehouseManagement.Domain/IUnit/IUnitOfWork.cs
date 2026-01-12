using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using WarehouseManagement.Domain.IGenericRepository;

namespace WarehouseManagement.Domain.IUnitOfWork
{
    public interface IUnitOfWork
    {
        IGenericRepository<TEntity> GenericRepository<TEntity>() where TEntity : class;
        int SaveChanges();
        Task<int> SaveChangeAsync(CancellationToken cancellationToken = default);
        Task BeginTransactionAsync();
        Task CommitTransactionAsync();
        Task RollbackTransactionAsync();
    }
}
