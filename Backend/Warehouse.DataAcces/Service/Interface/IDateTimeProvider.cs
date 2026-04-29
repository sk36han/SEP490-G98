using System;

namespace Warehouse.DataAcces.Service.Interface
{
    public interface IDateTimeProvider
    {
        DateTime UtcNow();
        DateTime BusinessNow();
        DateOnly BusinessToday();
        DateTime ToBusinessTime(DateTime utcDateTime);
        DateOnly ToBusinessDate(DateTime utcDateTime);
    }
}
